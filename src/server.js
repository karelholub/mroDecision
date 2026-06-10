import http from "node:http";
import { URL } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { requireScope, setAuthStore } from "./auth.js";
import { createAssistantGovernanceReport } from "./assistantGovernance.js";
import { createAssistantPlanWithProvider, testAssistantProviderConnection } from "./assistantProvider.js";
import { assistantProviderMetrics } from "./assistantProviderMetrics.js";
import { applyAssistantPlan, rollbackAssistantPlan } from "./assistantPlanner.js";
import { config } from "./config.js";
import { createClientResultCache } from "./clientCache.js";
import { createClientTrafficMetrics } from "./clientTrafficMetrics.js";
import { evaluateDecision, evaluateDecisionAsync } from "./evaluator.js";
import { notFound, readJson, sendBuffer, sendError, sendJson, sendText, serveStatic } from "./http.js";
import {
  buildClientEventCollectorPayload,
  buildDecisionCollectorEventPayload,
  buildDecisionFeedbackPayload,
  meiroCollectorEndpoint,
  meiroFeedbackEndpoint
} from "./meiroFeedback.js";
import { createProfileCache, profileCacheKey } from "./profileCache.js";
import { profileCacheWithDiagnostics } from "./profileDiagnostics.js";
import { createRateLimiter } from "./rateLimiter.js";
import { createRequestMetrics } from "./requestMetrics.js";
import { listStoreAdapters, loadStoreAdapter } from "./storeAdapter.js";
import {
  validateBundle,
  validateClientEventRequest,
  validateClientEvaluateRequest,
  validateClientSurfaceBatchRequest,
  validateClientSurfaceRequest,
  validateEvaluateRequest,
  validateRuleDefinition,
  validateRuleSetPayload
} from "./validation.js";

const store = await loadStoreAdapter();
const clientResultCache = createClientResultCache();
const meiroProfileCache = createProfileCache();
const clientRateLimiter = createRateLimiter({
  windowMs: config.clientRateLimitWindowMs,
  max: config.clientRateLimitMax
});
const requestMetrics = createRequestMetrics();
const clientTrafficMetrics = createClientTrafficMetrics();
const experimentEditorSessions = new Map();
const experimentPreviewSessions = new Map();
setAuthStore(store);
let schemaSyncTimer = null;
let schemaSyncNextRunAt = "";

const server = http.createServer(async (req, res) => {
  const startedAt = Date.now();
  res.requestId = req.headers["x-request-id"] || randomUUID();
  res.corsOrigin = corsOriginFor(req.headers.origin);
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/v1/")) {
      await routeApi(req, res, url);
      logRequest(req, res, startedAt);
      return;
    }
    if (await serveStatic(res, url.pathname)) {
      logRequest(req, res, startedAt);
      return;
    }
    notFound(res);
    logRequest(req, res, startedAt);
  } catch (error) {
    sendError(res, error);
    logRequest(req, res, startedAt, error);
  }
});
server.requestTimeout = config.requestTimeoutMs;
server.headersTimeout = config.headersTimeoutMs;
server.keepAliveTimeout = config.keepAliveTimeoutMs;
server.maxRequestsPerSocket = config.maxRequestsPerSocket;

server.listen(config.port, () => {
  console.log(`DEE listening on http://localhost:${config.port}`);
});
scheduleSchemaSync();

function maybeAwait(value) {
  return value && typeof value.then === "function" ? value : Promise.resolve(value);
}

async function saveStore() {
  if (typeof store.save !== "function") return;
  await maybeAwait(store.save());
}

async function storeCall(method, ...args) {
  if (typeof store[method] !== "function") {
    throw new Error(`Store adapter does not support ${method}`);
  }
  return maybeAwait(store[method](...args));
}

async function routeApi(req, res, url) {
  const { pathname } = url;

  if (req.method === "OPTIONS") {
    sendText(res, 204, "");
    return;
  }

  if (req.method === "GET" && pathname === "/v1/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "meiro-decision-engine",
      now: new Date().toISOString()
    });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/ready") {
    const database = await storeCall("health");
    sendJson(res, database.ok ? 200 : 503, {
      status: database.ok ? "ready" : "not_ready",
      service: "meiro-decision-engine",
      now: new Date().toISOString(),
      database
    });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/evaluate") {
    requireScope(req, "evaluate");
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateEvaluateRequest(body);
    const result = await evaluateRequest(body);
    await saveStore();
    queueDecisionFeedbackDelivery(result, body, {
      source: body.context?.request_source || "server_evaluate",
      request_id: res.requestId
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/v1/evaluate/batch") {
    requireScope(req, "evaluate");
    const body = await readJson(req, config.batchRequestBodyLimitBytes);
    const profiles = body.profiles || body.requests || [];
    if (!Array.isArray(profiles)) badRequest("profiles must be an array");
    if (profiles.length > 500) badRequest("Batch limit is 500 profiles");
    const results = [];
    for (const profile of profiles) {
      const request = {
        ...profile,
        decision_key: profile.decision_key || body.decision_key,
        rule_version: profile.rule_version ?? body.rule_version
      };
      validateEvaluateRequest(request);
      const result = await evaluateRequest(request);
      results.push(result);
      queueDecisionFeedbackDelivery(result, request, {
        source: request.context?.request_source || "server_evaluate_batch",
        request_id: res.requestId
      });
    }
    await saveStore();
    sendJson(res, 200, { results });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/client/evaluate") {
    requireScope(req, "client");
    enforceClientRateLimit(req, res, "evaluate");
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateClientEvaluateRequest(body);
    enforceClientTokenContext(req, body);
    enforceAllowedDecision(req, body.decision_key);
    const result = await evaluateClientRequest(body);
    await saveStore();
    queueDecisionFeedbackDelivery(result, body, {
      source: body.context?.request_source || "client_evaluate",
      request_id: res.requestId
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && pathname === "/v1/client/rule-catalog") {
    requireScope(req, "client");
    enforceClientTokenContext(req);
    sendJson(res, 200, { rule_sets: clientRuleCatalog(req.auth) });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/client/surface") {
    requireScope(req, "client");
    enforceClientRateLimit(req, res, "surface");
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateClientSurfaceRequest(body);
    enforceClientTokenContext(req, body);
    const result = await evaluateClientSurface(body, req.auth);
    await saveStore();
    queueSurfaceDecisionFeedbackDelivery(result, body, {
      source: body.context?.request_source || "client_surface",
      request_id: res.requestId
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/v1/client/surface/batch") {
    requireScope(req, "client");
    enforceClientRateLimit(req, res, "surface_batch");
    const body = await readJson(req, config.batchRequestBodyLimitBytes);
    validateClientSurfaceBatchRequest(body);
    enforceClientTokenContext(req, body);
    const result = await evaluateClientSurfaceBatch(req, body);
    await saveStore();
    for (const [index, item] of (result.results || []).entries()) {
      const profile = (body.profiles || [])[index] || {};
      queueSurfaceDecisionFeedbackDelivery(item, {
        ...profile,
        surface: body.surface,
        context: {
          ...(body.context || {}),
          ...(profile.context || {}),
          surface: body.surface,
          sync_id: body.context?.sync_id || profile.context?.sync_id || ""
        }
      }, {
        source: profile.context?.request_source || body.context?.request_source || "client_surface_batch",
        request_id: res.requestId
      });
    }
    sendJson(res, 200, result);
    return;
  }

  const clientEventMatch = pathname.match(/^\/v1\/client\/(impression|exposure|conversion)$/);
  if (clientEventMatch && req.method === "POST") {
    requireScope(req, "client");
    enforceClientRateLimit(req, res, clientEventMatch[1]);
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateClientEventRequest(body);
    enforceClientTokenContext(req, body);
    enforceAllowedDecision(req, body.decision_key);
    const event = await storeCall("addClientEvent", clientEventFromRequest(clientEventMatch[1], body, req));
    if (event.accepted) {
      await saveStore();
      clientResultCache.clear();
      if (isMeiroForwardableSurveyEvent(event)) {
        queueClientEventFeedbackDelivery(event, {
          source: body.context?.request_source || "client_event",
          request_id: res.requestId
        });
      }
    }
    sendJson(res, event.accepted ? 202 : 200, {
      event,
      accepted: event.accepted,
      duplicate: event.duplicate
    });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/rule-sets") {
    requireScope(req, "viewer");
    sendJson(res, 200, { rule_sets: await storeCall("listRuleSets") });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/assistant/plan") {
    requireScope(req, "editor");
    const body = await readJson(req, config.requestBodyLimitBytes);
    const planStartedAt = Date.now();
    const planRules = await storeCall("listRuleSets");
    const planSchemaItems = await storeCall("listSchemaItems");
    const planLookupTables = await storeCall("listLookupTables");
    const context = {
      ruleExists: (key) => planRules.some((rule) => rule.decision_key === key),
      schemaItems: planSchemaItems,
      lookupTables: planLookupTables,
      clientEventCounter: (params) => store.countClientEvents(params)
    };
    const plan = await createAssistantPlanWithProvider(body, context, await storeCall("getSettings"));
    validateAssistantPlan(plan);
    plan.governance = createAssistantGovernanceReport(plan, plan.provider);
    await storeCall("recordAssistantProviderPlanEvent", {
      request: body,
      plan,
      planned_by: req.auth.name,
      duration_ms: Date.now() - planStartedAt
    });
    await saveStore();
    sendJson(res, 200, { plan });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/assistant/apply") {
    requireScope(req, "editor");
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateAssistantPlan(body.plan);
    if (body.plan.mode !== "draft_only") badRequest("Only draft assistant plans can be applied");
    if (body.plan.guardrails?.errors?.length) badRequest("Assistant plan has blocking guardrail errors");
    const applied = applyAssistantPlan(body.plan, store, req.auth.name, {
      approved_action_ids: body.approved_action_ids
    });
    await saveStore();
    clientResultCache.clear();
    sendJson(res, 200, applied);
    return;
  }

  if (req.method === "POST" && pathname === "/v1/assistant/rollback") {
    requireScope(req, "editor");
    const body = await readJson(req, config.requestBodyLimitBytes);
    const result = rollbackAssistantPlan(body.rollback, store, req.auth.name);
    await saveStore();
    clientResultCache.clear();
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && pathname === "/v1/metrics") {
    requireScope(req, "viewer");
    sendJson(res, 200, {
      metrics: {
        ...await storeCall("getMetrics", { window_hours: url.searchParams.get("window_hours") }),
        client_cache: clientResultCache.metrics(),
        profile_cache: meiroProfileCache.metrics(),
        client_rate_limit: clientRateLimiter.metrics(),
        client_traffic: clientTrafficMetrics.metrics(),
        runtime_requests: requestMetrics.metrics(),
        assistant_provider: assistantProviderMetrics.metrics()
      }
    });
    return;
  }

  const ruleMetricsMatch = pathname.match(/^\/v1\/metrics\/rule\/([^/]+)$/);
  if (ruleMetricsMatch && req.method === "GET") {
    requireScope(req, "viewer");
    sendJson(res, 200, { metrics: store.getRuleMetrics(decodeURIComponent(ruleMetricsMatch[1])) });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/metrics/client-events") {
    requireScope(req, "viewer");
    sendJson(res, 200, { metrics: await storeCall("getClientEventMetrics", Object.fromEntries(url.searchParams)) });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/experiments") {
    requireScope(req, "viewer");
    const operations = await storeCall("getExperimentOperations");
    if (url.searchParams.get("format") === "csv") {
      sendText(res, 200, experimentOperationsToCsv(operations), "text/csv; charset=utf-8");
      return;
    }
    sendJson(res, 200, operations);
    return;
  }

  const experimentEditorSessionMatch = pathname.match(/^\/v1\/experiments\/([^/]+)\/editor-session$/);
  if (req.method === "POST" && experimentEditorSessionMatch) {
    requireScope(req, "editor");
    const key = decodeURIComponent(experimentEditorSessionMatch[1]);
    const body = await readJson(req, config.requestBodyLimitBytes);
    const ruleSet = await storeCall("getRuleSet", key);
    if (!ruleSet || ruleSet.type !== "experiment") {
      sendJson(res, 404, { error: "not_found", message: `Experiment not found: ${key}` });
      return;
    }
    sendJson(res, 200, createExperimentEditorSession(ruleSet, body));
    return;
  }

  const experimentPreviewLinkMatch = pathname.match(/^\/v1\/experiments\/([^/]+)\/preview-link$/);
  if (req.method === "POST" && experimentPreviewLinkMatch) {
    requireScope(req, "editor");
    const key = decodeURIComponent(experimentPreviewLinkMatch[1]);
    const body = await readJson(req, config.requestBodyLimitBytes);
    const ruleSet = await storeCall("getRuleSet", key);
    if (!ruleSet || ruleSet.type !== "experiment") {
      sendJson(res, 404, { error: "not_found", message: `Experiment not found: ${key}` });
      return;
    }
    sendJson(res, 200, createExperimentPreviewLink(ruleSet, body));
    return;
  }

  const experimentPreviewTokenMatch = pathname.match(/^\/v1\/preview\/([^/]+)$/);
  if (req.method === "GET" && experimentPreviewTokenMatch) {
    sendJson(res, 200, requireExperimentPreviewSession(decodeURIComponent(experimentPreviewTokenMatch[1])));
    return;
  }

  const experimentEditorDraftMatch = pathname.match(/^\/v1\/experiments\/([^/]+)\/editor-draft$/);
  if (req.method === "POST" && experimentEditorDraftMatch) {
    const key = decodeURIComponent(experimentEditorDraftMatch[1]);
    const body = await readJson(req, config.requestBodyLimitBytes);
    const result = await saveExperimentEditorDraft(key, body);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && pathname === "/v1/change-log") {
    requireScope(req, "viewer");
    sendJson(res, 200, { changes: store.listChangeLog(Object.fromEntries(url.searchParams)) });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/campaigns") {
    requireScope(req, "viewer");
    sendJson(res, 200, { campaigns: await storeCall("listCampaignOperations", Object.fromEntries(url.searchParams)) });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/rule-conflicts") {
    requireScope(req, "viewer");
    sendJson(res, 200, await storeCall("listRuleConflicts", Object.fromEntries(url.searchParams)));
    return;
  }

  if (req.method === "POST" && pathname === "/v1/campaigns/actions") {
    requireScope(req, "editor");
    const result = await applyCampaignAction(await readJson(req, config.requestBodyLimitBytes), req.auth.name);
    await saveStore();
    clientResultCache.clear();
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/v1/campaign-assets/move") {
    requireScope(req, "editor");
    const result = await moveCampaignAssets(await readJson(req, config.requestBodyLimitBytes), req.auth.name);
    if (!result.dry_run) {
      await saveStore();
      clientResultCache.clear();
    }
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/v1/rule-sets") {
    requireScope(req, "editor");
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateRuleSetPayload(body);
    validateRuleDefinition(body.draft || body.definition || {}, body.input_schema || {});
    const ruleSet = await storeCall("createRuleSet", body, req.auth.name);
    await saveStore();
    clientResultCache.clear();
    sendJson(res, 201, { rule_set: publicRuleSet(ruleSet) });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/export") {
    requireScope(req, "viewer");
    sendJson(res, 200, store.exportBundle({ includeAudit: url.searchParams.get("include_audit") === "true" }));
    return;
  }

  if (req.method === "POST" && pathname === "/v1/import") {
    requireScope(req, "editor");
    const body = await readJson(req, config.batchRequestBodyLimitBytes);
    validateBundle(body);
    const imported = store.importBundle(body, req.auth.name);
    await saveStore();
    clientResultCache.clear();
    sendJson(res, 200, { imported });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/tokens") {
    requireScope(req, "admin");
    sendJson(res, 200, { tokens: store.listApiTokens() });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/tokens") {
    requireScope(req, "admin");
    const body = await readJson(req, config.requestBodyLimitBytes);
    const token = store.createApiToken(body, req.auth.name);
    await saveStore();
    sendJson(res, 201, { token });
    return;
  }

  const tokenMatch = pathname.match(/^\/v1\/tokens\/([^/]+)$/);
  if (tokenMatch && req.method === "DELETE") {
    requireScope(req, "admin");
    const token = store.revokeApiToken(decodeURIComponent(tokenMatch[1]), req.auth.name);
    await saveStore();
    sendJson(res, 200, { token });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/settings") {
    requireScope(req, "viewer");
    const settings = await storeCall("getSettings");
    sendJson(res, 200, {
      settings: publicSettings(settings),
      runtime: {
        direct_url: `http://localhost:${config.port}`,
        docker_url: "http://localhost:8090",
        db_path: config.dbPath,
        store_adapter: await storeCall("health"),
        store_adapters: listStoreAdapters(),
        client_rate_limit: clientRateLimiter.metrics(),
        client_traffic: clientTrafficMetrics.metrics(),
        runtime_requests: requestMetrics.metrics(),
        schema_sync: schemaSyncRuntime(),
        profile_cache: meiroProfileCache.metrics(),
        assistant_provider: assistantProviderMetrics.metrics(),
        assistant_provider_config_events: store.listAssistantProviderConfigEvents({ limit: 8 }),
        assistant_provider_plan_events: store.listAssistantProviderPlanEvents({ limit: 8 }),
        meiro_deliveries: store.listMeiroDeliveries({ limit: 10 })
      }
    });
    return;
  }

  if (req.method === "PUT" && pathname === "/v1/settings") {
    requireScope(req, "admin");
    const settings = await storeCall("updateSettings", await readJson(req, config.requestBodyLimitBytes), req.auth.name);
    await saveStore();
    scheduleSchemaSync();
    sendJson(res, 200, {
      settings: publicSettings(settings),
      runtime: {
        schema_sync: schemaSyncRuntime(),
        assistant_provider: assistantProviderMetrics.metrics(),
        assistant_provider_config_events: store.listAssistantProviderConfigEvents({ limit: 8 }),
        assistant_provider_plan_events: store.listAssistantProviderPlanEvents({ limit: 8 })
      }
    });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/settings/test-connection") {
    requireScope(req, "admin");
    const result = await testSettingsConnection(await readJson(req, config.requestBodyLimitBytes));
    await saveStore();
    sendJson(res, 200, result);
    return;
  }

  const ruleSetMatch = pathname.match(/^\/v1\/rule-sets\/([^/]+)(?:\/(.*))?$/);
  if (ruleSetMatch) {
    await routeRuleSet(req, res, decodeURIComponent(ruleSetMatch[1]), ruleSetMatch[2] || "");
    return;
  }

  if (req.method === "GET" && pathname === "/v1/audit") {
    requireScope(req, "viewer");
    const audit = await storeCall("queryAudit", Object.fromEntries(url.searchParams));
    if (url.searchParams.get("format") === "csv") {
      sendText(res, 200, auditToCsv(audit), "text/csv; charset=utf-8");
      return;
    }
    sendJson(res, 200, { audit });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/lookup-tables") {
    requireScope(req, "viewer");
    sendJson(res, 200, { lookup_tables: await storeCall("listLookupTables") });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/messages") {
    requireScope(req, "viewer");
    sendJson(res, 200, { messages: await storeCall("listMessages", Object.fromEntries(url.searchParams)) });
    return;
  }

  const messageAssetContentMatch = pathname.match(/^\/v1\/message-assets\/([^/]+)\/content$/);
  if (messageAssetContentMatch && req.method === "GET") {
    const asset = await storeCall("getMessageAsset", decodeURIComponent(messageAssetContentMatch[1]), true);
    sendBuffer(res, 200, Buffer.from(asset.content_base64, "base64"), asset.content_type);
    return;
  }

  if (req.method === "GET" && pathname === "/v1/message-assets") {
    requireScope(req, "viewer");
    sendJson(res, 200, { assets: await storeCall("listMessageAssets") });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/message-assets") {
    requireScope(req, "editor");
    const asset = await storeCall("createMessageAsset", await readJson(req, config.batchRequestBodyLimitBytes), req.auth.name);
    await saveStore();
    sendJson(res, 201, { asset });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/message-assets/cleanup") {
    requireScope(req, "editor");
    const result = await storeCall("cleanupMessageAssets");
    await saveStore();
    sendJson(res, 200, result);
    return;
  }

  const messageAssetMatch = pathname.match(/^\/v1\/message-assets\/([^/]+)$/);
  if (messageAssetMatch && req.method === "DELETE") {
    requireScope(req, "editor");
    const result = await storeCall("deleteMessageAsset", decodeURIComponent(messageAssetMatch[1]), {
      force: url.searchParams.get("force") === "true"
    });
    await saveStore();
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && pathname === "/v1/evaluation-profiles") {
    requireScope(req, "viewer");
    sendJson(res, 200, { profiles: store.listEvaluationProfiles(Object.fromEntries(url.searchParams)) });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/condition-blocks") {
    requireScope(req, "viewer");
    sendJson(res, 200, { condition_blocks: store.listConditionBlocks() });
    return;
  }

  const evaluationProfileMatch = pathname.match(/^\/v1\/evaluation-profiles\/([^/]+)$/);
  if (evaluationProfileMatch && req.method === "PUT") {
    requireScope(req, "editor");
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateEvaluateRequest(body.request || {});
    const profile = store.upsertEvaluationProfile(decodeURIComponent(evaluationProfileMatch[1]), body, req.auth.name);
    await saveStore();
    sendJson(res, 200, { profile });
    return;
  }

  if (evaluationProfileMatch && req.method === "DELETE") {
    requireScope(req, "editor");
    store.deleteEvaluationProfile(decodeURIComponent(evaluationProfileMatch[1]));
    await saveStore();
    sendJson(res, 200, { deleted: true });
    return;
  }

  const conditionBlockMatch = pathname.match(/^\/v1\/condition-blocks\/([^/]+)$/);
  if (conditionBlockMatch && req.method === "PUT") {
    requireScope(req, "editor");
    const block = store.upsertConditionBlock(decodeURIComponent(conditionBlockMatch[1]), await readJson(req, config.requestBodyLimitBytes), req.auth.name);
    await saveStore();
    sendJson(res, 200, { condition_block: block });
    return;
  }

  if (conditionBlockMatch && req.method === "DELETE") {
    requireScope(req, "editor");
    store.deleteConditionBlock(decodeURIComponent(conditionBlockMatch[1]));
    await saveStore();
    sendJson(res, 200, { deleted: true });
    return;
  }

  const messageVersionsMatch = pathname.match(/^\/v1\/messages\/([^/]+)\/versions$/);
  if (messageVersionsMatch && req.method === "GET") {
    requireScope(req, "viewer");
    sendJson(res, 200, { versions: await storeCall("listMessageVersions", decodeURIComponent(messageVersionsMatch[1])) });
    return;
  }

  const messageVersionMatch = pathname.match(/^\/v1\/messages\/([^/]+)\/versions\/(\d+)$/);
  if (messageVersionMatch && req.method === "GET") {
    requireScope(req, "viewer");
    sendJson(res, 200, {
      message: await storeCall("getMessageVersion", decodeURIComponent(messageVersionMatch[1]), Number(messageVersionMatch[2]))
    });
    return;
  }

  const messageVersionDiffMatch = pathname.match(/^\/v1\/messages\/([^/]+)\/versions\/(\d+)\/diff$/);
  if (messageVersionDiffMatch && req.method === "GET") {
    requireScope(req, "viewer");
    const id = decodeURIComponent(messageVersionDiffMatch[1]);
    const left = await storeCall("getMessageVersion", id, Number(messageVersionDiffMatch[2]));
    const compareTo = url.searchParams.get("compare_to") || "current";
    const right = compareTo === "current" ? await storeCall("getMessage", id) : await storeCall("getMessageVersion", id, Number(compareTo));
    if (!right) notFoundError(`Message not found: ${id}`);
    sendJson(res, 200, {
      left: messageDiffRef(left),
      right: compareTo === "current" ? { version: "current", updated_at: right.updated_at, author: right.author } : messageDiffRef(right),
      diff: diffValues(messageDiffPayload(left), messageDiffPayload(right))
    });
    return;
  }

  const messageMatch = pathname.match(/^\/v1\/messages\/([^/]+)$/);
  if (messageMatch && req.method === "PUT") {
    requireScope(req, "editor");
    const message = await storeCall("upsertMessage", decodeURIComponent(messageMatch[1]), await readJson(req, config.requestBodyLimitBytes), req.auth.name);
    await saveStore();
    clientResultCache.clear();
    sendJson(res, 200, { message });
    return;
  }

  const lookupExportMatch = pathname.match(/^\/v1\/lookup-tables\/([^/]+)\/export$/);
  if (lookupExportMatch && req.method === "GET") {
    requireScope(req, "viewer");
    const table = (await storeCall("listLookupTables")).find((item) => item.id === decodeURIComponent(lookupExportMatch[1]));
    if (!table) notFoundError(`Lookup table not found: ${decodeURIComponent(lookupExportMatch[1])}`);
    sendText(res, 200, lookupTableToCsv(table), "text/csv; charset=utf-8");
    return;
  }

  const lookupVersionsMatch = pathname.match(/^\/v1\/lookup-tables\/([^/]+)\/versions$/);
  if (lookupVersionsMatch && req.method === "GET") {
    requireScope(req, "viewer");
    sendJson(res, 200, { versions: await storeCall("listLookupTableVersions", decodeURIComponent(lookupVersionsMatch[1])) });
    return;
  }

  const lookupVersionMatch = pathname.match(/^\/v1\/lookup-tables\/([^/]+)\/versions\/(\d+)$/);
  if (lookupVersionMatch && req.method === "GET") {
    requireScope(req, "viewer");
    sendJson(res, 200, {
      lookup_table: await storeCall("getLookupTableVersion", decodeURIComponent(lookupVersionMatch[1]), Number(lookupVersionMatch[2]))
    });
    return;
  }

  const lookupMatch = pathname.match(/^\/v1\/lookup-tables\/([^/]+)$/);
  if (lookupMatch && req.method === "PUT") {
    requireScope(req, "editor");
    const table = await storeCall("replaceLookupTable", decodeURIComponent(lookupMatch[1]), await readJson(req, config.requestBodyLimitBytes), req.auth.name);
    await saveStore();
    clientResultCache.clear();
    sendJson(res, 200, { lookup_table: table });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/schema") {
    requireScope(req, "viewer");
    sendJson(res, 200, { schema: await storeCall("listSchemaItems", Object.fromEntries(url.searchParams)) });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/meiro-deliveries") {
    requireScope(req, "viewer");
    const params = Object.fromEntries(url.searchParams);
    sendJson(res, 200, {
      deliveries: store.listMeiroDeliveries(params),
      summary: store.getMeiroDeliverySummary(params)
    });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/schema/import") {
    requireScope(req, "admin");
    const body = await readJson(req, config.batchRequestBodyLimitBytes);
    const diagnosed = diagnoseSchemaImport(body);
    const imported = {
      attributes: diagnosed.replace.attributes ? store.replaceSchemaItems("attribute", diagnosed.valid.attributes, req.auth.name) : [],
      segments: diagnosed.replace.segments ? store.replaceSchemaItems("segment", diagnosed.valid.segments, req.auth.name) : [],
      context: diagnosed.replace.context ? store.replaceSchemaItems("context", diagnosed.valid.context, req.auth.name) : []
    };
    await saveStore();
    sendJson(res, 200, { imported, diagnostics: diagnosed.diagnostics });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/schema/sync") {
    requireScope(req, "admin");
    const body = await readJson(req, config.requestBodyLimitBytes);
    try {
      const synced = await syncSchemaFromMeiroProfile(body, req.auth.name);
      recordSchemaSyncSuccess(synced, req.auth.name);
      await saveStore();
      sendJson(res, 200, synced);
    } catch (error) {
      recordSchemaSyncError(error, req.auth.name);
      await saveStore();
      throw error;
    }
    return;
  }

  if (req.method === "POST" && pathname === "/v1/meiro/metadata/sync") {
    requireScope(req, "admin");
    const body = await readJson(req, config.requestBodyLimitBytes);
    try {
      const synced = await syncMeiroMetadata(body, req.auth.name);
      recordSchemaSyncSuccess(synced, req.auth.name);
      await saveStore();
      sendJson(res, 200, synced);
    } catch (error) {
      recordSchemaSyncError(error, req.auth.name);
      await saveStore();
      throw error;
    }
    return;
  }

  notFound(res);
}

async function syncSchemaFromMeiroProfile(input, author) {
  const settings = store.getSettings();
  const endpoint = String(input.meiro_api_url || settings.meiro_api_url || "").trim();
  const token = String(input.meiro_api_token || settings.meiro_api_token || "").trim();
  const identifierType = String(input.identifier_type || settings.schema_sync_identifier_type || "").trim();
  const identifierValue = String(input.identifier_value || settings.schema_sync_identifier_value || "").trim();
  if (!endpoint) badRequest("meiro_api_url is required");
  if (!token) badRequest("meiro_api_token is required");
  if (!identifierType || !identifierValue) badRequest("identifier_type and identifier_value are required");

  const profile = await fetchMeiroProfile(endpoint, token, { type: identifierType, value: identifierValue });

  const inferred = inferSchemaFromProfile(profile);
  const diagnosed = diagnoseSchemaImport({
    attributes: inferred.attributes,
    segments: inferred.segments,
    context: inferred.context
  });
  return {
    source: profileEndpointBase(endpoint),
    imported: {
      attributes: store.replaceSchemaItems("attribute", diagnosed.valid.attributes, author),
      segments: store.replaceSchemaItems("segment", diagnosed.valid.segments, author),
      context: store.replaceSchemaItems("context", diagnosed.valid.context, author)
    },
    diagnostics: diagnosed.diagnostics,
    profile_shape: Object.keys(profile)
  };
}

async function testSettingsConnection(input = {}) {
  const target = String(input.target || "").trim();
  if (target === "profile") return testMeiroProfileConnection(input);
  if (target === "collector") return testMeiroCollectorConnection(input);
  if (target === "feedback") return testMeiroFeedbackConnection(input);
  if (target === "assistant_llm") return testAssistantProviderConnection(input, await storeCall("getSettings"));
  badRequest("target must be profile, collector, feedback, or assistant_llm");
}

async function syncMeiroMetadata(input = {}, author) {
  const settings = store.getSettings();
  const skillUrl = String(input.meiro_skill_url || settings.meiro_skill_url || "").trim();
  const cliBase = String(input.meiro_cli_url || settings.meiro_cli_url || settings.meiro_url || "").trim();
  const cliToken = String(input.meiro_cli_token || settings.meiro_cli_token || "").trim();
  const diagnostics = {
    summary: { imported: 0, skipped: 0, failed: 0 },
    skill: null,
    shared_api: [],
    profile_api: null
  };
  let imported = { attributes: [], segments: [], context: [] };
  const metadata = {};

  if (skillUrl) diagnostics.skill = await inspectMeiroSkill(skillUrl);

  if (cliBase && cliToken) {
    const shared = await fetchMeiroSharedMetadata(cliBase, cliToken);
    diagnostics.shared_api = shared.diagnostics;
    metadata.identifier_types = shared.identifier_types;
    metadata.audiences = shared.audiences;
    metadata.catalogs = shared.catalogs;
    metadata.event_types = shared.event_types;
    if (shared.schema.attributes.length || shared.schema.segments.length || shared.schema.context.length) {
      const diagnosed = diagnoseSchemaImport(shared.schema);
      imported = {
        attributes: diagnosed.replace.attributes ? store.replaceSchemaItems("attribute", diagnosed.valid.attributes, author) : [],
        segments: diagnosed.replace.segments ? store.replaceSchemaItems("segment", diagnosed.valid.segments, author) : [],
        context: diagnosed.replace.context ? store.replaceSchemaItems("context", diagnosed.valid.context, author) : []
      };
      mergeSchemaDiagnostics(diagnostics.summary, diagnosed.diagnostics.summary);
    }
  }

  if (!imported.attributes.length && profileSchemaSyncInputsConfigured(input, settings)) {
    try {
      const profileSynced = await syncSchemaFromMeiroProfile(input, author);
      imported = profileSynced.imported;
      diagnostics.profile_api = {
        ok: true,
        source: profileSynced.source,
        profile_shape: profileSynced.profile_shape,
        diagnostics: profileSynced.diagnostics
      };
      mergeSchemaDiagnostics(diagnostics.summary, profileSynced.diagnostics.summary);
    } catch (error) {
      diagnostics.profile_api = {
        ok: false,
        token_type: "Profile API token",
        message: profileApiDiagnosticMessage(error)
      };
      diagnostics.summary.failed += 1;
    }
  }

  if (!imported.attributes.length && !imported.segments.length && !imported.context.length) {
    const sharedFailures = diagnostics.shared_api.filter((item) => !item.ok).map((item) => `${item.path}: ${item.message}`).join("; ");
    badRequest(sharedFailures || diagnostics.profile_api?.message || "No Meiro metadata could be imported");
  }

  return {
    source: cliBase || settings.meiro_api_url || "",
    imported,
    metadata,
    diagnostics
  };
}

async function inspectMeiroSkill(skillUrl) {
  try {
    const response = await fetchWithTimeout(skillUrl, { headers: { accept: "text/markdown,text/plain,*/*" } });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      url: skillUrl,
      name: text.match(/^name:\s*(.+)$/m)?.[1]?.trim() || "",
      mpcli: text.includes("mpcli"),
      references: [...text.matchAll(/\[references\/([^\]]+\.md)\]/g)].map((match) => match[1]).slice(0, 30)
    };
  } catch (error) {
    return { ok: false, status: 0, url: skillUrl, message: error.message };
  }
}

async function fetchMeiroSharedMetadata(base, token) {
  const endpoints = [
    ["attributes", "/api/attributes"],
    ["audiences", "/api/audiences"],
    ["identifier_types", "/api/identifier-types"],
    ["catalogs", "/api/catalogs"],
    ["event_types", "/api/event-types"]
  ];
  const results = await Promise.all(endpoints.map(async ([name, path]) => {
    const result = await fetchMeiroApi(base, token, path);
    return { name, path, ...result };
  }));
  const byName = Object.fromEntries(results.map((item) => [item.name, item]));
  const attributes = normalizeMeiroAttributes(extractMeiroList(byName.attributes?.body), "meiro_shared_api");
  const audiences = normalizeMeiroAudiences(extractMeiroList(byName.audiences?.body));
  const identifierTypes = normalizeMeiroIdentifierTypes(extractMeiroList(byName.identifier_types?.body));
  const catalogs = normalizeMeiroCatalogs(extractMeiroList(byName.catalogs?.body));
  const eventTypes = normalizeMeiroEventTypes(extractMeiroList(byName.event_types?.body));
  return {
    diagnostics: results.map((item) => ({
      path: item.path,
      ok: item.ok,
      status: item.status,
      token_type: "Meiro CLI/shared API token",
      count: Array.isArray(extractMeiroList(item.body)) ? extractMeiroList(item.body).length : 0,
      message: sharedApiDiagnosticMessage(item)
    })),
    schema: {
      attributes,
      segments: audiences.map((audience) => ({
        name: audience.id || audience.key || audience.name,
        type: "boolean",
        dimension: audience.type || "audience",
        source: "meiro_shared_api",
        raw: audience
      })).filter((item) => item.name),
      context: [
        ...identifierTypes.map((item) => ({ name: `identifier.${item.id || item.name}`, type: "string", dimension: item.name || "identifier", source: "meiro_shared_api", raw: item })),
        ...eventTypes.map((item) => ({ name: `event.${item.id || item.name}`, type: "object", dimension: item.name || "event", source: "meiro_shared_api", raw: item }))
      ].filter((item) => item.name)
    },
    audiences,
    identifier_types: identifierTypes,
    catalogs,
    event_types: eventTypes
  };
}

function sharedApiDiagnosticMessage(result = {}) {
  if (result.ok) return result.message || "ok";
  if (result.status === 401 || result.status === 403) {
    return "Shared API rejected the Meiro CLI/shared API token. Paste the separate mpat token, not the Profile API token.";
  }
  return result.message || `returned ${result.status || 0}`;
}

async function fetchMeiroApi(base, token, path) {
  const url = new URL(path, base.endsWith("/") ? base : `${base}/`);
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        authorization: `Bearer ${token}`,
        "x-api-token": token,
        accept: "application/json"
      }
    });
    const text = await response.text();
    let body = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw_preview: text.slice(0, 300) };
    }
    return {
      ok: response.ok,
      status: response.status,
      body,
      message: response.ok ? "ok" : body.message || body.error || `returned ${response.status}`
    };
  } catch (error) {
    return { ok: false, status: 0, body: {}, message: error.message };
  }
}

function extractMeiroList(body) {
  if (Array.isArray(body)) return body;
  for (const key of ["data", "items", "attributes", "audiences", "identifier_types", "identifierTypes", "catalogs", "event_types", "eventTypes", "results"]) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  return [];
}

function normalizeMeiroAttributes(items, source) {
  return items.flatMap((item) => {
    const name = item.id || item.key || item.slug || item.name;
    const dimensions = Array.isArray(item.dimensions) && item.dimensions.length ? item.dimensions : [{ name: item.dimension || "value", type: item.type || item.value_type }];
    if (!name) return [];
    return dimensions.map((dimension) => ({
      name,
      type: dimension.type || item.type || "string",
      dimension: dimension.name || "value",
      source,
      raw: item
    }));
  });
}

function normalizeMeiroAudiences(items) {
  return items.map((item) => ({
    id: item.id || item.audienceId || item.key || item.slug || item.name,
    name: item.name || item.label || item.id,
    type: item.type || item.audience_type || item.mode || "",
    status: item.status || ""
  })).filter((item) => item.id || item.name);
}

function normalizeMeiroIdentifierTypes(items) {
  return items.map((item) => ({
    id: item.id || item.identifierTypeId || item.key || item.slug || item.name,
    name: item.name || item.label || item.id,
    type: item.type || item.value_type || "string"
  })).filter((item) => item.id || item.name);
}

function normalizeMeiroCatalogs(items) {
  return items.map((item) => ({
    id: item.id || item.catalogId || item.key || item.slug || item.name,
    name: item.name || item.label || item.id,
    primary_key: item.primaryKeyField || item.primary_key || item.primaryKey || "",
    fields: Array.isArray(item.fields) ? item.fields.map((field) => field.key || field.name || field.id).filter(Boolean) : []
  })).filter((item) => item.id || item.name);
}

function normalizeMeiroEventTypes(items) {
  return items.map((item) => ({
    id: item.id || item.eventTypeId || item.key || item.slug || item.name,
    name: item.name || item.label || item.id,
    source: item.source || item.source_id || ""
  })).filter((item) => item.id || item.name);
}

function mergeSchemaDiagnostics(target, source = {}) {
  target.imported += Number(source.imported || 0);
  target.skipped += Number(source.skipped || 0);
  target.failed += Number(source.failed || 0);
}

async function testMeiroProfileConnection(input = {}) {
  const settings = store.getSettings();
  const endpoint = String(input.meiro_api_url || settings.meiro_api_url || "").trim();
  const token = String(input.meiro_api_token || settings.meiro_api_token || "").trim();
  const identifierType = String(input.identifier_type || settings.schema_sync_identifier_type || "").trim();
  const identifierValue = String(input.identifier_value || settings.schema_sync_identifier_value || "").trim();
  if (!endpoint) badRequest("meiro_api_url is required");
  if (!token) badRequest("meiro_api_token is required");
  if (!identifierType || !identifierValue) badRequest("identifier_type and identifier_value are required");

  const startedAt = Date.now();
  let text = "";
  try {
    const url = meiroProfileUrl(endpoint, { type: identifierType, value: identifierValue });
    const response = await fetchWithTimeout(url, {
      headers: {
        "x-api-token": token,
        authorization: `Bearer ${token}`,
        accept: "application/json"
      }
    });
    text = await response.text();
    let parsed = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw_preview: text.slice(0, 300) };
    }
    const result = {
      target: "profile",
      ok: response.ok,
      status: response.status,
      endpoint: profileEndpointBase(endpoint),
      token_type: "Profile API token",
      profile_keys: Object.keys(parsed || {}).slice(0, 20),
      message: response.ok ? "Profile API reached" : profileApiDiagnosticMessage({ message: parsed.message || parsed.error, statusCode: response.status })
    };
    await recordMeiroDeliverySafe({
      ...result,
      duration_ms: Date.now() - startedAt,
      response_preview: text.slice(0, 500),
      payload: { identifier_type: identifierType, identifier_value: identifierValue }
    });
    return result;
  } catch (error) {
    const result = {
      target: "profile",
      ok: false,
      status: 0,
      endpoint: profileEndpointBase(endpoint),
      token_type: "Profile API token",
      profile_keys: [],
      message: profileApiDiagnosticMessage(error)
    };
    await recordMeiroDeliverySafe({ ...result, duration_ms: Date.now() - startedAt, error: error.message });
    return result;
  }
}

async function testMeiroCollectorConnection(input = {}) {
  const settings = store.getSettings();
  const endpoint = meiroCollectorEndpoint({
    ...settings,
    meiro_url: input.meiro_url || settings.meiro_url,
    meiro_source_slug: input.meiro_source_slug || settings.meiro_source_slug
  });
  if (!String(input.meiro_url || settings.meiro_url || "").trim()) badRequest("meiro_url is required");
  if (!String(input.meiro_source_slug || settings.meiro_source_slug || "").trim()) badRequest("meiro_source_slug is required");
  const decision = {
    decision_key: "connection_test",
    profile_key: "dee-settings-test",
    result: "test",
    outputs: { source: "dee_settings" },
    matched_rules: [],
    errors: [],
    evaluated_at: createdAtIso()
  };
  const payload = buildDecisionCollectorEventPayload(decision, { identifiers: [], context: { request_source: "dee_settings" } }, { source: "settings_test", endpoint });
  return deliverMeiroPayload("collector", endpoint, payload);
}

async function testMeiroFeedbackConnection(input = {}) {
  const settings = store.getSettings();
  const endpoint = String(input.meiro_feedback_url || settings.meiro_feedback_url || "").trim();
  if (!endpoint) badRequest("meiro_feedback_url is required");
  const payload = {
    decision_key: "feedback_connection_test",
    profile_key: "dee-settings-test",
    result: "test",
    outputs: { source: "dee_settings", purpose: "feedback_delivery_test" },
    matched_rules: [],
    errors: [],
    evaluated_at: createdAtIso()
  };
  return deliverMeiroPayload("feedback", endpoint, payload);
}

async function deliverMeiroPayload(target, endpoint, payload, description = "test payload") {
  const startedAt = Date.now();
  let text = "";
  try {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    text = await response.text();
    const result = {
      target,
      ok: response.ok,
      status: response.status,
      endpoint,
      message: response.ok ? `${target} accepted ${description}` : text.slice(0, 300) || `${target} returned an error`
    };
    await recordMeiroDeliverySafe({
      ...result,
      duration_ms: Date.now() - startedAt,
      response_preview: text.slice(0, 500),
      payload
    });
    return result;
  } catch (error) {
    const result = {
      target,
      ok: false,
      status: 0,
      endpoint,
      message: error.message
    };
    await recordMeiroDeliverySafe({
      ...result,
      duration_ms: Date.now() - startedAt,
      error: error.message,
      response_preview: text.slice(0, 500),
      payload
    });
    return result;
  }
}

async function recordMeiroDeliverySafe(input) {
  if (typeof store.recordMeiroDelivery !== "function") return null;
  return maybeAwait(store.recordMeiroDelivery(input));
}

function queueDecisionFeedbackDelivery(decision, request, options = {}) {
  setImmediate(() => {
    deliverDecisionFeedback(decision, request, options).catch((error) => {
      console.warn(`Meiro feedback delivery failed: ${error.message}`);
    });
  });
}

function queueSurfaceDecisionFeedbackDelivery(surfaceResult, request, options = {}) {
  if (!surfaceResult?.selected) return;
  queueDecisionFeedbackDelivery(surfaceResult.selected, {
    ...request,
    decision_key: surfaceResult.selected.decision_key,
    profile_key: surfaceResult.profile_key || request.profile_key,
    context: {
      ...(request.context || {}),
      surface: surfaceResult.surface || request.surface || request.context?.surface || ""
    }
  }, {
    ...options,
    surface: surfaceResult.surface || request.surface || request.context?.surface || "",
    surface_result: {
      surface: surfaceResult.surface || request.surface || "",
      selected_decision_key: surfaceResult.selected.decision_key,
      candidate_count: Array.isArray(surfaceResult.candidates) ? surfaceResult.candidates.length : 0,
      candidates: Array.isArray(surfaceResult.candidates) ? surfaceResult.candidates : []
    }
  });
}

function queueClientEventFeedbackDelivery(event, options = {}) {
  setImmediate(() => {
    deliverClientEventFeedback(event, options).catch((error) => {
      console.warn(`Meiro client event delivery failed: ${error.message}`);
    });
  });
}

async function deliverDecisionFeedback(decision, request, options = {}) {
  const settings = await storeCall("getSettings");
  const feedbackEndpoint = meiroFeedbackEndpoint(settings);
  const collectorEndpoint = meiroCollectorEndpoint(settings);
  const results = [];
  if (feedbackEndpoint) {
    const payload = buildDecisionFeedbackPayload(decision, request, { ...options, endpoint: feedbackEndpoint });
    results.push(await deliverMeiroPayload("feedback", feedbackEndpoint, payload, "decision payload"));
  }
  if (collectorEndpoint) {
    const payload = buildDecisionCollectorEventPayload(decision, request, { ...options, endpoint: collectorEndpoint });
    results.push(await deliverMeiroPayload("collector", collectorEndpoint, payload, "decision event"));
  }
  await saveStore();
  return results;
}

async function deliverClientEventFeedback(event, options = {}) {
  const settings = await storeCall("getSettings");
  const collectorEndpoint = meiroCollectorEndpoint(settings);
  const fallbackEndpoint = meiroFeedbackEndpoint(settings);
  const endpoint = collectorEndpoint || fallbackEndpoint;
  if (!endpoint) return [];
  const target = collectorEndpoint ? "collector" : "feedback";
  const payload = buildClientEventCollectorPayload(event, {
    ...options,
    endpoint,
    event_type: "inapp_survey_response"
  });
  const result = await deliverMeiroPayload(target, endpoint, payload, "client survey event");
  await saveStore();
  return [result];
}

function isMeiroForwardableSurveyEvent(event = {}) {
  const details = event.event || {};
  return event.event_type === "conversion" &&
    (details.type === "survey_response" || Boolean(details.survey_question) || Object.prototype.hasOwnProperty.call(details, "survey_value"));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function scheduleSchemaSync() {
  if (schemaSyncTimer) {
    clearTimeout(schemaSyncTimer);
    schemaSyncTimer = null;
  }
  const settings = store.getSettings();
  if (!schemaSyncConfigured(settings)) {
    schemaSyncNextRunAt = "";
    return;
  }
  const intervalMs = Math.max(1, Number(settings.schema_sync_interval_minutes || 15)) * 60 * 1000;
  schemaSyncNextRunAt = new Date(Date.now() + intervalMs).toISOString();
  schemaSyncTimer = setTimeout(async () => {
    schemaSyncTimer = null;
    await runScheduledSchemaSync();
    scheduleSchemaSync();
  }, intervalMs);
  schemaSyncTimer.unref?.();
}

async function runScheduledSchemaSync() {
  try {
    const synced = await syncSchemaFromMeiroProfile({}, "schema-scheduler");
    recordSchemaSyncSuccess(synced, "schema-scheduler");
    await saveStore();
  } catch (error) {
    recordSchemaSyncError(error, "schema-scheduler");
    await saveStore();
    console.warn(`Scheduled schema sync failed: ${error.message}`);
  }
}

function recordSchemaSyncSuccess(synced, author) {
  const importedCount = Object.values(synced.imported || {}).reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0);
  store.updateSettings(
    {
      schema_last_synced_at: createdAtIso(),
      schema_last_sync_status: "ok",
      schema_last_sync_error: "",
      schema_last_sync_count: importedCount
    },
    author
  );
}

function recordSchemaSyncError(error, author) {
  store.updateSettings(
    {
      schema_last_synced_at: createdAtIso(),
      schema_last_sync_status: "error",
      schema_last_sync_error: error.message || "Schema sync failed"
    },
    author
  );
}

function diagnoseSchemaImport(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) badRequest("Schema import payload must be an object");
  const valid = { attributes: [], segments: [], context: [] };
  const present = {
    attributes: Object.prototype.hasOwnProperty.call(body, "attributes"),
    segments: Object.prototype.hasOwnProperty.call(body, "segments"),
    context: Object.prototype.hasOwnProperty.call(body, "context")
  };
  const replace = {
    attributes: Array.isArray(body.attributes),
    segments: Array.isArray(body.segments),
    context: Array.isArray(body.context)
  };
  const diagnostics = {
    summary: {
      imported: 0,
      skipped: 0,
      failed: 0
    },
    attributes: schemaKindDiagnostics("attribute", body.attributes, valid.attributes),
    segments: schemaKindDiagnostics("segment", body.segments, valid.segments),
    context: schemaKindDiagnostics("context", body.context, valid.context)
  };
  diagnostics.summary.imported = valid.attributes.length + valid.segments.length + valid.context.length;
  diagnostics.summary.skipped = diagnostics.attributes.skipped.length + diagnostics.segments.skipped.length + diagnostics.context.skipped.length;
  diagnostics.summary.failed = diagnostics.attributes.failed.length + diagnostics.segments.failed.length + diagnostics.context.failed.length;
  return { valid, present, replace, diagnostics };
}

function schemaKindDiagnostics(kind, input, output) {
  const key = kind === "attribute" ? "attributes" : kind === "segment" ? "segments" : "context";
  if (input == null) {
    return { imported: 0, skipped: [], failed: [] };
  }
  if (!Array.isArray(input)) {
    return {
      imported: 0,
      skipped: [],
      failed: [{ reason: `${key} must be an array` }]
    };
  }
  const seen = new Set();
  const skipped = [];
  const failed = [];
  for (const [index, item] of input.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      failed.push({ index, reason: "item must be an object" });
      continue;
    }
    const name = String(item.name || "").trim();
    if (!name) {
      failed.push({ index, reason: "missing name" });
      continue;
    }
    if (seen.has(name)) {
      skipped.push({ index, name, reason: "duplicate name in import payload" });
      continue;
    }
    seen.add(name);
    output.push({
      ...item,
      name,
      type: item.type || (kind === "segment" ? "boolean" : "string")
    });
  }
  return { imported: output.length, skipped, failed };
}

function schemaSyncConfigured(settings) {
  return Boolean(
    String(settings.meiro_api_url || "").trim() &&
    String(settings.meiro_api_token || "").trim() &&
    String(settings.schema_sync_identifier_type || "").trim() &&
    String(settings.schema_sync_identifier_value || "").trim() &&
    Number(settings.schema_sync_interval_minutes || 0) > 0
  );
}

function profileSchemaSyncInputsConfigured(input = {}, settings = store.getSettings()) {
  return Boolean(
    String(input.meiro_api_url || settings.meiro_api_url || "").trim() &&
    String(input.meiro_api_token || settings.meiro_api_token || "").trim() &&
    String(input.identifier_type || settings.schema_sync_identifier_type || "").trim() &&
    String(input.identifier_value || settings.schema_sync_identifier_value || "").trim()
  );
}

function schemaSyncRuntime() {
  const settings = store.getSettings();
  return {
    configured: schemaSyncConfigured(settings),
    next_run_at: schemaSyncNextRunAt || null,
    interval_minutes: Number(settings.schema_sync_interval_minutes || 0)
  };
}

function createdAtIso() {
  return new Date().toISOString();
}

function logRequest(req, res, startedAt, error) {
  const statusCode = res.statusCode || error?.statusCode || 500;
  const durationMs = Date.now() - startedAt;
  const record = {
    level: statusCode >= 500 ? "error" : "info",
    at: createdAtIso(),
    request_id: res.requestId,
    method: req.method,
    path: req.url?.split("?")[0] || "",
    status: statusCode,
    duration_ms: durationMs
  };
  if (error) record.error = error.message;
  requestMetrics.record({
    method: req.method,
    path: record.path,
    status: statusCode,
    duration_ms: durationMs
  });
  recordClientTraffic(req, record.path, statusCode, durationMs);
  console.log(JSON.stringify(record));
}

function recordClientTraffic(req, path, statusCode, durationMs) {
  const action = clientTrafficAction(req.method, path);
  if (!action) return;
  clientTrafficMetrics.record({
    action,
    route: path,
    token: req.auth?.name || "anonymous",
    token_id: req.auth?.token_id || "",
    origin: req.headers.origin || "server",
    environment: req.client_context?.environment || clientContextValue(req, {}, ["environment", "environment_label", "env"]),
    app_id: req.client_context?.app_id || clientContextValue(req, {}, ["app_id", "application_id", "app"]),
    status: statusCode,
    duration_ms: durationMs
  });
}

function clientTrafficAction(method, path) {
  if (!String(path || "").startsWith("/v1/client/")) return "";
  const cleanPath = String(path || "").split("?")[0];
  if (method === "POST" && cleanPath === "/v1/client/evaluate") return "evaluate";
  if (method === "GET" && cleanPath === "/v1/client/rule-catalog") return "rule_catalog";
  if (method === "POST" && cleanPath === "/v1/client/surface") return "surface";
  if (method === "POST" && cleanPath === "/v1/client/surface/batch") return "surface_batch";
  const eventMatch = cleanPath.match(/^\/v1\/client\/(impression|exposure|conversion)$/);
  if (method === "POST" && eventMatch) return eventMatch[1];
  return "client";
}

function enforceClientRateLimit(req, res, action) {
  const result = clientRateLimiter.check(clientRateLimitKey(req, action));
  if (result.limit) {
    res.setHeader("x-ratelimit-limit", String(result.limit));
    res.setHeader("x-ratelimit-remaining", String(result.remaining));
    res.setHeader("x-ratelimit-reset", result.reset_at);
  }
  if (result.allowed) return;

  res.setHeader("retry-after", String(result.retry_after_seconds));
  const error = new Error("Client rate limit exceeded");
  error.statusCode = 429;
  error.code = "rate_limited";
  throw error;
}

function clientRateLimitKey(req, action) {
  const tokenName = req.auth?.name || "anonymous";
  const origin = req.headers.origin || "server";
  const ip = forwardedIp(req) || req.socket?.remoteAddress || "unknown";
  return [tokenName, action || "client", origin, ip].join(":");
}

function forwardedIp(req) {
  return String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)[0] || "";
}

function inferSchemaFromProfile(profile) {
  const attributes = readProfileObject(profile, ["attributes", "profile.attributes", "data.attributes", "payload.attributes"]);
  const segments = readProfileObject(profile, ["segments", "audiences", "profile.segments", "profile.audiences", "data.segments", "data.audiences"]);
  const context = readProfileObject(profile, ["context", "profile.context", "data.context"]);
  return {
    attributes: objectToSchemaItems(attributes, "attribute"),
    segments: objectToSchemaItems(segments, "segment"),
    context: objectToSchemaItems(context, "context")
  };
}

function readProfileObject(root, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], root);
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  }
  return {};
}

function objectToSchemaItems(object, kind) {
  return Object.entries(object).map(([name, raw]) => ({
    name,
    type: inferValueType(raw, kind),
    dimension: inferValueDimension(raw, kind),
    source: "meiro_profile_api",
    raw
  }));
}

function inferValueDimension(raw, kind) {
  if (kind === "segment") return "audience";
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value).filter((key) => value[key] != null);
    if (keys.length === 1) return keys[0];
    for (const key of ["value", "score", "count", "ltv", "total_spent", "tier", "segment", "language_code", "balance"]) {
      if (key in value) return key;
    }
    return keys.slice(0, 3).join(", ");
  }
  return "value";
}

function inferValueType(raw, kind) {
  if (kind === "segment") return "boolean";
  const value = unwrapProfileValue(raw);
  if (Array.isArray(value)) return "array";
  if (value == null) return "string";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return "timestamp";
  return typeof value === "object" ? "object" : "string";
}

function unwrapProfileValue(raw) {
  if (Array.isArray(raw)) return raw.length ? unwrapProfileValue(raw[0]) : [];
  if (raw && typeof raw === "object" && "value" in raw) return raw.value;
  if (raw && typeof raw === "object") {
    const entries = Object.entries(raw).filter(([, value]) => value != null);
    if (entries.length === 1) return entries[0][1];
    for (const key of ["score", "count", "value", "ltv", "total_spent", "tier", "segment", "language_code", "balance"]) {
      if (key in raw) return raw[key];
    }
  }
  return raw;
}

function publicSettings(settings) {
  const copy = { ...settings };
  if (copy.meiro_api_token) copy.meiro_api_token_configured = true;
  if (copy.meiro_cli_token) copy.meiro_cli_token_configured = true;
  if (copy.assistant_llm_api_key) copy.assistant_llm_api_key_configured = true;
  delete copy.meiro_api_token;
  delete copy.meiro_cli_token;
  delete copy.assistant_llm_api_key;
  return copy;
}

async function applyCampaignAction(body = {}, author = "admin") {
  const campaign = body.campaign || "Unassigned";
  const action = body.action || "";
  const dryRun = body.dry_run !== false;
  if (!["submit_review", "archive", "duplicate", "move"].includes(action)) badRequest("Unsupported campaign action");
  const assets = await storeCall("listCampaignAssets", campaign);
  const duplicateSuffix = normalizeCampaignDuplicateSuffix(body.suffix || "copy");
  const targetCampaign = typeof body.target_campaign === "string" ? body.target_campaign.trim() : "";
  const targetFolder = typeof body.target_folder === "string" ? body.target_folder.trim() : "";
  if (action === "move" && !("target_campaign" in body) && !("target_folder" in body)) {
    badRequest("target_campaign or target_folder is required");
  }
  if (action === "submit_review" && !(await approvalWorkflowEnabled())) {
    badRequest("Approval workflow is disabled");
  }
  const targetLabel = campaignLabelFromParts(targetCampaign, targetFolder) || "Unassigned";
  const result = {
    campaign: assets.campaign,
    action,
    dry_run: dryRun,
    target_campaign: action === "move" ? targetLabel : undefined,
    affected: [],
    skipped: []
  };
  const affect = (item) => result.affected.push(item);
  const skip = (item) => result.skipped.push(item);

  if (action === "submit_review") {
    for (const rule of assets.rules) {
      if (rule.status === "archived") {
        skip({ object_type: "rule", object_id: rule.decision_key, reason: "archived" });
        continue;
      }
      affect({ object_type: rule.type === "experiment" ? "experiment" : "rule", object_id: rule.decision_key, action: "submit_review" });
      if (!dryRun) {
        const fullRule = await storeCall("getRuleSet", rule.decision_key);
        await storeCall("setRuleApproval", rule.decision_key, {
          status: "submitted",
          note: body.note || `Bulk submitted from campaign ${assets.campaign}`,
          assigned_to: body.assigned_to || "",
          draft_hash: draftHash(fullRule.draft)
        }, author);
      }
    }
    for (const message of assets.messages) {
      skip({ object_type: "message", object_id: message.id, reason: "messages_do_not_use_rule_review" });
    }
  }

  if (action === "archive") {
    for (const rule of assets.rules) {
      if (rule.status === "archived") {
        skip({ object_type: "rule", object_id: rule.decision_key, reason: "already_archived" });
        continue;
      }
      affect({ object_type: rule.type === "experiment" ? "experiment" : "rule", object_id: rule.decision_key, action: "archive" });
      if (!dryRun) await storeCall("archiveRuleSet", rule.decision_key, author);
    }
    for (const message of assets.messages) {
      if (message.status === "archived") {
        skip({ object_type: "message", object_id: message.id, reason: "already_archived" });
        continue;
      }
      affect({ object_type: "message", object_id: message.id, action: "archive" });
      if (!dryRun) await storeCall("upsertMessage", message.id, { ...message, status: "archived" }, author);
    }
  }

  if (action === "duplicate") {
    for (const rule of assets.rules) {
      const targetId = normalizeCampaignDuplicateId(rule.decision_key, duplicateSuffix);
      if (!targetId || await storeCall("getRuleSet", targetId)) {
        skip({ object_type: rule.type === "experiment" ? "experiment" : "rule", object_id: rule.decision_key, target_id: targetId, reason: "target_exists" });
        continue;
      }
      affect({ object_type: rule.type === "experiment" ? "experiment" : "rule", object_id: rule.decision_key, target_id: targetId, action: "duplicate" });
      if (!dryRun) {
        await storeCall("duplicateRuleSet", rule.decision_key, {
          decision_key: targetId,
          name: `${rule.name || rule.decision_key} Copy`
        }, author);
      }
    }
    for (const message of assets.messages) {
      const targetId = normalizeCampaignDuplicateId(message.id, duplicateSuffix);
      if (!targetId || await storeCall("getMessage", targetId)) {
        skip({ object_type: "message", object_id: message.id, target_id: targetId, reason: "target_exists" });
        continue;
      }
      affect({ object_type: "message", object_id: message.id, target_id: targetId, action: "duplicate" });
      if (!dryRun) {
        await storeCall("upsertMessage", targetId, {
          ...message,
          name: `${message.name || message.id} Copy`,
          status: "active"
        }, author);
      }
    }
  }

  if (action === "move") {
    if (targetLabel === assets.campaign) {
      for (const rule of assets.rules) {
        skip({ object_type: rule.type === "experiment" ? "experiment" : "rule", object_id: rule.decision_key, reason: "already_in_target_campaign" });
      }
      for (const message of assets.messages) {
        skip({ object_type: "message", object_id: message.id, reason: "already_in_target_campaign" });
      }
    } else {
      for (const rule of assets.rules) {
        affect({
          object_type: rule.type === "experiment" ? "experiment" : "rule",
          object_id: rule.decision_key,
          action: "move",
          target_campaign: targetLabel
        });
        if (!dryRun) await storeCall("setRuleCampaign", rule.decision_key, { campaign: targetCampaign, folder: targetFolder }, author);
      }
      for (const message of assets.messages) {
        affect({ object_type: "message", object_id: message.id, action: "move", target_campaign: targetLabel });
        if (!dryRun) await storeCall("setMessageCampaign", message.id, { campaign: targetCampaign, folder: targetFolder }, author);
      }
    }
  }

  return {
    ...result,
    summary: {
      affected: result.affected.length,
      skipped: result.skipped.length,
      rules: result.affected.filter((item) => item.object_type === "rule").length,
      experiments: result.affected.filter((item) => item.object_type === "experiment").length,
      messages: result.affected.filter((item) => item.object_type === "message").length
    }
  };
}

function normalizeCampaignDuplicateSuffix(value) {
  return normalizeCampaignDuplicateId(value || "copy", "").replace(/^_+|_+$/g, "") || "copy";
}

function campaignLabelFromParts(campaign = "", folder = "") {
  return [String(campaign || "").trim(), String(folder || "").trim()].filter(Boolean).join(" / ");
}

function campaignLabelFromMetadata(metadata = {}) {
  const campaign = typeof metadata?.campaign === "string" ? metadata.campaign : metadata?.campaign?.name || "";
  const folder = metadata?.campaign?.folder || metadata?.folder || "";
  return campaignLabelFromParts(campaign, folder) || "Unassigned";
}

async function moveCampaignAssets(body = {}, author = "admin") {
  const assets = Array.isArray(body.assets) ? body.assets : [];
  const dryRun = body.dry_run !== false;
  const targetCampaign = typeof body.target_campaign === "string"
    ? body.target_campaign.trim()
    : typeof body.campaign === "string" ? body.campaign.trim() : "";
  const targetFolder = typeof body.target_folder === "string"
    ? body.target_folder.trim()
    : typeof body.folder === "string" ? body.folder.trim() : "";
  if (!assets.length) badRequest("assets is required");
  if (!("target_campaign" in body) && !("target_folder" in body) && !("campaign" in body) && !("folder" in body)) {
    badRequest("target_campaign or target_folder is required");
  }
  const targetLabel = campaignLabelFromParts(targetCampaign, targetFolder) || "Unassigned";
  const result = {
    action: "move",
    dry_run: dryRun,
    target_campaign: targetLabel,
    affected: [],
    skipped: []
  };

  for (const asset of assets) {
    const objectType = String(asset.object_type || asset.type || "").trim().toLowerCase();
    const objectId = String(asset.object_id || asset.id || asset.key || "").trim();
    if (!objectId) {
      result.skipped.push({ object_type: objectType || "unknown", object_id: "", reason: "missing_object_id" });
      continue;
    }
    if (objectType === "rule" || objectType === "experiment") {
      const rule = await storeCall("getRuleSet", objectId);
      if (!rule) {
        result.skipped.push({ object_type: objectType, object_id: objectId, reason: "not_found" });
        continue;
      }
      const resolvedType = rule.type === "experiment" ? "experiment" : "rule";
      const currentCampaign = campaignLabelFromMetadata(rule.metadata || {});
      if (currentCampaign === targetLabel) {
        result.skipped.push({ object_type: resolvedType, object_id: objectId, reason: "already_in_target_campaign" });
        continue;
      }
      result.affected.push({ object_type: resolvedType, object_id: objectId, action: "move", from_campaign: currentCampaign, target_campaign: targetLabel });
      if (!dryRun) await storeCall("setRuleCampaign", objectId, { campaign: targetCampaign, folder: targetFolder }, author);
      continue;
    }
    if (objectType === "message") {
      const message = await storeCall("getMessage", objectId);
      if (!message) {
        result.skipped.push({ object_type: "message", object_id: objectId, reason: "not_found" });
        continue;
      }
      const currentCampaign = campaignLabelFromMetadata(message.metadata || {});
      if (currentCampaign === targetLabel) {
        result.skipped.push({ object_type: "message", object_id: objectId, reason: "already_in_target_campaign" });
        continue;
      }
      result.affected.push({ object_type: "message", object_id: objectId, action: "move", from_campaign: currentCampaign, target_campaign: targetLabel });
      if (!dryRun) await storeCall("setMessageCampaign", objectId, { campaign: targetCampaign, folder: targetFolder }, author);
      continue;
    }
    result.skipped.push({ object_type: objectType || "unknown", object_id: objectId, reason: "unsupported_type" });
  }

  return {
    ...result,
    summary: {
      affected: result.affected.length,
      skipped: result.skipped.length,
      rules: result.affected.filter((item) => item.object_type === "rule").length,
      experiments: result.affected.filter((item) => item.object_type === "experiment").length,
      messages: result.affected.filter((item) => item.object_type === "message").length
    }
  };
}

function normalizeCampaignDuplicateId(base, suffix) {
  return String([base, suffix].filter(Boolean).join("_"))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function routeRuleSet(req, res, key, suffix) {
  if (req.method === "GET" && suffix === "") {
    requireScope(req, "viewer");
    const ruleSet = await storeCall("getRuleSet", key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    const latest = ruleSet.versions.at(-1);
    sendJson(res, 200, { rule_set: publicRuleSet(ruleSet), draft: ruleSet.draft, version: latest || null });
    return;
  }

  if (req.method === "GET" && suffix === "versions") {
    requireScope(req, "viewer");
    sendJson(res, 200, { versions: await storeCall("listVersions", key) });
    return;
  }

  if (req.method === "GET" && suffix === "visual-diff") {
    requireScope(req, "viewer");
    const ruleSet = await storeCall("getRuleSet", key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    if (ruleSet.type !== "experiment") badRequest("Visual diff is available only for experiments");
    sendJson(res, 200, visualExperimentDiff(ruleSet));
    return;
  }

  const versionMatch = suffix.match(/^versions\/(\d+)$/);
  if (req.method === "GET" && versionMatch) {
    requireScope(req, "viewer");
    sendJson(res, 200, { version: await storeCall("getVersion", key, Number(versionMatch[1])) });
    return;
  }

  const versionDiffMatch = suffix.match(/^versions\/(\d+)\/diff$/);
  if (req.method === "GET" && versionDiffMatch) {
    requireScope(req, "viewer");
    const left = await storeCall("getVersion", key, Number(versionDiffMatch[1]));
    const compareTo = new URL(req.url, `http://${req.headers.host || "localhost"}`).searchParams.get("compare_to") || "draft";
    const ruleSet = await storeCall("getRuleSet", key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    const right = compareTo === "draft"
      ? { version: "draft", definition: ruleSet.draft }
      : await storeCall("getVersion", key, Number(compareTo));
    sendJson(res, 200, {
      left: { version: left.version, published_at: left.published_at, author: left.author },
      right: right.version === "draft"
        ? { version: "draft" }
        : { version: right.version, published_at: right.published_at, author: right.author },
      diff: diffValues(left.definition, right.definition)
    });
    return;
  }

  const versionRollbackMatch = suffix.match(/^versions\/(\d+)\/rollback$/);
  if (req.method === "POST" && versionRollbackMatch) {
    requireScope(req, "editor");
    const ruleSet = await storeCall("rollbackDraftToVersion", key, Number(versionRollbackMatch[1]), req.auth.name);
    await saveStore();
    clientResultCache.clear();
    sendJson(res, 200, { rule_set: publicRuleSet(ruleSet), draft: ruleSet.draft });
    return;
  }

  if (req.method === "PUT" && suffix === "draft") {
    requireScope(req, "editor");
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateRuleSetPayload(body, { partial: true });
    const existing = await storeCall("getRuleSet", key);
    if (!existing) notFoundError(`Rule set not found: ${key}`);
    if (body.decision_key && body.decision_key !== key) {
      badRequest("decision_key is immutable for saved rule sets. Duplicate the rule to create a new key.");
    }
    validateRuleDefinition(body.draft || body.definition || {}, body.input_schema || existing.input_schema || {});
    const ruleSet = await storeCall("updateDraft", key, body, req.auth.name);
    await saveStore();
    clientResultCache.clear();
    sendJson(res, 200, { rule_set: publicRuleSet(ruleSet), draft: ruleSet.draft });
    return;
  }

  if (req.method === "POST" && suffix === "publish") {
    requireScope(req, "publisher");
    const ruleSet = await storeCall("getRuleSet", key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    validateRuleDefinition(ruleSet.draft, ruleSet.input_schema || {});
    if (await approvalWorkflowEnabled()) requireApprovedDraft(ruleSet);
    const version = await storeCall("publish", key, req.auth.name);
    await saveStore();
    clientResultCache.clear();
    sendJson(res, 200, { version, conflicts: ruleConflictsFor(key) });
    return;
  }

  if (req.method === "POST" && suffix === "submit-review") {
    requireScope(req, "editor");
    if (!(await approvalWorkflowEnabled())) badRequest("Approval workflow is disabled");
    const body = await readJson(req, config.requestBodyLimitBytes);
    const ruleSet = await storeCall("getRuleSet", key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    validateRuleDefinition(ruleSet.draft, ruleSet.input_schema || {});
    const updated = await storeCall("setRuleApproval", key, {
      status: "submitted",
      note: body.note || "",
      assigned_to: body.assigned_to || "",
      draft_hash: draftHash(ruleSet.draft)
    }, req.auth.name);
    await saveStore();
    sendJson(res, 200, { rule_set: publicRuleSet(updated), approval: updated.metadata.approval, conflicts: ruleConflictsFor(key) });
    return;
  }

  if (req.method === "POST" && suffix === "approve") {
    requireScope(req, "publisher");
    if (!(await approvalWorkflowEnabled())) badRequest("Approval workflow is disabled");
    const body = await readJson(req, config.requestBodyLimitBytes);
    const ruleSet = await storeCall("getRuleSet", key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    validateRuleDefinition(ruleSet.draft, ruleSet.input_schema || {});
    const approval = ruleSet.metadata?.approval || {};
    if (approval.status !== "submitted" && !body.force) badRequest("Draft must be submitted for review before approval");
    const updated = await storeCall("setRuleApproval", key, {
      status: "approved",
      note: body.note || approval.note || "",
      draft_hash: draftHash(ruleSet.draft)
    }, req.auth.name);
    await saveStore();
    sendJson(res, 200, { rule_set: publicRuleSet(updated), approval: updated.metadata.approval, conflicts: ruleConflictsFor(key) });
    return;
  }

  if (req.method === "POST" && suffix === "archive") {
    requireScope(req, "editor");
    const ruleSet = await storeCall("archiveRuleSet", key, req.auth.name);
    await saveStore();
    clientResultCache.clear();
    sendJson(res, 200, { rule_set: publicRuleSet(ruleSet) });
    return;
  }

  if (req.method === "POST" && suffix === "duplicate") {
    requireScope(req, "editor");
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateRuleSetPayload(
      {
        name: body.name || `${key} Copy`,
        decision_key: body.decision_key || `${key}_copy`
      },
      { partial: false }
    );
    const ruleSet = await storeCall("duplicateRuleSet", key, body, req.auth.name);
    await saveStore();
    clientResultCache.clear();
    sendJson(res, 201, { rule_set: publicRuleSet(ruleSet), draft: ruleSet.draft });
    return;
  }

  if (req.method === "POST" && suffix === "test") {
    requireScope(req, "editor");
    const ruleSet = await storeCall("getRuleSet", key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    validateRuleDefinition(ruleSet.draft, ruleSet.input_schema || {});
    const body = {
      ...(await readJson(req, config.requestBodyLimitBytes)),
      decision_key: key
    };
    validateEvaluateRequest(body);
    const result = evaluateDecision({
      request: body,
      version: {
        version: 0,
        definition: ruleSet.draft
      },
      lookupTables: await storeCall("listLookupTables")
    });
    sendJson(res, 200, { ...result, tested_version: "draft" });
    return;
  }

  if (req.method === "POST" && suffix === "test-published") {
    requireScope(req, "editor");
    const ruleSet = await storeCall("getRuleSet", key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    const body = {
      ...(await readJson(req, config.requestBodyLimitBytes)),
      decision_key: key
    };
    validateEvaluateRequest(body);
    const version = await storeCall("getVersion", key, body.rule_version);
    const result = evaluateDecision({
      request: body,
      version,
      lookupTables: await storeCall("listLookupTables")
    });
    sendJson(res, 200, { ...result, tested_version: "published" });
    return;
  }

  notFound(res);
}

function auditToCsv(audit) {
  const columns = ["evaluated_at", "decision_key", "profile_key", "rule_version", "result", "matched_rules", "outputs", "errors"];
  const lines = [columns.join(",")];
  for (const entry of audit) {
    lines.push(
      columns
        .map((column) => {
          const value = Array.isArray(entry[column]) || (entry[column] && typeof entry[column] === "object")
            ? JSON.stringify(entry[column])
            : entry[column];
          return csvCell(value);
        })
        .join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

function lookupTableToCsv(table) {
  const columns = [
    table.key_column,
    ...[...new Set((table.rows || []).flatMap((row) => Object.keys(row || {})))].filter((column) => column !== table.key_column)
  ].filter(Boolean);
  const lines = [columns.map(csvCell).join(",")];
  for (const row of table.rows || []) {
    lines.push(
      columns
        .map((column) => {
          const value = row?.[column];
          return csvCell(Array.isArray(value) || (value && typeof value === "object") ? JSON.stringify(value) : value);
        })
        .join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

function messageDiffRef(message) {
  return {
    version: message.version,
    updated_at: message.updated_at,
    author: message.author
  };
}

function messageDiffPayload(message) {
  return {
    name: message.name,
    surface: message.surface,
    status: message.status,
    content_schema: message.content_schema || {},
    default_content: message.default_content || {},
    metadata: message.metadata || {}
  };
}

function experimentOperationsToCsv(operations) {
  const columns = [
    "decision_key",
    "name",
    "rule_status",
    "experiment_status",
    "version",
    "assignment_unit",
    "baseline_variant",
    "winner_variant",
    "winner_recommendation_status",
    "winner_recommendation_action",
    "winner_recommendation_variant",
    "variant_key",
    "variant_weight",
    "is_baseline",
    "exposures",
    "conversions",
    "conversion_rate",
    "lift_vs_baseline",
    "confidence",
    "p_value",
    "significance_status",
    "significance_note",
    "impressions",
    "last_event_at"
  ];
  const lines = [columns.map(csvCell).join(",")];
  for (const experiment of operations.experiments || []) {
    for (const variant of experiment.variants || []) {
      const exposure = variant.events?.exposure || {};
      const conversion = variant.events?.conversion || {};
      const impression = variant.events?.impression || {};
      const lastEventAt = [exposure.last_seen_at, conversion.last_seen_at, impression.last_seen_at].filter(Boolean).sort().at(-1) || "";
      const values = {
        decision_key: experiment.decision_key,
        name: experiment.name,
        rule_status: experiment.status,
        experiment_status: experiment.experiment_status,
        version: experiment.version || "",
        assignment_unit: experiment.assignment_unit,
        baseline_variant: experiment.baseline_variant,
        winner_variant: experiment.winner_variant,
        winner_recommendation_status: experiment.winner_recommendation?.status || "",
        winner_recommendation_action: experiment.winner_recommendation?.action || "",
        winner_recommendation_variant: experiment.winner_recommendation?.variant_key || "",
        variant_key: variant.key,
        variant_weight: variant.weight,
        is_baseline: variant.baseline ? "true" : "false",
        exposures: exposure.count || 0,
        conversions: conversion.count || 0,
        conversion_rate: decimalPercent(variant.conversion_rate),
        lift_vs_baseline: variant.lift_vs_baseline == null ? "" : decimalPercent(variant.lift_vs_baseline),
        confidence: variant.significance?.confidence == null ? "" : decimalPercent(variant.significance.confidence),
        p_value: variant.significance?.p_value == null ? "" : variant.significance.p_value,
        significance_status: variant.significance?.status || "",
        significance_note: variant.significance?.note || "",
        impressions: impression.count || 0,
        last_event_at: lastEventAt
      };
      lines.push(columns.map((column) => csvCell(values[column])).join(","));
    }
  }
  return `${lines.join("\n")}\n`;
}

function createExperimentEditorSession(ruleSet, body = {}) {
  const now = Date.now();
  const ttlSeconds = Math.max(60, Math.min(Number(body.ttl_seconds || 900), 3600));
  const expiresAt = new Date(now + ttlSeconds * 1000).toISOString();
  const tokenPayload = [
    ruleSet.decision_key,
    ruleSet.version || 0,
    expiresAt,
    randomUUID()
  ].join(":");
  const token = createHash("sha256").update(tokenPayload).digest("hex");
  cleanupExperimentEditorSessions(now);
  experimentEditorSessions.set(token, {
    decision_key: ruleSet.decision_key,
    rule_version: ruleSet.version || null,
    variant_key: body.variant_key || "",
    expires_at: expiresAt,
    expires_at_ms: now + ttlSeconds * 1000,
    created_at: new Date(now).toISOString()
  });
  const websiteUrl = body.website_url || body.url || "http://localhost:8092/experiment-mock-site/";
  const editorUrl = new URL(websiteUrl);
  editorUrl.searchParams.set("dee_editor", "1");
  editorUrl.searchParams.set("dee_editor_rule", ruleSet.decision_key);
  editorUrl.searchParams.set("dee_editor_token", token);
  if (body.variant_key) editorUrl.searchParams.set("dee_editor_variant", body.variant_key);
  return {
    decision_key: ruleSet.decision_key,
    rule_version: ruleSet.version || null,
    editor_token: token,
    expires_at: expiresAt,
    ttl_seconds: ttlSeconds,
    editor_url: editorUrl.toString(),
    permissions: {
      can_publish: false,
      can_save_draft: true,
      can_copy_modifications: true
    }
  };
}

function createExperimentPreviewLink(ruleSet, body = {}) {
  const now = Date.now();
  const ttlSeconds = Math.max(60, Math.min(Number(body.ttl_seconds || 900), 86400));
  const expiresAt = new Date(now + ttlSeconds * 1000).toISOString();
  const variantKey = String(body.variant_key || body.variant || "").trim();
  const variants = Array.isArray(ruleSet.metadata?.experiment?.variants) ? ruleSet.metadata.experiment.variants : [];
  if (variantKey && !variants.some((variant) => variant.key === variantKey)) {
    badRequest(`Variant not found: ${variantKey}`);
  }
  const tokenPayload = [
    "preview",
    ruleSet.decision_key,
    ruleSet.version || 0,
    variantKey,
    expiresAt,
    randomUUID()
  ].join(":");
  const token = createHash("sha256").update(tokenPayload).digest("hex");
  cleanupExperimentPreviewSessions(now);
  experimentPreviewSessions.set(token, {
    decision_key: ruleSet.decision_key,
    rule_version: ruleSet.version || null,
    variant_key: variantKey,
    expires_at: expiresAt,
    expires_at_ms: now + ttlSeconds * 1000,
    created_at: new Date(now).toISOString(),
    mode: "preview"
  });
  const websiteUrl = body.website_url || body.url || "http://localhost:8092/experiment-mock-site/";
  const previewUrl = new URL(websiteUrl);
  previewUrl.searchParams.set("dee_preview", "1");
  previewUrl.searchParams.set("dee_preview_rule", ruleSet.decision_key);
  previewUrl.searchParams.set("dee_preview_token", token);
  if (variantKey) previewUrl.searchParams.set("dee_force_variant", variantKey);
  if (variantKey) previewUrl.searchParams.set("dee_preview_variant", variantKey);
  return {
    decision_key: ruleSet.decision_key,
    rule_version: ruleSet.version || null,
    preview_token: token,
    expires_at: expiresAt,
    ttl_seconds: ttlSeconds,
    variant_key: variantKey,
    preview_url: previewUrl.toString(),
    api_url: `/v1/preview/${token}`,
    permissions: {
      can_publish: false,
      can_save_draft: false,
      can_force_variant: true
    }
  };
}

async function saveExperimentEditorDraft(key, body = {}) {
  const token = String(body.editor_token || body.token || "").trim();
  const session = requireExperimentEditorSession(key, token);
  const ruleSet = await storeCall("getRuleSet", key);
  if (!ruleSet || ruleSet.type !== "experiment") {
    notFoundError(`Experiment not found: ${key}`);
  }

  const metadata = cloneJson(ruleSet.metadata || {});
  metadata.experiment = metadata.experiment && typeof metadata.experiment === "object" ? metadata.experiment : {};
  const variants = Array.isArray(metadata.experiment.variants) ? metadata.experiment.variants : [];
  if (!variants.length) badRequest("Experiment has no variants to update");

  const variantKey = String(body.variant_key || body.variant || session.variant_key || "").trim();
  if (!variantKey) badRequest("variant_key is required");
  const variant = variants.find((item) => item.key === variantKey);
  if (!variant) badRequest(`Variant not found: ${variantKey}`);
  if (variant.baseline || variantKey === metadata.experiment.baseline_variant) {
    badRequest("Visual editor can only save draft outputs for non-baseline variants");
  }

  const validation = validateVisualEditorOutputs(body.outputs || body.payload?.outputs || {});
  variant.outputs = {
    ...(variant.outputs || {}),
    ...validation.outputs,
    updated_by: "visual_editor",
    updated_at: new Date().toISOString()
  };

  validateRuleSetPayload({ metadata }, { partial: true });
  validateRuleDefinition(ruleSet.draft || {}, ruleSet.input_schema || {});
  const updated = await storeCall("updateDraft", key, { metadata }, "visual_editor");
  await saveStore();
  clientResultCache.clear();
  return {
    rule_set: publicRuleSet(updated),
    draft: updated.draft,
    variant_key: variantKey,
    modifications_count: validation.outputs.modifications.length,
    warnings: validation.warnings,
    session_expires_at: session.expires_at
  };
}

function requireExperimentEditorSession(key, token) {
  if (!token) badRequest("editor_token is required");
  cleanupExperimentEditorSessions(Date.now());
  const session = experimentEditorSessions.get(token);
  if (!session || session.decision_key !== key) {
    forbidden("Editor token is invalid or expired");
  }
  return session;
}

function cleanupExperimentEditorSessions(now = Date.now()) {
  for (const [token, session] of experimentEditorSessions.entries()) {
    if (!session.expires_at_ms || session.expires_at_ms <= now) {
      experimentEditorSessions.delete(token);
    }
  }
}

function requireExperimentPreviewSession(token) {
  if (!token) badRequest("preview token is required");
  cleanupExperimentPreviewSessions(Date.now());
  const session = experimentPreviewSessions.get(token);
  if (!session) {
    forbidden("Preview token is invalid or expired");
  }
  return {
    decision_key: session.decision_key,
    rule_version: session.rule_version,
    variant_key: session.variant_key,
    expires_at: session.expires_at,
    created_at: session.created_at,
    mode: session.mode || "preview",
    permissions: {
      can_publish: false,
      can_save_draft: false,
      can_force_variant: true
    }
  };
}

function cleanupExperimentPreviewSessions(now = Date.now()) {
  for (const [token, session] of experimentPreviewSessions.entries()) {
    if (!session.expires_at_ms || session.expires_at_ms <= now) {
      experimentPreviewSessions.delete(token);
    }
  }
}

function validateVisualEditorOutputs(outputs) {
  if (!outputs || typeof outputs !== "object" || Array.isArray(outputs)) {
    badRequest("outputs must be an object");
  }
  if (outputs.template != null && outputs.template !== "dom_modifications") {
    badRequest("Visual editor can only save dom_modifications outputs");
  }
  if (!Array.isArray(outputs.modifications)) {
    badRequest("outputs.modifications must be an array");
  }
  if (outputs.modifications.length > 50) {
    badRequest("Visual editor outputs can include at most 50 modifications");
  }

  const warnings = [];
  const allowedTypes = new Set(["change_text", "change_attribute", "change_style", "insert_html", "move", "remove"]);
  const modifications = outputs.modifications.map((modification, index) => {
    if (!modification || typeof modification !== "object" || Array.isArray(modification)) {
      badRequest(`Modification ${index + 1} must be an object`);
    }
    const type = String(modification.type || "").trim();
    const selector = String(modification.selector || "").trim();
    if (!allowedTypes.has(type)) {
      badRequest(`Modification ${index + 1} has unsupported type`);
    }
    if (!selector) badRequest(`Modification ${index + 1} selector is required`);
    if (selector.length > 500) badRequest(`Modification ${index + 1} selector is too long`);
    if (isBroadVisualSelector(selector)) {
      warnings.push(`Modification ${index + 1} uses a broad selector: ${selector}`);
    }
    return sanitizeVisualModification({ ...modification, type, selector }, index);
  });

  return {
    outputs: {
      ...outputs,
      template: "dom_modifications",
      modifications
    },
    warnings
  };
}

function sanitizeVisualModification(modification, index) {
  const sanitized = {
    type: modification.type,
    selector: modification.selector
  };
  if (modification.id != null) sanitized.id = String(modification.id).slice(0, 120);
  if (modification.type === "change_text") {
    if (typeof modification.value !== "string") badRequest(`Modification ${index + 1} value must be a string`);
    sanitized.value = modification.value;
  }
  if (modification.type === "change_attribute") {
    const name = String(modification.attribute || modification.name || "").trim();
    if (!name) badRequest(`Modification ${index + 1} attribute name is required`);
    if (!isSafeVisualAttributeName(name)) badRequest(`Modification ${index + 1} attribute name is not allowed`);
    if (typeof modification.value !== "string") badRequest(`Modification ${index + 1} attribute value must be a string`);
    sanitized.attribute = name;
    sanitized.value = modification.value;
  }
  if (modification.type === "change_style") {
    const property = String(modification.property || modification.name || "").trim();
    if (!property) badRequest(`Modification ${index + 1} CSS property is required`);
    if (!isSafeVisualStyleProperty(property)) badRequest(`Modification ${index + 1} CSS property is not allowed`);
    if (typeof modification.value !== "string") badRequest(`Modification ${index + 1} CSS value must be a string`);
    sanitized.property = property;
    sanitized.value = modification.value;
  }
  if (modification.type === "insert_html") {
    if (typeof modification.html !== "string") badRequest(`Modification ${index + 1} html must be a string`);
    const position = String(modification.position || "replace");
    if (!["replace", "before", "after", "prepend", "append"].includes(position)) {
      badRequest(`Modification ${index + 1} insert position is not allowed`);
    }
    if (/<script[\s>]/i.test(modification.html) || /\son[a-z]+\s*=/i.test(modification.html)) {
      badRequest(`Modification ${index + 1} html contains unsafe script or event handler`);
    }
    sanitized.html = modification.html;
    sanitized.position = position;
  }
  if (modification.type === "move") {
    const targetSelector = String(modification.target_selector || "").trim();
    const position = String(modification.position || "after");
    if (!targetSelector) badRequest(`Modification ${index + 1} target_selector is required`);
    if (!["before", "after", "prepend", "append"].includes(position)) {
      badRequest(`Modification ${index + 1} move position is not allowed`);
    }
    sanitized.target_selector = targetSelector;
    sanitized.position = position;
  }
  if (modification.type === "remove") {
    const mode = String(modification.mode || "collapse");
    if (!["collapse", "preserve_space"].includes(mode)) badRequest(`Modification ${index + 1} remove mode is not allowed`);
    sanitized.mode = mode;
  }
  if (modification.description != null) sanitized.description = String(modification.description).slice(0, 500);
  return sanitized;
}

function isSafeVisualAttributeName(name) {
  const normalized = name.toLowerCase();
  return /^[a-zA-Z_:][a-zA-Z0-9_:.:-]*$/.test(name)
    && !normalized.startsWith("on")
    && !["srcdoc", "innerhtml", "outerhtml"].includes(normalized);
}

function isSafeVisualStyleProperty(property) {
  const normalized = property.toLowerCase();
  return /^[a-z-]+$/.test(normalized)
    && !normalized.startsWith("--")
    && !["behavior", "binding"].includes(normalized);
}

function isBroadVisualSelector(selector) {
  const normalized = String(selector || "").trim().toLowerCase();
  if (!normalized) return false;
  if (["body", "html", "*", "main", "section", "article", "header", "footer", "div", "a", "img", "button"].includes(normalized)) return true;
  if (/^[a-z][a-z0-9-]*$/i.test(normalized)) return true;
  if (/^(\.[\w-]+|#[\w-]+)\s+\*$/.test(normalized)) return true;
  return false;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function decimalPercent(value) {
  return Number.isFinite(Number(value)) ? Number(value) : "";
}

function diffValues(left, right, path = "$") {
  if (JSON.stringify(left) === JSON.stringify(right)) return [];
  if (!isDiffObject(left) || !isDiffObject(right) || Array.isArray(left) || Array.isArray(right)) {
    return [{ path, before: left, after: right, change: left === undefined ? "added" : right === undefined ? "removed" : "changed" }];
  }
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  return keys.flatMap((key) => diffValues(left[key], right[key], `${path}.${key}`));
}

function visualExperimentDiff(ruleSet) {
  const published = ruleSet.versions.at(-1) || null;
  const publishedExperiment = published?.metadata?.experiment || {};
  const draftExperiment = ruleSet.metadata?.experiment || {};
  const publishedVariants = Array.isArray(publishedExperiment.variants) ? publishedExperiment.variants : [];
  const draftVariants = Array.isArray(draftExperiment.variants) ? draftExperiment.variants : [];
  const variantKeys = [...new Set([
    ...publishedVariants.map((variant) => variant.key).filter(Boolean),
    ...draftVariants.map((variant) => variant.key).filter(Boolean)
  ])];
  const variants = variantKeys.map((variantKey) => {
    const before = publishedVariants.find((variant) => variant.key === variantKey) || {};
    const after = draftVariants.find((variant) => variant.key === variantKey) || {};
    const beforeModifications = visualVariantModifications(before);
    const afterModifications = visualVariantModifications(after);
    const changes = visualModificationChanges(beforeModifications, afterModifications);
    const warnings = changes.items.reduce((sum, item) => sum + (Array.isArray(item.warnings) ? item.warnings.length : 0), 0);
    return {
      variant_key: variantKey,
      baseline: Boolean(after.baseline || before.baseline || variantKey === draftExperiment.baseline_variant),
      before_count: beforeModifications.length,
      after_count: afterModifications.length,
      added: changes.added.length,
      changed: changes.changed.length,
      removed: changes.removed.length,
      warnings,
      changes: changes.items.slice(0, 20)
    };
  });
  return {
    decision_key: ruleSet.decision_key,
    published_version: published?.version || null,
    published_at: published?.published_at || null,
    draft_updated_at: ruleSet.updated_at || null,
    summary: {
      variants: variants.length,
      changed_variants: variants.filter((variant) => variant.added || variant.changed || variant.removed).length,
      added: variants.reduce((sum, variant) => sum + variant.added, 0),
      changed: variants.reduce((sum, variant) => sum + variant.changed, 0),
      removed: variants.reduce((sum, variant) => sum + variant.removed, 0),
      warnings: variants.reduce((sum, variant) => sum + variant.warnings, 0)
    },
    variants
  };
}

function visualVariantModifications(variant = {}) {
  const outputs = variant.outputs || {};
  const modifications = outputs.modifications || outputs.dom_modifications || [];
  return Array.isArray(modifications) ? modifications : [];
}

function visualModificationChanges(before = [], after = []) {
  const beforeMap = new Map(before.map((modification, index) => [visualModificationKey(modification, index), modification]));
  const afterMap = new Map(after.map((modification, index) => [visualModificationKey(modification, index), modification]));
  const added = [];
  const changed = [];
  const removed = [];
  for (const [key, modification] of afterMap.entries()) {
    if (!beforeMap.has(key)) {
      added.push(visualModificationDiffItem("added", key, null, modification));
    } else if (JSON.stringify(beforeMap.get(key)) !== JSON.stringify(modification)) {
      changed.push(visualModificationDiffItem("changed", key, beforeMap.get(key), modification));
    }
  }
  for (const [key, modification] of beforeMap.entries()) {
    if (!afterMap.has(key)) removed.push(visualModificationDiffItem("removed", key, modification, null));
  }
  return {
    added,
    changed,
    removed,
    items: [...added, ...changed, ...removed]
  };
}

function visualModificationKey(modification = {}, index = 0) {
  return [
    modification.id,
    modification.type,
    modification.selector,
    modification.attribute || modification.property || modification.name || modification.target_selector,
    modification.position || modification.mode
  ].filter(Boolean).join("|") || `mod_${index}`;
}

function visualModificationDiffItem(change, key, before, after) {
  const modification = after || before || {};
  const warnings = visualModificationWarnings(modification);
  return {
    change,
    key,
    type: modification.type || "",
    selector: modification.selector || "",
    target_selector: modification.target_selector || "",
    field: modification.attribute || modification.property || modification.name || "",
    warnings,
    before: visualModificationPreview(before),
    after: visualModificationPreview(after)
  };
}

function visualModificationWarnings(modification = {}) {
  const warnings = [];
  const selector = String(modification.selector || "").trim();
  const targetSelector = String(modification.target_selector || "").trim();
  const type = String(modification.type || "").trim();
  if (!selector) {
    warnings.push("Missing selector");
  } else {
    if (isBroadVisualSelector(selector)) warnings.push("Broad selector");
    if (isBrittleVisualSelector(selector)) warnings.push("Brittle selector path");
    if (isBroadVisualSelector(selector) && !hasVisualUrlScope(modification)) warnings.push("Add URL targeting");
  }
  if (type === "move" && !targetSelector) warnings.push("Missing move target");
  if (targetSelector && isBroadVisualSelector(targetSelector)) warnings.push("Broad move target");
  return warnings;
}

function isBrittleVisualSelector(selector = "") {
  return /:nth-(child|of-type)\(/i.test(String(selector));
}

function hasVisualUrlScope(modification = {}) {
  const rules = modification.scope?.url_rules || modification.url_rules || [];
  return Array.isArray(rules) && rules.some((rule) => String(rule?.value || "").trim());
}

function visualModificationPreview(modification) {
  if (!modification) return "";
  if (typeof modification.value === "string") return modification.value.slice(0, 160);
  if (typeof modification.html === "string") return modification.html.replace(/\s+/g, " ").trim().slice(0, 160);
  if (modification.mode) return modification.mode;
  if (modification.position) return modification.position;
  return "";
}

function isDiffObject(value) {
  return value != null && typeof value === "object";
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function evaluateRequest(body) {
  if (!body.decision_key) badRequest("decision_key is required");
  if (!body.profile_key) badRequest("profile_key is required");
  if (!Array.isArray(body.identifiers)) badRequest("identifiers must be an array");

  const version = await storeCall("getVersion", body.decision_key, body.rule_version);
  const result = evaluateDecision({
    request: body,
    version,
    lookupTables: await storeCall("listLookupTables")
  });
  await storeCall("addAudit", {
    ...result,
    inputs: {
      identifiers_count: body.identifiers.length,
      attribute_keys: Object.keys(body.attributes || {}),
      segment_keys: Object.keys(body.segments || {}),
      context_keys: Object.keys(body.context || {})
    }
  });
  return result;
}

async function evaluateClientRequest(body) {
  const ruleSet = await storeCall("getRuleSet", body.decision_key);
  if (!ruleSet) notFoundError(`Rule set not found: ${body.decision_key}`);
  const version = await storeCall("getVersion", body.decision_key, body.rule_version);
  const baseRequest = {
    identifiers: [],
    attributes: {},
    segments: {},
    context: {},
    ...body
  };
  const hydrated = await hydrateClientProfile(baseRequest);
  const request = hydrated.request;
  const schemaItems = await storeCall("listSchemaItems");
  const adaptiveExperiment = isAdaptiveExperiment(ruleSet, version);
  const cached = adaptiveExperiment ? { hit: false, cache_key: null, skipped: true } : clientResultCache.get(request, ruleSet, version);
  if (!adaptiveExperiment && cached.hit) {
    const profileCache = profileCacheWithDiagnostics(hydrated.cache, baseRequest, request, schemaItems, cached.value.errors || []);
    return {
      ...cached.value,
      ttl_seconds: cached.ttl_seconds,
      cache: {
        hit: true,
        scope: ruleSet.cache_policy?.scope || "profile",
        expires_at: cached.expires_at
      },
      profile_cache: profileCache
    };
  }
  const evaluated = await evaluateDecisionAsync({
    request,
    version,
    lookupTables: await storeCall("listLookupTables"),
    clientEventCounter: (params) => storeCall("countClientEvents", params)
  });
  const assigned = assignExperimentVariant(ruleSet, request, evaluated);
  const messageResolved = await resolveMessageOutputs(
    assigned && !assigned.holdout ? { ...evaluated.outputs, ...(assigned.outputs || {}) } : evaluated.outputs,
    ruleSet,
    request,
    evaluated.evaluated_at
  );
  const finalOutputs = messageResolved.outputs;
  const finalResult = messageResolved.available === false && evaluated.result === "eligible" ? "suppressed" : evaluated.result;
  const finalErrors = [...evaluated.errors, ...messageResolved.errors];
  const profileCache = profileCacheWithDiagnostics(hydrated.cache, baseRequest, request, schemaItems, finalErrors);
  const ttlSeconds = Number(ruleSet.cache_policy?.client_ttl || 0);
  if (assigned && !assigned.holdout) {
    await storeCall("addExperimentAssignment", {
      assigned_at: evaluated.evaluated_at,
      decision_key: evaluated.decision_key,
      profile_key: evaluated.profile_key,
      rule_version: evaluated.rule_version,
      variant_key: assigned.key,
      strategy: assigned.strategy || "fixed",
      reason: assigned.reason || "",
      bucket: assigned.bucket,
      assignment: assigned.bandit ? { bandit: assigned.bandit } : {}
    });
  } else if (assigned?.holdout) {
    await storeCall("addExperimentAssignment", {
      assigned_at: evaluated.evaluated_at,
      decision_key: evaluated.decision_key,
      profile_key: evaluated.profile_key,
      rule_version: evaluated.rule_version,
      variant_key: "",
      strategy: "holdout",
      reason: assigned.reason || "forced_holdout",
      bucket: null,
      assignment: {}
    });
  }
  await storeCall("addAudit", {
    ...evaluated,
    result: finalResult,
    outputs: finalOutputs,
    errors: finalErrors,
    experiment: assigned ? auditExperimentAssignment(assigned) : undefined,
    inputs: {
      identifiers_count: Array.isArray(request.identifiers) ? request.identifiers.length : 0,
      attribute_keys: Object.keys(request.attributes || {}),
      segment_keys: Object.keys(request.segments || {}),
      context_keys: Object.keys(request.context || {}),
      request_source: request.context?.request_source || "client",
      surface: request.context?.surface || request.surface || ruleSet.surface || "",
      sync_id: request.context?.sync_id || "",
      profile_enrichment: hydrated.cache?.status || "not_used"
    }
  });
  const response = {
    decision_key: evaluated.decision_key,
    profile_key: evaluated.profile_key,
    result: finalResult,
    outputs: finalOutputs,
    rule_version: evaluated.rule_version,
    ttl_seconds: Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 0,
    cache_scope: ruleSet.cache_policy?.scope || null,
    cache: {
      hit: false,
      scope: ruleSet.cache_policy?.scope || null,
      expires_at: null
    },
    profile_cache: profileCache,
    experiment: assigned ? clientExperimentAssignment(assigned) : null,
    delivery: clientDeliverySettings(ruleSet, evaluated),
    matched_rules: evaluated.matched_rules,
    errors: finalErrors
  };
  response.cache.expires_at = response.errors.length || adaptiveExperiment ? null : clientResultCache.set(cached.cache_key, response, ruleSet);
  if (adaptiveExperiment) {
    response.cache.scope = null;
    response.cache.reason = "adaptive_experiment_not_cached";
  }
  return response;
}

async function hydrateClientProfile(request) {
  const settings = await storeCall("getSettings");
  const mode = request.context?.profile_enrichment ?? request.context?.enrich_profile;
  const hasLocalPayload = hasProfilePayload(request);
  if (mode === false || mode === "off") {
    return { request, cache: { status: "disabled", hit: false } };
  }
  if (hasLocalPayload && mode !== true && mode !== "always") {
    return { request, cache: { status: "local_payload", hit: false } };
  }
  const endpoint = String(settings.meiro_api_url || "").trim();
  const token = String(settings.meiro_api_token || "").trim();
  const identifier = selectProfileIdentifier(request, settings);
  if (!endpoint || !token || !identifier) {
    return {
      request,
      cache: {
        status: "not_configured",
        hit: false,
        reason: !endpoint || !token ? "Profile API URL/token not configured" : "No identifier available for Profile API lookup"
      }
    };
  }

  const ttlSeconds = Number(settings.meiro_profile_cache_ttl_seconds || 0);
  const cacheKey = profileCacheKey({
    profile_key: request.profile_key,
    identifiers: [{ typeId: identifier.type, value: identifier.value }]
  });
  const cached = meiroProfileCache.get(cacheKey, ttlSeconds);
  if (cached.hit) {
    return {
      request: mergeProfileIntoRequest(request, cached.value),
      cache: {
        status: "hit",
        hit: true,
        ttl_seconds: cached.ttl_seconds,
        expires_at: cached.expires_at,
        identifier_type: identifier.type
      }
    };
  }

  try {
    const profile = await fetchMeiroProfile(endpoint, token, identifier);
    const normalized = normalizeProfileForEvaluation(profile);
    const expiresAt = meiroProfileCache.set(cacheKey, normalized, ttlSeconds);
    return {
      request: mergeProfileIntoRequest(request, normalized),
      cache: {
        status: "miss",
        hit: false,
        ttl_seconds: Math.max(0, Math.floor(ttlSeconds)),
        expires_at: expiresAt,
        identifier_type: identifier.type,
        profile_shape: Object.keys(profile || {}).slice(0, 20)
      }
    };
  } catch (error) {
    if (isProfileNotFoundError(error)) {
      meiroProfileCache.recordNotFound();
      return {
        request,
        cache: {
          status: "not_found",
          hit: false,
          identifier_type: identifier.type,
          reason: profileApiDiagnosticMessage(error)
        }
      };
    }
    meiroProfileCache.recordError();
    return {
      request,
      cache: {
        status: "error",
        hit: false,
        identifier_type: identifier.type,
        error: error.message
      }
    };
  }
}

function createClientEventCounter() {
  return (params) => {
    if (typeof store.countClientEvents !== "function") {
      throw new Error("Store adapter does not support countClientEvents");
    }
    const count = store.countClientEvents(params);
    if (count && typeof count.then === "function") {
      throw new Error("Async client event counters require the async evaluator path");
    }
    return count;
  };
}

function hasProfilePayload(request) {
  return Boolean(
    Object.keys(request.attributes || {}).length ||
    Object.keys(request.segments || {}).length
  );
}

function selectProfileIdentifier(request, settings = {}) {
  const contextType = request.context?.identifier_type || request.context?.identifierType;
  const contextValue = request.context?.identifier_value || request.context?.identifierValue;
  if (contextType && contextValue) return { type: String(contextType), value: String(contextValue) };
  for (const identifier of request.identifiers || []) {
    const type = identifier.typeId || identifier.type || identifier.identifierTypeId || identifier.id;
    const value = identifier.value || identifier.identifierValue;
    if (type && value) return { type: String(type), value: String(value) };
  }
  if (settings.schema_sync_identifier_type && request.profile_key) {
    return { type: String(settings.schema_sync_identifier_type), value: String(request.profile_key) };
  }
  return null;
}

async function fetchMeiroProfile(endpoint, token, identifier) {
  const url = meiroProfileUrl(endpoint, identifier);
  const response = await fetchWithTimeout(url, {
    headers: {
      "x-api-token": token,
      authorization: `Bearer ${token}`,
      accept: "application/json"
    }
  });
  const rawText = await response.text();
  let profile = {};
  try {
    profile = rawText ? JSON.parse(rawText) : {};
  } catch {
    badRequest("Meiro Profile API returned non-JSON response");
  }
  if (!response.ok) {
    const error = new Error(profile.message || profile.error || `Meiro Profile API returned ${response.status}`);
    error.statusCode = response.status;
    error.code = "meiro_profile_api_error";
    throw error;
  }
  return profile;
}

function isProfileNotFoundError(error = {}) {
  const status = Number(error.statusCode || error.status || 0);
  return status === 404;
}

function meiroProfileUrl(endpoint, identifier) {
  const url = new URL(endpoint);
  url.searchParams.set("identifier_type", identifier.type);
  url.searchParams.set("identifier_value", identifier.value);
  return url;
}

function profileEndpointBase(endpoint) {
  const url = new URL(endpoint);
  return url.origin + url.pathname;
}

function profileApiDiagnosticMessage(error = {}) {
  const status = Number(error.statusCode || error.status || 0);
  if (status === 401 || status === 403) return "Profile API rejected the Profile API token. Paste the mppak token in Meiro endpoints; the CLI/shared API token is separate.";
  if (status === 404) return "No Meiro profile found for this identifier";
  return error.message || "Profile API returned an error";
}

function normalizeProfileForEvaluation(profile = {}) {
  return {
    profile_key: profile.profile_key || profile.profileKey || profile.id || profile.profile?.profileKey || profile.data?.profileKey || "",
    identifiers: normalizeProfileIdentifiers(profile),
    attributes: readProfileObject(profile, ["attributes", "profile.attributes", "data.attributes", "payload.attributes"]),
    segments: readProfileObject(profile, ["segments", "audiences", "profile.segments", "profile.audiences", "data.segments", "data.audiences"]),
    context: readProfileObject(profile, ["context", "profile.context", "data.context"])
  };
}

function normalizeProfileIdentifiers(profile = {}) {
  const identifiers = profile.identifiers || profile.profile?.identifiers || profile.data?.identifiers || [];
  if (!Array.isArray(identifiers)) return [];
  return identifiers
    .map((identifier) => ({
      typeId: identifier.typeId || identifier.type || identifier.identifierTypeId || identifier.id || "",
      value: identifier.value || identifier.identifierValue || ""
    }))
    .filter((identifier) => identifier.typeId && identifier.value);
}

function mergeProfileIntoRequest(request, profile) {
  return {
    ...request,
    profile_key: request.profile_key || profile.profile_key || "",
    identifiers: mergeIdentifiers(profile.identifiers, request.identifiers),
    attributes: { ...(profile.attributes || {}), ...(request.attributes || {}) },
    segments: { ...(profile.segments || {}), ...(request.segments || {}) },
    context: { ...(profile.context || {}), ...(request.context || {}) }
  };
}

function mergeIdentifiers(...sets) {
  const seen = new Set();
  return sets.flatMap((items) => Array.isArray(items) ? items : []).filter((identifier) => {
    const type = identifier.typeId || identifier.type || identifier.identifierTypeId || identifier.id || "";
    const value = identifier.value || identifier.identifierValue || "";
    const key = `${type}:${value}`;
    if (!type || !value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function clientDeliverySettings(ruleSet = {}, evaluated = {}) {
  const experiment = evaluated.version_metadata?.experiment || ruleSet.metadata?.experiment || {};
  return {
    display: experiment.display || null,
    targeting: experiment.targeting || null,
    trigger: experiment.trigger || null,
    consent: experiment.consent || null,
    goal: experiment.goal || null
  };
}

async function resolveMessageOutputs(outputs, ruleSet, request, evaluatedAt) {
  const messageId = outputs.message_id || outputs.messageId || outputs.message?.id;
  if (!messageId) return { outputs, available: null, errors: [] };
  const message = await storeCall("getMessage", String(messageId));
  if (!message) {
    return unavailableMessage(outputs, "message_not_found", `Message not found: ${messageId}`);
  }
  const availability = await messageAvailability(message, ruleSet, request, evaluatedAt);
  if (!availability.available) {
    return unavailableMessage(outputs, availability.reason, availability.message, message);
  }
  return {
    outputs: attachMessage(outputs, message, availability),
    available: true,
    errors: []
  };
}

function attachMessage(outputs, message, availability) {
  const delivery = messageDeliverySettings(message);
  return {
    ...outputs,
    message: {
      id: message.id,
      name: message.name,
      surface: message.surface,
      content: {
        ...message.default_content,
        ...(outputs.message_content && typeof outputs.message_content === "object" ? outputs.message_content : {})
      },
      metadata: message.metadata,
      delivery,
      availability
    },
    delivery: {
      ...(outputs.delivery && typeof outputs.delivery === "object" ? outputs.delivery : {}),
      message: delivery
    }
  };
}

function unavailableMessage(outputs, reason, message, messageRecord = null) {
  return {
    outputs: {
      ...outputs,
      suppression_reason: outputs.suppression_reason || reason,
      message: messageRecord ? {
        id: messageRecord.id,
        name: messageRecord.name,
        surface: messageRecord.surface,
        availability: { available: false, reason, message }
      } : undefined
    },
    available: false,
    errors: [message]
  };
}

async function messageAvailability(message, ruleSet, request, evaluatedAt) {
  const lifecycle = message.metadata?.lifecycle || message.metadata?.delivery || {};
  const delivery = messageDeliverySettings(message);
  const nowMs = Date.parse(evaluatedAt || createdAtIso());
  if (message.status !== "active") {
    return { available: false, reason: "message_inactive", message: `Message ${message.id} is ${message.status}` };
  }
  if (message.surface && ruleSet.surface && !messageSurfaceCompatible(message.surface, ruleSet.surface)) {
    return { available: false, reason: "surface_mismatch", message: `Message ${message.id} is for surface ${message.surface}` };
  }
  const startsAt = lifecycle.starts_at || message.metadata?.starts_at;
  const expiresAt = lifecycle.expires_at || message.metadata?.expires_at;
  const startsAtMs = startsAt ? Date.parse(startsAt) : null;
  const expiresAtMs = expiresAt ? Date.parse(expiresAt) : null;
  if (startsAt && Number.isNaN(startsAtMs)) {
    return { available: false, reason: "message_invalid_lifecycle", message: `Message ${message.id} has an invalid starts_at value` };
  }
  if (expiresAt && Number.isNaN(expiresAtMs)) {
    return { available: false, reason: "message_invalid_lifecycle", message: `Message ${message.id} has an invalid expires_at value` };
  }
  if (startsAt && startsAtMs > nowMs) {
    return { available: false, reason: "message_not_started", message: `Message ${message.id} starts at ${startsAt}` };
  }
  if (expiresAt && expiresAtMs <= nowMs) {
    return { available: false, reason: "message_expired", message: `Message ${message.id} expired at ${expiresAt}` };
  }
  const ttlSeconds = Number(delivery.frequency.cooldown_seconds || lifecycle.ttl_seconds || message.metadata?.ttl_seconds || 0);
  const maxImpressions = Number(delivery.frequency.max_impressions || 0);
  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
    const since = new Date(nowMs - ttlSeconds * 1000).toISOString();
    const impressions = await storeCall("countClientEvents", {
      event_type: "impression",
      decision_key: ruleSet.decision_key,
      profile_key: request.profile_key,
      message_id: message.id,
      surface: message.surface || ruleSet.surface || "",
      since
    });
    if (impressions > 0) {
      return {
        available: false,
        reason: "message_frequency_cap",
        message: `Message ${message.id} is cooling down for this profile`,
        ttl_seconds: ttlSeconds,
        impressions
      };
    }
  }
  if (Number.isFinite(maxImpressions) && maxImpressions > 0) {
    const impressions = await storeCall("countClientEvents", {
      event_type: "impression",
      decision_key: ruleSet.decision_key,
      profile_key: request.profile_key,
      message_id: message.id,
      surface: message.surface || ruleSet.surface || ""
    });
    if (impressions >= maxImpressions) {
      return {
        available: false,
        reason: "message_max_impressions",
        message: `Message ${message.id} reached max impressions for this profile`,
        max_impressions: maxImpressions,
        impressions
      };
    }
  }
  return {
    available: true,
    reason: "available",
    starts_at: startsAt || "",
    expires_at: expiresAt || "",
    ttl_seconds: Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 0,
    max_impressions: Number.isFinite(maxImpressions) && maxImpressions > 0 ? maxImpressions : 0,
    priority: Number(message.metadata?.priority ?? lifecycle.priority ?? 0) || 0,
    delivery
  };
}

function messageDeliverySettings(message = {}) {
  const metadata = message.metadata || {};
  const lifecycle = metadata.lifecycle || {};
  const delivery = metadata.delivery || {};
  const displayMode = normalizedMessageDisplayMode(delivery.display?.mode || lifecycle.display_mode || metadata.display_mode || "always");
  const cooldownSeconds = Number(delivery.frequency?.cooldown_seconds ?? lifecycle.ttl_seconds ?? metadata.ttl_seconds ?? 0);
  const maxImpressions = Number(delivery.frequency?.max_impressions ?? lifecycle.max_impressions ?? metadata.max_impressions ?? 0);
  const device = normalizedMessageDevice(delivery.targeting?.devices || delivery.targeting?.device || metadata.target_devices || "any");
  const triggerType = normalizedMessageTrigger(delivery.trigger?.type || lifecycle.trigger_type || "page_load");
  const consentCategory = String(delivery.consent?.category || metadata.consent_category || "").trim();
  const dismissBehavior = normalizedMessageDismiss(delivery.dismiss?.behavior || lifecycle.dismiss_behavior || "suppress");
  return {
    display: {
      mode: displayMode
    },
    frequency: {
      cooldown_seconds: Number.isFinite(cooldownSeconds) && cooldownSeconds > 0 ? cooldownSeconds : 0,
      max_impressions: Number.isFinite(maxImpressions) && maxImpressions > 0 ? maxImpressions : 0
    },
    targeting: {
      devices: device
    },
    trigger: {
      type: triggerType
    },
    consent: consentCategory ? { category: consentCategory, required: delivery.consent?.required !== false } : null,
    dismiss: {
      behavior: dismissBehavior
    }
  };
}

function normalizedMessageDisplayMode(value) {
  return ["always", "once", "once_per_session", "once_per_day", "once_per_week"].includes(value) ? value : "always";
}

function normalizedMessageDevice(value) {
  if (Array.isArray(value)) return normalizedMessageDevice(value[0] || "any");
  return ["any", "desktop", "mobile", "tablet"].includes(value) ? value : "any";
}

function normalizedMessageTrigger(value) {
  return ["page_load", "manual", "custom_event", "data_layer_event", "exit_intent", "scroll_depth"].includes(value) ? value : "page_load";
}

function normalizedMessageDismiss(value) {
  return ["suppress", "cooldown", "ignore"].includes(value) ? value : "suppress";
}

function messageSurfaceCompatible(messageSurface, ruleSurface) {
  const messageValue = String(messageSurface || "").trim();
  const ruleValue = String(ruleSurface || "").trim();
  if (!messageValue || !ruleValue) return true;
  if (messageValue === ruleValue) return true;
  return ruleValue === `${messageValue}_message`;
}

async function evaluateClientSurface(body, auth) {
  const plan = surfaceEvaluationPlan(body, auth);
  const ruleSets = plan.rule_sets;

  const candidates = [];
  let selected = null;
  for (const ruleSetSummary of ruleSets) {
    const result = await evaluateClientRequest({
      ...body,
      decision_key: ruleSetSummary.decision_key,
      context: {
        ...(body.context || {}),
        surface: body.surface
      }
    });
    const candidate = {
      decision_key: result.decision_key,
      priority: ruleSetSummary.priority,
      result: result.result,
      message_id: result.outputs?.message_id || result.outputs?.message?.id || "",
      matched_rules: result.matched_rules,
      cache: result.cache,
      profile_cache: result.profile_cache
    };
    candidates.push(candidate);
    if (!selected && result.result === "eligible") {
      selected = {
        ...result,
        priority: ruleSetSummary.priority,
        surface: ruleSetSummary.surface
      };
    }
  }

  return {
    surface: body.surface,
    profile_key: body.profile_key,
    selected,
    candidates,
    diagnostics: plan.diagnostics
  };
}

async function evaluateClientSurfaceBatch(req, body) {
  const startedAt = new Date().toISOString();
  const batchPlan = surfaceEvaluationPlan(body, req.auth);
  const results = [];
  let eligible = 0;
  let suppressed = 0;
  let errors = 0;
  for (const profile of body.profiles) {
    const request = {
      ...profile,
      surface: body.surface,
      limit: profile.limit ?? body.limit,
      context: {
        ...(body.context || {}),
        ...(profile.context || {}),
        surface: body.surface,
        request_source: profile.context?.request_source || body.context?.request_source || "meiro_pipes_inapp_precompute"
      }
    };
    try {
      enforceClientTokenContext(req, request);
      const result = await evaluateClientSurface(request, req.auth);
      results.push(result);
      if (result.selected?.result === "eligible") eligible += 1;
      else suppressed += 1;
    } catch (error) {
      errors += 1;
      results.push({
        surface: body.surface,
        profile_key: profile.profile_key,
        selected: null,
        candidates: [],
        error: {
          code: error.code || "evaluation_error",
          message: error.message || "Evaluation failed"
        }
      });
    }
  }
  const candidateEvaluations = results.reduce((sum, result) => sum + (Array.isArray(result.candidates) ? result.candidates.length : 0), 0);
  store.addPrecomputeRun({
    received_at: startedAt,
    source: body.context?.request_source || "meiro_pipes_inapp_precompute",
    surface: body.surface,
    sync_id: body.context?.sync_id || "",
    profile_count: results.length,
    candidate_evaluations: candidateEvaluations,
    eligible_count: eligible,
    not_selected_count: suppressed,
    error_count: errors,
    metadata: { diagnostics: batchPlan.diagnostics }
  });

  return {
    surface: body.surface,
    evaluated_at: startedAt,
    count: results.length,
    summary: {
      eligible,
      not_selected: suppressed,
      errors,
      candidate_evaluations: candidateEvaluations
    },
    diagnostics: batchPlan.diagnostics,
    results
  };
}

function surfaceEvaluationPlan(body = {}, auth = {}) {
  const limit = Math.min(Number(body.limit || 20), 50);
  const allPublishedInApp = store
    .listRuleSets()
    .filter((ruleSet) => ruleSet.type === "inapp_message" && ruleSet.status === "published");
  const allowed = allPublishedInApp.filter((ruleSet) => !auth.decision_keys?.length || auth.decision_keys.includes(ruleSet.decision_key));
  const matchingBeforeLimit = allowed
    .filter((ruleSet) => ruleSet.surface === body.surface)
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || a.decision_key.localeCompare(b.decision_key));
  const blockedByToken = allPublishedInApp.filter((ruleSet) => ruleSet.surface === body.surface && !allowed.includes(ruleSet));
  const ruleSets = matchingBeforeLimit.slice(0, limit);
  const diagnostics = {
    requested_surface: body.surface || "",
    limit,
    published_inapp_rules: allPublishedInApp.length,
    allowed_inapp_rules: allowed.length,
    matched_rule_count: matchingBeforeLimit.length,
    evaluated_rule_count: ruleSets.length,
    matched_rules: ruleSets.map(surfaceRuleDiagnostic),
    available_surfaces: surfaceDiagnostics(allowed),
    token_filtered_rule_count: blockedByToken.length,
    no_candidate_reason: surfaceNoCandidateReason({ allPublishedInApp, allowed, matchingBeforeLimit, blockedByToken, surface: body.surface })
  };
  return { rule_sets: ruleSets, diagnostics };
}

function surfaceRuleDiagnostic(ruleSet) {
  return {
    decision_key: ruleSet.decision_key,
    name: ruleSet.name,
    priority: Number(ruleSet.priority || 0),
    surface: ruleSet.surface || "",
    status: ruleSet.status
  };
}

function surfaceDiagnostics(ruleSets = []) {
  const counts = new Map();
  for (const ruleSet of ruleSets) {
    const surface = ruleSet.surface || "(empty)";
    counts.set(surface, (counts.get(surface) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([surface, count]) => ({ surface, count }))
    .sort((left, right) => right.count - left.count || left.surface.localeCompare(right.surface))
    .slice(0, 12);
}

function surfaceNoCandidateReason({ allPublishedInApp, allowed, matchingBeforeLimit, blockedByToken, surface }) {
  if (matchingBeforeLimit.length) return "";
  if (!allPublishedInApp.length) return "no_published_inapp_rules";
  if (!allowed.length) return "client_token_filters_all_inapp_rules";
  if (blockedByToken.length) return "client_token_filters_requested_surface";
  if (surface) return "no_published_inapp_rules_for_surface";
  return "surface_required";
}

function clientEventFromRequest(eventType, body, req) {
  return {
    event_type: eventType,
    event_id: body.event_id || idempotencyKey(req),
    occurred_at: body.occurred_at ? new Date(body.occurred_at).toISOString() : createdAtIso(),
    decision_key: body.decision_key,
    profile_key: body.profile_key,
    rule_version: body.rule_version ?? null,
    variant_key: body.variant_key || "",
    message_id: body.message_id || "",
    surface: body.surface || "",
    context: body.context || {},
    event: body.event || {}
  };
}

function clientRuleCatalog(auth) {
  return store
    .listRuleSets()
    .filter((ruleSet) =>
      ruleSet.status === "published" &&
      (!auth.decision_keys?.length || auth.decision_keys.includes(ruleSet.decision_key))
    )
    .map((ruleSet) => {
      const fullRuleSet = store.getRuleSet(ruleSet.decision_key);
      const latest = fullRuleSet?.versions?.at(-1);
      const definition = latest?.definition || fullRuleSet?.draft || {};
      return {
        name: ruleSet.name,
        decision_key: ruleSet.decision_key,
        description: ruleSet.description,
        type: ruleSet.type,
        priority: ruleSet.priority,
        surface: ruleSet.surface,
        version: ruleSet.version,
        cache_policy: ruleSet.cache_policy,
        tags: ruleSet.tags,
        inputs: inferClientCatalogInputs(fullRuleSet?.input_schema || ruleSet.input_schema || {}, definition)
      };
    });
}

function inferClientCatalogInputs(inputSchema = {}, definition = {}) {
  const fields = new Map();
  addCatalogSchemaInputs(fields, inputSchema);
  addCatalogDefinitionInputs(fields, definition);
  return [...fields.values()].sort((a, b) =>
    catalogSourceOrder(a.source) - catalogSourceOrder(b.source) ||
    a.key.localeCompare(b.key)
  );
}

function addCatalogSchemaInputs(fields, schema = {}) {
  for (const [key, meta] of Object.entries(schema.attributes || schema.properties || {})) {
    addCatalogInput(fields, {
      source: "attribute",
      key,
      type: catalogMetaType(meta, key),
      required: true,
      default: catalogDefaultValue(key, catalogMetaType(meta, key))
    });
  }
  for (const [key, meta] of Object.entries(schema.context || {})) {
    addCatalogInput(fields, {
      source: "context",
      key,
      type: catalogMetaType(meta, key),
      required: false,
      default: catalogDefaultValue(key, catalogMetaType(meta, key))
    });
  }
  for (const [key, meta] of Object.entries(schema.segments || {})) {
    addCatalogInput(fields, {
      source: "segment",
      key,
      type: catalogMetaType(meta, key, "boolean"),
      required: false,
      default: false
    });
  }
}

function addCatalogDefinitionInputs(fields, value) {
  if (Array.isArray(value)) {
    value.forEach((item) => addCatalogDefinitionInputs(fields, item));
    return;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string") addCatalogExpressionInputs(fields, value);
    return;
  }
  if (["attribute", "segment", "context"].includes(value.source) && value.key) {
    const type = catalogTypeForKey(value.key, value.value, value.source === "segment" ? "boolean" : "string");
    addCatalogInput(fields, {
      source: value.source,
      key: value.key,
      type,
      required: true,
      default: catalogDefaultValue(value.key, type)
    });
  }
  Object.values(value).forEach((item) => addCatalogDefinitionInputs(fields, item));
}

function addCatalogExpressionInputs(fields, expression) {
  for (const { source, regex } of [
    { source: "attribute", regex: /attribute\(["']([^"']+)["']\)/g },
    { source: "context", regex: /context\(["']([^"']+)["']\)/g },
    { source: "segment", regex: /segment\(["']([^"']+)["']\)/g }
  ]) {
    let match;
    while ((match = regex.exec(expression))) {
      const key = match[1];
      const type = catalogTypeForKey(key, undefined, source === "segment" ? "boolean" : "string");
      addCatalogInput(fields, {
        source,
        key,
        type,
        required: true,
        default: catalogDefaultValue(key, type)
      });
    }
  }
}

function addCatalogInput(fields, input) {
  const id = `${input.source}:${input.key}`;
  if (!fields.has(id)) {
    fields.set(id, input);
    return;
  }
  const existing = fields.get(id);
  existing.required = Boolean(existing.required || input.required);
  if (!existing.default && input.default != null) existing.default = input.default;
}

function catalogMetaType(meta, key, fallback = "string") {
  if (typeof meta === "string") return catalogNormalizeType(meta, key, fallback);
  return catalogNormalizeType(meta?.type, key, fallback);
}

function catalogNormalizeType(type, key, fallback = "string") {
  if (["number", "integer"].includes(type)) return "number";
  if (type === "boolean") return "boolean";
  if (type === "array") return "array";
  return catalogTypeForKey(key, undefined, fallback);
}

function catalogTypeForKey(key, sampleValue, fallback = "string") {
  if (typeof sampleValue === "number") return "number";
  if (typeof sampleValue === "boolean") return "boolean";
  if (Array.isArray(sampleValue)) return "array";
  if (/(score|count|value|rfm|payments|balance|lifetime)/i.test(key)) return "number";
  if (/(promotions|list|ids)$/i.test(key)) return "array";
  return fallback;
}

function catalogDefaultValue(key, type) {
  const defaults = {
    lead_score: 85,
    web_engagement_score: 80,
    churn_risk_score: 15,
    outstanding_balance_tier: "low",
    late_payments_count_12m: 0,
    interacted_promotions: [],
    customer_lifetime_value: 12500,
    monetary_rfm: 4,
    sustainability_score: 85,
    survey_nps_latest: 8,
    channel: "web",
    request_source: "meiro_web_banner"
  };
  if (key in defaults) return defaults[key];
  if (type === "number") return 0;
  if (type === "boolean") return false;
  if (type === "array") return [];
  return "";
}

function catalogSourceOrder(source) {
  return { attribute: 1, segment: 2, context: 3 }[source] || 9;
}

function idempotencyKey(req) {
  const value = req.headers["idempotency-key"];
  return Array.isArray(value) ? value[0] : value;
}

function enforceAllowedDecision(req, decisionKey) {
  if (req.auth.decision_keys?.length && !req.auth.decision_keys.includes(decisionKey)) {
    const error = new Error(`Client token is not allowed to evaluate: ${decisionKey}`);
    error.statusCode = 403;
    error.code = "forbidden";
    throw error;
  }
}

function enforceClientTokenContext(req, body = {}) {
  const metadata = req.auth?.metadata || {};
  req.client_context = {
    origin: req.headers.origin || "",
    environment: clientContextValue(req, body, ["environment", "environment_label", "env"]),
    app_id: clientContextValue(req, body, ["app_id", "application_id", "app"])
  };
  const allowedOrigins = Array.isArray(metadata.allowed_origins) ? metadata.allowed_origins : [];
  const requestOrigin = req.headers.origin || "";
  if (allowedOrigins.length && !originAllowed(requestOrigin, allowedOrigins)) {
    forbidden(`Client token is not allowed from origin: ${requestOrigin || "server"}`);
  }
  const expectedEnvironment = String(metadata.environment || "").trim();
  if (expectedEnvironment) {
    const requestEnvironment = req.client_context.environment;
    if (requestEnvironment !== expectedEnvironment) forbidden(`Client token is scoped to environment: ${expectedEnvironment}`);
  }
  const expectedAppId = String(metadata.app_id || "").trim();
  if (expectedAppId) {
    const requestAppId = req.client_context.app_id;
    if (requestAppId !== expectedAppId) forbidden(`Client token is scoped to app: ${expectedAppId}`);
  }
}

function originAllowed(origin, allowedOrigins) {
  if (allowedOrigins.includes("*")) return true;
  if (!origin) return false;
  return allowedOrigins.some((allowed) => {
    if (allowed === origin) return true;
    if (allowed.startsWith("*.")) {
      try {
        const hostname = new URL(origin).hostname;
        const suffix = allowed.slice(1);
        return hostname.endsWith(suffix);
      } catch {
        return false;
      }
    }
    return false;
  });
}

function clientContextValue(req, body, keys) {
  const context = body?.context || {};
  for (const key of keys) {
    const value = context[key] ?? body?.[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  const headers = {
    environment: req.headers["x-dee-environment"],
    environment_label: req.headers["x-dee-environment"],
    env: req.headers["x-dee-env"],
    app_id: req.headers["x-dee-app-id"],
    application_id: req.headers["x-dee-app-id"],
    app: req.headers["x-dee-app"]
  };
  for (const key of keys) {
    const value = headers[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function assignExperimentVariant(ruleSet, request, evaluated) {
  if (ruleSet.type !== "experiment") return null;
  if (["ineligible", "suppressed"].includes(evaluated.result)) return null;
  const experiment = evaluated.version_metadata?.experiment || ruleSet.metadata?.experiment || {};
  if (experiment.status && experiment.status !== "running") return null;
  const variants = Array.isArray(experiment.variants) ? experiment.variants : [];
  if (!variants.length) return null;
  if (isForcedHoldout(request, ruleSet.decision_key)) return { holdout: true, bucket: null, reason: "forced_holdout" };
  const forced = request.context?.force_variant || request.context?.forced_variants?.[ruleSet.decision_key];
  if (forced) {
    const variant = variants.find((item) => item.key === forced);
    if (variant) return { ...variant, bucket: null };
  }
  if (experimentMode(experiment) === "bandit") {
    const adaptive = adaptiveBanditVariant(ruleSet, request, experiment, variants);
    if (adaptive) return adaptive;
  }
  return fixedWeightVariant(ruleSet, request, experiment, variants);
}

function fixedWeightVariant(ruleSet, request, experiment, variants) {
  const unit = experiment.unit === "identifier" ? firstIdentifierValue(request) : request.profile_key;
  const bucket = bucketFor(`${ruleSet.decision_key}:${unit || request.profile_key}`);
  let cursor = 0;
  for (const variant of variants) {
    cursor += Number(variant.weight || 0);
    if (bucket < cursor) return { ...variant, bucket, strategy: "fixed" };
  }
  return { ...variants.at(-1), bucket, strategy: "fixed" };
}

function adaptiveBanditVariant(ruleSet, request, experiment, variants) {
  const bandit = experiment.bandit || {};
  const frozen = bandit.freeze_variant || experiment.freeze_variant;
  if (frozen) {
    const variant = variants.find((item) => item.key === frozen);
    if (variant) return { ...variant, bucket: null, strategy: "bandit", reason: "frozen_winner" };
  }

  const minExposures = integerInRange(bandit.min_exposures_per_variant, 100, 0, 1000000);
  const stats = variants.map((variant) => banditVariantStats(ruleSet, variant, bandit));
  const underSampled = stats.filter((item) => item.exposures < minExposures);
  if (underSampled.length) {
    const selected = leastExposedVariant(underSampled);
    return {
      ...selected.variant,
      bucket: null,
      strategy: "bandit",
      reason: "minimum_sample",
      bandit: banditAssignmentSummary(selected, stats, bandit)
    };
  }

  const unit = experiment.unit === "identifier" ? firstIdentifierValue(request) : request.profile_key;
  const explorationRate = percentInRange(bandit.exploration_rate, 10);
  const explorationBucket = bucketFor(`${ruleSet.decision_key}:${unit || request.profile_key}:bandit_explore`);
  if (explorationBucket < explorationRate) {
    const selected = fixedWeightVariant(ruleSet, request, experiment, variants);
    const stat = stats.find((item) => item.key === selected.key) || banditVariantStats(ruleSet, selected, bandit);
    return {
      ...selected,
      strategy: "bandit",
      reason: "exploration",
      bandit: banditAssignmentSummary(stat, stats, bandit)
    };
  }

  const selected = winnerBanditVariant(stats);
  return {
    ...selected.variant,
    bucket: null,
    strategy: "bandit",
    reason: "exploitation",
    bandit: banditAssignmentSummary(selected, stats, bandit)
  };
}

function banditVariantStats(ruleSet, variant, bandit = {}) {
  const since = bandit.window_days ? daysAgoIso(Number(bandit.window_days)) : "";
  const base = {
    decision_key: ruleSet.decision_key,
    variant_key: variant.key
  };
  if (since) base.since = since;
  const exposures = store.countClientEvents({ ...base, event_type: "exposure" });
  const conversions = store.countClientEvents({ ...base, event_type: "conversion" });
  return {
    key: variant.key,
    variant,
    exposures,
    conversions,
    conversion_rate: exposures > 0 ? conversions / exposures : 0
  };
}

function leastExposedVariant(stats) {
  return [...stats].sort((left, right) =>
    Number(left.exposures || 0) - Number(right.exposures || 0) ||
    String(left.key).localeCompare(String(right.key))
  )[0];
}

function winnerBanditVariant(stats) {
  return [...stats].sort((left, right) =>
    Number(right.conversion_rate || 0) - Number(left.conversion_rate || 0) ||
    Number(right.conversions || 0) - Number(left.conversions || 0) ||
    Number(left.exposures || 0) - Number(right.exposures || 0) ||
    String(left.key).localeCompare(String(right.key))
  )[0];
}

function banditAssignmentSummary(selected, stats, bandit = {}) {
  return {
    selected_variant: selected.key,
    selected_exposures: selected.exposures,
    selected_conversions: selected.conversions,
    selected_conversion_rate: selected.conversion_rate,
    exploration_rate: percentInRange(bandit.exploration_rate, 10),
    min_exposures_per_variant: integerInRange(bandit.min_exposures_per_variant, 100, 0, 1000000),
    window_days: bandit.window_days ? Number(bandit.window_days) : null,
    variants: stats.map((item) => ({
      key: item.key,
      exposures: item.exposures,
      conversions: item.conversions,
      conversion_rate: item.conversion_rate
    }))
  };
}

function isAdaptiveExperiment(ruleSet, version = {}) {
  const experiment = version.metadata?.experiment || ruleSet.metadata?.experiment || {};
  return experimentMode(experiment) === "bandit";
}

function experimentMode(experiment = {}) {
  if (experiment.mode === "bandit" || experiment.assignment_mode === "bandit" || experiment.bandit?.enabled === true) return "bandit";
  return "fixed";
}

function percentInRange(value, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(100, Math.max(0, number));
}

function integerInRange(value, fallback, min, max) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function daysAgoIso(days) {
  return new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString();
}

function isForcedHoldout(request, decisionKey) {
  const value = request.context?.force_holdout ?? request.context?.holdout ?? request.context?.forced_holdouts?.[decisionKey];
  return value === true || value === "true" || value === 1 || value === "1";
}

function auditExperimentAssignment(assigned) {
  if (assigned.holdout) return { holdout: true, reason: assigned.reason || "holdout" };
  return {
    key: assigned.key,
    bucket: assigned.bucket,
    strategy: assigned.strategy || "fixed",
    reason: assigned.reason || "",
    bandit: assigned.bandit || null
  };
}

function clientExperimentAssignment(assigned) {
  if (assigned.holdout) return { variant_key: null, bucket: null, holdout: true, reason: assigned.reason || "holdout" };
  return {
    variant_key: assigned.key,
    bucket: assigned.bucket,
    holdout: false,
    strategy: assigned.strategy || "fixed",
    reason: assigned.reason || "",
    bandit: assigned.bandit || null
  };
}

function validateAssistantPlan(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) badRequest("Assistant plan must be an object");
  if (plan.mode === "advice") {
    if (!Array.isArray(plan.actions)) plan.actions = [];
    if (plan.actions.length) badRequest("Assistant advice cannot include actions");
    return;
  }
  if (!Array.isArray(plan.actions)) badRequest("Assistant plan must include actions");
  if (plan.mode !== "draft_only") badRequest("Assistant plan mode must be draft_only or advice");
  for (const action of plan.actions) {
    if (!["upsert_message", "create_rule_draft", "update_rule_draft"].includes(action.action)) {
      badRequest(`Unsupported assistant action: ${action.action}`);
    }
    if (["create_rule_draft", "update_rule_draft"].includes(action.action)) {
      validateRuleSetPayload(action.object || {}, { partial: action.action === "update_rule_draft" });
      validateRuleDefinition(action.object?.draft || action.object?.definition || {}, action.object?.input_schema || {});
    }
  }
}

function firstIdentifierValue(request) {
  return Array.isArray(request.identifiers) ? request.identifiers[0]?.value : null;
}

function bucketFor(value) {
  const hex = createHash("sha256").update(String(value)).digest("hex").slice(0, 8);
  return (Number.parseInt(hex, 16) / 0xffffffff) * 100;
}

function publicRuleSet(ruleSet) {
  const latest = ruleSet.versions.at(-1);
  return {
    name: ruleSet.name,
    decision_key: ruleSet.decision_key,
    description: ruleSet.description,
    input_schema: ruleSet.input_schema,
    output_schema: ruleSet.output_schema,
    type: ruleSet.type,
    priority: ruleSet.priority,
    surface: ruleSet.surface,
    cache_policy: ruleSet.cache_policy,
    metadata: ruleSet.metadata,
    author: ruleSet.author,
    version: latest?.version || null,
    status: ruleSet.status,
    tags: ruleSet.tags,
    created_at: ruleSet.created_at,
    updated_at: ruleSet.updated_at,
    last_published_at: latest?.published_at || null
  };
}

function draftHash(draft) {
  return createHash("sha256").update(JSON.stringify(draft || {})).digest("hex");
}

function ruleConflictsFor(key) {
  return store.listRuleConflicts().by_rule?.[key] || [];
}

function requireApprovedDraft(ruleSet) {
  const approval = ruleSet.metadata?.approval || {};
  const currentHash = draftHash(ruleSet.draft);
  if (approval.status !== "approved") {
    badRequest("Draft must be approved before publishing");
  }
  if (approval.draft_hash !== currentHash) {
    badRequest("Approval is stale. Submit and approve the current draft before publishing");
  }
}

async function approvalWorkflowEnabled() {
  const settings = await storeCall("getSettings");
  return settings.approval_workflow_enabled === true;
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "bad_request";
  throw error;
}

function forbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  error.code = "forbidden";
  throw error;
}

function notFoundError(message) {
  const error = new Error(message);
  error.statusCode = 404;
  error.code = "not_found";
  throw error;
}

function corsOriginFor(origin) {
  if (!origin) return "";
  if (config.corsOrigins.includes("*")) return "*";
  return config.corsOrigins.includes(origin) ? origin : "";
}

import http from "node:http";
import { URL } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { requireScope, setAuthStore } from "./auth.js";
import { applyAssistantPlan, createAssistantPlan } from "./assistantPlanner.js";
import { config } from "./config.js";
import { createClientResultCache } from "./clientCache.js";
import { evaluateDecision } from "./evaluator.js";
import { notFound, readJson, sendError, sendJson, sendText, serveStatic } from "./http.js";
import { createProfileCache, profileCacheKey } from "./profileCache.js";
import { createRateLimiter } from "./rateLimiter.js";
import { createRequestMetrics } from "./requestMetrics.js";
import { Store } from "./store.js";
import {
  validateBundle,
  validateClientEventRequest,
  validateClientEvaluateRequest,
  validateClientSurfaceRequest,
  validateEvaluateRequest,
  validateRuleDefinition,
  validateRuleSetPayload
} from "./validation.js";

const store = await Store.load();
const clientResultCache = createClientResultCache();
const meiroProfileCache = createProfileCache();
const clientRateLimiter = createRateLimiter({
  windowMs: config.clientRateLimitWindowMs,
  max: config.clientRateLimitMax
});
const requestMetrics = createRequestMetrics();
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
    const database = store.health();
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
    const result = evaluateRequest(body);
    await store.save();
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/v1/evaluate/batch") {
    requireScope(req, "evaluate");
    const body = await readJson(req, config.batchRequestBodyLimitBytes);
    const profiles = body.profiles || body.requests || [];
    if (!Array.isArray(profiles)) badRequest("profiles must be an array");
    if (profiles.length > 500) badRequest("Batch limit is 500 profiles");
    const results = profiles.map((profile) => {
      const request = {
        ...profile,
        decision_key: profile.decision_key || body.decision_key,
        rule_version: profile.rule_version ?? body.rule_version
      };
      validateEvaluateRequest(request);
      return evaluateRequest(request);
    });
    await store.save();
    sendJson(res, 200, { results });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/client/evaluate") {
    requireScope(req, "client");
    enforceClientRateLimit(req, res, "evaluate");
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateClientEvaluateRequest(body);
    enforceAllowedDecision(req, body.decision_key);
    const result = await evaluateClientRequest(body);
    await store.save();
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && pathname === "/v1/client/rule-catalog") {
    requireScope(req, "client");
    sendJson(res, 200, { rule_sets: clientRuleCatalog(req.auth) });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/client/surface") {
    requireScope(req, "client");
    enforceClientRateLimit(req, res, "surface");
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateClientSurfaceRequest(body);
    const result = await evaluateClientSurface(body, req.auth);
    await store.save();
    sendJson(res, 200, result);
    return;
  }

  const clientEventMatch = pathname.match(/^\/v1\/client\/(impression|exposure|conversion)$/);
  if (clientEventMatch && req.method === "POST") {
    requireScope(req, "client");
    enforceClientRateLimit(req, res, clientEventMatch[1]);
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateClientEventRequest(body);
    enforceAllowedDecision(req, body.decision_key);
    const event = store.addClientEvent(clientEventFromRequest(clientEventMatch[1], body, req));
    if (event.accepted) {
      await store.save();
      clientResultCache.clear();
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
    sendJson(res, 200, { rule_sets: store.listRuleSets() });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/assistant/plan") {
    requireScope(req, "editor");
    const body = await readJson(req, config.requestBodyLimitBytes);
    const plan = createAssistantPlan(body, {
      ruleExists: (key) => Boolean(store.getRuleSet(key)),
      schemaItems: store.listSchemaItems(),
      lookupTables: store.listLookupTables(),
      clientEventCounter: (params) => store.countClientEvents(params)
    });
    validateAssistantPlan(plan);
    sendJson(res, 200, { plan });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/assistant/apply") {
    requireScope(req, "editor");
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateAssistantPlan(body.plan);
    if (body.plan.guardrails?.errors?.length) badRequest("Assistant plan has blocking guardrail errors");
    const applied = applyAssistantPlan(body.plan, store, req.auth.name);
    await store.save();
    clientResultCache.clear();
    sendJson(res, 200, applied);
    return;
  }

  if (req.method === "GET" && pathname === "/v1/metrics") {
    requireScope(req, "viewer");
    sendJson(res, 200, {
      metrics: {
        ...store.getMetrics({ window_hours: url.searchParams.get("window_hours") }),
        client_cache: clientResultCache.metrics(),
        profile_cache: meiroProfileCache.metrics(),
        client_rate_limit: clientRateLimiter.metrics(),
        runtime_requests: requestMetrics.metrics()
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
    sendJson(res, 200, { metrics: store.getClientEventMetrics(Object.fromEntries(url.searchParams)) });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/experiments") {
    requireScope(req, "viewer");
    const operations = store.getExperimentOperations();
    if (url.searchParams.get("format") === "csv") {
      sendText(res, 200, experimentOperationsToCsv(operations), "text/csv; charset=utf-8");
      return;
    }
    sendJson(res, 200, operations);
    return;
  }

  if (req.method === "GET" && pathname === "/v1/change-log") {
    requireScope(req, "viewer");
    sendJson(res, 200, { changes: store.listChangeLog(Object.fromEntries(url.searchParams)) });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/campaigns") {
    requireScope(req, "viewer");
    sendJson(res, 200, { campaigns: store.listCampaignOperations(Object.fromEntries(url.searchParams)) });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/campaigns/actions") {
    requireScope(req, "editor");
    const result = applyCampaignAction(await readJson(req, config.requestBodyLimitBytes), req.auth.name);
    await store.save();
    clientResultCache.clear();
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/v1/rule-sets") {
    requireScope(req, "editor");
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateRuleSetPayload(body);
    validateRuleDefinition(body.draft || body.definition || {}, body.input_schema || {});
    const ruleSet = store.createRuleSet(body, req.auth.name);
    await store.save();
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
    await store.save();
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
    await store.save();
    sendJson(res, 201, { token });
    return;
  }

  const tokenMatch = pathname.match(/^\/v1\/tokens\/([^/]+)$/);
  if (tokenMatch && req.method === "DELETE") {
    requireScope(req, "admin");
    const token = store.revokeApiToken(decodeURIComponent(tokenMatch[1]), req.auth.name);
    await store.save();
    sendJson(res, 200, { token });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/settings") {
    requireScope(req, "viewer");
    sendJson(res, 200, {
      settings: publicSettings(store.getSettings()),
      runtime: {
        direct_url: `http://localhost:${config.port}`,
        docker_url: "http://localhost:8090",
        db_path: config.dbPath,
        client_rate_limit: clientRateLimiter.metrics(),
        runtime_requests: requestMetrics.metrics(),
        schema_sync: schemaSyncRuntime(),
        profile_cache: meiroProfileCache.metrics(),
        meiro_deliveries: store.listMeiroDeliveries({ limit: 10 })
      }
    });
    return;
  }

  if (req.method === "PUT" && pathname === "/v1/settings") {
    requireScope(req, "admin");
    const settings = store.updateSettings(await readJson(req, config.requestBodyLimitBytes), req.auth.name);
    await store.save();
    scheduleSchemaSync();
    sendJson(res, 200, { settings: publicSettings(settings), runtime: { schema_sync: schemaSyncRuntime() } });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/settings/test-connection") {
    requireScope(req, "admin");
    const result = await testSettingsConnection(await readJson(req, config.requestBodyLimitBytes));
    await store.save();
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
    const audit = store.queryAudit(Object.fromEntries(url.searchParams));
    if (url.searchParams.get("format") === "csv") {
      sendText(res, 200, auditToCsv(audit), "text/csv; charset=utf-8");
      return;
    }
    sendJson(res, 200, { audit });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/lookup-tables") {
    requireScope(req, "viewer");
    sendJson(res, 200, { lookup_tables: store.listLookupTables() });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/messages") {
    requireScope(req, "viewer");
    sendJson(res, 200, { messages: store.listMessages(Object.fromEntries(url.searchParams)) });
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
    await store.save();
    sendJson(res, 200, { profile });
    return;
  }

  if (evaluationProfileMatch && req.method === "DELETE") {
    requireScope(req, "editor");
    store.deleteEvaluationProfile(decodeURIComponent(evaluationProfileMatch[1]));
    await store.save();
    sendJson(res, 200, { deleted: true });
    return;
  }

  const conditionBlockMatch = pathname.match(/^\/v1\/condition-blocks\/([^/]+)$/);
  if (conditionBlockMatch && req.method === "PUT") {
    requireScope(req, "editor");
    const block = store.upsertConditionBlock(decodeURIComponent(conditionBlockMatch[1]), await readJson(req, config.requestBodyLimitBytes), req.auth.name);
    await store.save();
    sendJson(res, 200, { condition_block: block });
    return;
  }

  if (conditionBlockMatch && req.method === "DELETE") {
    requireScope(req, "editor");
    store.deleteConditionBlock(decodeURIComponent(conditionBlockMatch[1]));
    await store.save();
    sendJson(res, 200, { deleted: true });
    return;
  }

  const messageVersionsMatch = pathname.match(/^\/v1\/messages\/([^/]+)\/versions$/);
  if (messageVersionsMatch && req.method === "GET") {
    requireScope(req, "viewer");
    sendJson(res, 200, { versions: store.listMessageVersions(decodeURIComponent(messageVersionsMatch[1])) });
    return;
  }

  const messageVersionMatch = pathname.match(/^\/v1\/messages\/([^/]+)\/versions\/(\d+)$/);
  if (messageVersionMatch && req.method === "GET") {
    requireScope(req, "viewer");
    sendJson(res, 200, {
      message: store.getMessageVersion(decodeURIComponent(messageVersionMatch[1]), Number(messageVersionMatch[2]))
    });
    return;
  }

  const messageVersionDiffMatch = pathname.match(/^\/v1\/messages\/([^/]+)\/versions\/(\d+)\/diff$/);
  if (messageVersionDiffMatch && req.method === "GET") {
    requireScope(req, "viewer");
    const id = decodeURIComponent(messageVersionDiffMatch[1]);
    const left = store.getMessageVersion(id, Number(messageVersionDiffMatch[2]));
    const compareTo = url.searchParams.get("compare_to") || "current";
    const right = compareTo === "current" ? store.getMessage(id) : store.getMessageVersion(id, Number(compareTo));
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
    const message = store.upsertMessage(decodeURIComponent(messageMatch[1]), await readJson(req, config.requestBodyLimitBytes), req.auth.name);
    await store.save();
    clientResultCache.clear();
    sendJson(res, 200, { message });
    return;
  }

  const lookupExportMatch = pathname.match(/^\/v1\/lookup-tables\/([^/]+)\/export$/);
  if (lookupExportMatch && req.method === "GET") {
    requireScope(req, "viewer");
    const table = store.listLookupTables().find((item) => item.id === decodeURIComponent(lookupExportMatch[1]));
    if (!table) notFoundError(`Lookup table not found: ${decodeURIComponent(lookupExportMatch[1])}`);
    sendText(res, 200, lookupTableToCsv(table), "text/csv; charset=utf-8");
    return;
  }

  const lookupVersionsMatch = pathname.match(/^\/v1\/lookup-tables\/([^/]+)\/versions$/);
  if (lookupVersionsMatch && req.method === "GET") {
    requireScope(req, "viewer");
    sendJson(res, 200, { versions: store.listLookupTableVersions(decodeURIComponent(lookupVersionsMatch[1])) });
    return;
  }

  const lookupVersionMatch = pathname.match(/^\/v1\/lookup-tables\/([^/]+)\/versions\/(\d+)$/);
  if (lookupVersionMatch && req.method === "GET") {
    requireScope(req, "viewer");
    sendJson(res, 200, {
      lookup_table: store.getLookupTableVersion(decodeURIComponent(lookupVersionMatch[1]), Number(lookupVersionMatch[2]))
    });
    return;
  }

  const lookupMatch = pathname.match(/^\/v1\/lookup-tables\/([^/]+)$/);
  if (lookupMatch && req.method === "PUT") {
    requireScope(req, "editor");
    const table = store.replaceLookupTable(decodeURIComponent(lookupMatch[1]), await readJson(req, config.requestBodyLimitBytes), req.auth.name);
    await store.save();
    clientResultCache.clear();
    sendJson(res, 200, { lookup_table: table });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/schema") {
    requireScope(req, "viewer");
    sendJson(res, 200, { schema: store.listSchemaItems(Object.fromEntries(url.searchParams)) });
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
    await store.save();
    sendJson(res, 200, { imported, diagnostics: diagnosed.diagnostics });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/schema/sync") {
    requireScope(req, "admin");
    const body = await readJson(req, config.requestBodyLimitBytes);
    try {
      const synced = await syncSchemaFromMeiroProfile(body, req.auth.name);
      recordSchemaSyncSuccess(synced, req.auth.name);
      await store.save();
      sendJson(res, 200, synced);
    } catch (error) {
      recordSchemaSyncError(error, req.auth.name);
      await store.save();
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
      await store.save();
      sendJson(res, 200, synced);
    } catch (error) {
      recordSchemaSyncError(error, req.auth.name);
      await store.save();
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
  badRequest("target must be profile, collector, or feedback");
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
    store.recordMeiroDelivery({
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
    store.recordMeiroDelivery({ ...result, duration_ms: Date.now() - startedAt, error: error.message });
    return result;
  }
}

async function testMeiroCollectorConnection(input = {}) {
  const settings = store.getSettings();
  const base = String(input.meiro_url || settings.meiro_url || "").trim();
  const slug = String(input.meiro_source_slug || settings.meiro_source_slug || "").trim();
  if (!base) badRequest("meiro_url is required");
  if (!slug) badRequest("meiro_source_slug is required");
  const url = new URL(["collect", slug].join("/"), base.endsWith("/") ? base : `${base}/`);
  const payload = {
    decision_key: "connection_test",
    profile_key: "dee-settings-test",
    result: "test",
    outputs: { source: "dee_settings" },
    matched_rules: [],
    errors: [],
    evaluated_at: createdAtIso()
  };
  return deliverMeiroPayload("collector", url.toString(), payload);
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

async function deliverMeiroPayload(target, endpoint, payload) {
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
      message: response.ok ? `${target} accepted test payload` : text.slice(0, 300) || `${target} returned an error`
    };
    store.recordMeiroDelivery({
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
    store.recordMeiroDelivery({
      ...result,
      duration_ms: Date.now() - startedAt,
      error: error.message,
      response_preview: text.slice(0, 500),
      payload
    });
    return result;
  }
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
    await store.save();
  } catch (error) {
    recordSchemaSyncError(error, "schema-scheduler");
    await store.save();
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
  console.log(JSON.stringify(record));
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
  delete copy.meiro_api_token;
  delete copy.meiro_cli_token;
  return copy;
}

function applyCampaignAction(body = {}, author = "admin") {
  const campaign = body.campaign || "Unassigned";
  const action = body.action || "";
  const dryRun = body.dry_run !== false;
  if (!["submit_review", "archive"].includes(action)) badRequest("Unsupported campaign action");
  const assets = store.listCampaignAssets(campaign);
  const result = {
    campaign: assets.campaign,
    action,
    dry_run: dryRun,
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
        const fullRule = store.getRuleSet(rule.decision_key);
        store.setRuleApproval(rule.decision_key, {
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
      if (!dryRun) store.archiveRuleSet(rule.decision_key, author);
    }
    for (const message of assets.messages) {
      if (message.status === "archived") {
        skip({ object_type: "message", object_id: message.id, reason: "already_archived" });
        continue;
      }
      affect({ object_type: "message", object_id: message.id, action: "archive" });
      if (!dryRun) store.upsertMessage(message.id, { ...message, status: "archived" }, author);
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

async function routeRuleSet(req, res, key, suffix) {
  if (req.method === "GET" && suffix === "") {
    requireScope(req, "viewer");
    const ruleSet = store.getRuleSet(key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    const latest = ruleSet.versions.at(-1);
    sendJson(res, 200, { rule_set: publicRuleSet(ruleSet), draft: ruleSet.draft, version: latest || null });
    return;
  }

  if (req.method === "GET" && suffix === "versions") {
    requireScope(req, "viewer");
    sendJson(res, 200, { versions: store.listVersions(key) });
    return;
  }

  const versionMatch = suffix.match(/^versions\/(\d+)$/);
  if (req.method === "GET" && versionMatch) {
    requireScope(req, "viewer");
    sendJson(res, 200, { version: store.getVersion(key, Number(versionMatch[1])) });
    return;
  }

  const versionDiffMatch = suffix.match(/^versions\/(\d+)\/diff$/);
  if (req.method === "GET" && versionDiffMatch) {
    requireScope(req, "viewer");
    const left = store.getVersion(key, Number(versionDiffMatch[1]));
    const compareTo = new URL(req.url, `http://${req.headers.host || "localhost"}`).searchParams.get("compare_to") || "draft";
    const ruleSet = store.getRuleSet(key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    const right = compareTo === "draft"
      ? { version: "draft", definition: ruleSet.draft }
      : store.getVersion(key, Number(compareTo));
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
    const ruleSet = store.rollbackDraftToVersion(key, Number(versionRollbackMatch[1]), req.auth.name);
    await store.save();
    clientResultCache.clear();
    sendJson(res, 200, { rule_set: publicRuleSet(ruleSet), draft: ruleSet.draft });
    return;
  }

  if (req.method === "PUT" && suffix === "draft") {
    requireScope(req, "editor");
    const body = await readJson(req, config.requestBodyLimitBytes);
    validateRuleSetPayload(body, { partial: true });
    const existing = store.getRuleSet(key);
    if (!existing) notFoundError(`Rule set not found: ${key}`);
    if (body.decision_key && body.decision_key !== key) {
      badRequest("decision_key is immutable for saved rule sets. Duplicate the rule to create a new key.");
    }
    validateRuleDefinition(body.draft || body.definition || {}, body.input_schema || existing.input_schema || {});
    const ruleSet = store.updateDraft(key, body, req.auth.name);
    await store.save();
    clientResultCache.clear();
    sendJson(res, 200, { rule_set: publicRuleSet(ruleSet), draft: ruleSet.draft });
    return;
  }

  if (req.method === "POST" && suffix === "publish") {
    requireScope(req, "publisher");
    const ruleSet = store.getRuleSet(key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    validateRuleDefinition(ruleSet.draft, ruleSet.input_schema || {});
    requireApprovedDraft(ruleSet);
    const version = store.publish(key, req.auth.name);
    await store.save();
    clientResultCache.clear();
    sendJson(res, 200, { version });
    return;
  }

  if (req.method === "POST" && suffix === "submit-review") {
    requireScope(req, "editor");
    const body = await readJson(req, config.requestBodyLimitBytes);
    const ruleSet = store.getRuleSet(key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    validateRuleDefinition(ruleSet.draft, ruleSet.input_schema || {});
    const updated = store.setRuleApproval(key, {
      status: "submitted",
      note: body.note || "",
      assigned_to: body.assigned_to || "",
      draft_hash: draftHash(ruleSet.draft)
    }, req.auth.name);
    await store.save();
    sendJson(res, 200, { rule_set: publicRuleSet(updated), approval: updated.metadata.approval });
    return;
  }

  if (req.method === "POST" && suffix === "approve") {
    requireScope(req, "publisher");
    const body = await readJson(req, config.requestBodyLimitBytes);
    const ruleSet = store.getRuleSet(key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    validateRuleDefinition(ruleSet.draft, ruleSet.input_schema || {});
    const approval = ruleSet.metadata?.approval || {};
    if (approval.status !== "submitted" && !body.force) badRequest("Draft must be submitted for review before approval");
    const updated = store.setRuleApproval(key, {
      status: "approved",
      note: body.note || approval.note || "",
      draft_hash: draftHash(ruleSet.draft)
    }, req.auth.name);
    await store.save();
    sendJson(res, 200, { rule_set: publicRuleSet(updated), approval: updated.metadata.approval });
    return;
  }

  if (req.method === "POST" && suffix === "archive") {
    requireScope(req, "editor");
    const ruleSet = store.archiveRuleSet(key, req.auth.name);
    await store.save();
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
    const ruleSet = store.duplicateRuleSet(key, body, req.auth.name);
    await store.save();
    clientResultCache.clear();
    sendJson(res, 201, { rule_set: publicRuleSet(ruleSet), draft: ruleSet.draft });
    return;
  }

  if (req.method === "POST" && suffix === "test") {
    requireScope(req, "editor");
    const ruleSet = store.getRuleSet(key);
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
      lookupTables: store.listLookupTables()
    });
    sendJson(res, 200, { ...result, tested_version: "draft" });
    return;
  }

  if (req.method === "POST" && suffix === "test-published") {
    requireScope(req, "editor");
    const ruleSet = store.getRuleSet(key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    const body = {
      ...(await readJson(req, config.requestBodyLimitBytes)),
      decision_key: key
    };
    validateEvaluateRequest(body);
    const version = store.getVersion(key, body.rule_version);
    const result = evaluateDecision({
      request: body,
      version,
      lookupTables: store.listLookupTables()
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

function isDiffObject(value) {
  return value != null && typeof value === "object";
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function evaluateRequest(body) {
  if (!body.decision_key) badRequest("decision_key is required");
  if (!body.profile_key) badRequest("profile_key is required");
  if (!Array.isArray(body.identifiers)) badRequest("identifiers must be an array");

  const version = store.getVersion(body.decision_key, body.rule_version);
  const result = evaluateDecision({
    request: body,
    version,
    lookupTables: store.listLookupTables()
  });
  store.addAudit({
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
  const ruleSet = store.getRuleSet(body.decision_key);
  if (!ruleSet) notFoundError(`Rule set not found: ${body.decision_key}`);
  const version = store.getVersion(body.decision_key, body.rule_version);
  const baseRequest = {
    identifiers: [],
    attributes: {},
    segments: {},
    context: {},
    ...body
  };
  const hydrated = await hydrateClientProfile(baseRequest);
  const request = hydrated.request;
  const cached = clientResultCache.get(request, ruleSet, version);
  if (cached.hit) {
    return {
      ...cached.value,
      ttl_seconds: cached.ttl_seconds,
      cache: {
        hit: true,
        scope: ruleSet.cache_policy?.scope || "profile",
        expires_at: cached.expires_at
      },
      profile_cache: hydrated.cache
    };
  }
  const evaluated = evaluateDecision({
    request,
    version,
    lookupTables: store.listLookupTables(),
    clientEventCounter: (params) => store.countClientEvents(params)
  });
  const assigned = assignExperimentVariant(ruleSet, request, evaluated);
  const messageResolved = resolveMessageOutputs(
    assigned && !assigned.holdout ? { ...evaluated.outputs, ...(assigned.outputs || {}) } : evaluated.outputs,
    ruleSet,
    request,
    evaluated.evaluated_at
  );
  const finalOutputs = messageResolved.outputs;
  const finalResult = messageResolved.available === false && evaluated.result === "eligible" ? "suppressed" : evaluated.result;
  const finalErrors = [...evaluated.errors, ...messageResolved.errors];
  const ttlSeconds = Number(ruleSet.cache_policy?.client_ttl || 0);
  store.addAudit({
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
      request_source: "client",
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
    profile_cache: hydrated.cache,
    experiment: assigned ? clientExperimentAssignment(assigned) : null,
    matched_rules: evaluated.matched_rules,
    errors: finalErrors
  };
  response.cache.expires_at = response.errors.length ? null : clientResultCache.set(cached.cache_key, response, ruleSet);
  return response;
}

async function hydrateClientProfile(request) {
  const settings = store.getSettings();
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

function hasProfilePayload(request) {
  return Boolean(
    Object.keys(request.attributes || {}).length ||
    Object.keys(request.segments || {}).length ||
    Object.keys(request.context || {}).filter((key) => !["surface", "session_id", "sessionId", "profile_enrichment", "enrich_profile", "force_variant", "forced_variants"].includes(key)).length
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

function resolveMessageOutputs(outputs, ruleSet, request, evaluatedAt) {
  const messageId = outputs.message_id || outputs.messageId || outputs.message?.id;
  if (!messageId) return { outputs, available: null, errors: [] };
  const message = store.getMessage(String(messageId));
  if (!message) {
    return unavailableMessage(outputs, "message_not_found", `Message not found: ${messageId}`);
  }
  const availability = messageAvailability(message, ruleSet, request, evaluatedAt);
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
      availability
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

function messageAvailability(message, ruleSet, request, evaluatedAt) {
  const lifecycle = message.metadata?.lifecycle || message.metadata?.delivery || {};
  const nowMs = Date.parse(evaluatedAt || createdAtIso());
  if (message.status !== "active") {
    return { available: false, reason: "message_inactive", message: `Message ${message.id} is ${message.status}` };
  }
  if (message.surface && ruleSet.surface && message.surface !== ruleSet.surface) {
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
  const ttlSeconds = Number(lifecycle.ttl_seconds || message.metadata?.ttl_seconds || 0);
  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
    const since = new Date(nowMs - ttlSeconds * 1000).toISOString();
    const impressions = store.countClientEvents({
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
  return {
    available: true,
    reason: "available",
    starts_at: startsAt || "",
    expires_at: expiresAt || "",
    ttl_seconds: Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 0,
    priority: Number(message.metadata?.priority ?? lifecycle.priority ?? 0) || 0
  };
}

async function evaluateClientSurface(body, auth) {
  const ruleSets = store
    .listRuleSets()
    .filter((ruleSet) =>
      ruleSet.type === "inapp_message" &&
      ruleSet.status === "published" &&
      ruleSet.surface === body.surface &&
      (!auth.decision_keys?.length || auth.decision_keys.includes(ruleSet.decision_key))
    )
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || a.decision_key.localeCompare(b.decision_key))
    .slice(0, Math.min(Number(body.limit || 20), 50));

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
    candidates
  };
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
  const unit = experiment.unit === "identifier" ? firstIdentifierValue(request) : request.profile_key;
  const bucket = bucketFor(`${ruleSet.decision_key}:${unit || request.profile_key}`);
  let cursor = 0;
  for (const variant of variants) {
    cursor += Number(variant.weight || 0);
    if (bucket < cursor) return { ...variant, bucket };
  }
  return { ...variants.at(-1), bucket };
}

function isForcedHoldout(request, decisionKey) {
  const value = request.context?.force_holdout ?? request.context?.holdout ?? request.context?.forced_holdouts?.[decisionKey];
  return value === true || value === "true" || value === 1 || value === "1";
}

function auditExperimentAssignment(assigned) {
  if (assigned.holdout) return { holdout: true, reason: assigned.reason || "holdout" };
  return { key: assigned.key, bucket: assigned.bucket };
}

function clientExperimentAssignment(assigned) {
  if (assigned.holdout) return { variant_key: null, bucket: null, holdout: true, reason: assigned.reason || "holdout" };
  return { variant_key: assigned.key, bucket: assigned.bucket, holdout: false };
}

function validateAssistantPlan(plan) {
  if (!plan || !Array.isArray(plan.actions)) badRequest("Assistant plan must include actions");
  if (plan.mode !== "draft_only") badRequest("Assistant plan mode must be draft_only");
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

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "bad_request";
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

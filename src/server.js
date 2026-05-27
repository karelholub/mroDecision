import http from "node:http";
import { URL } from "node:url";
import { createHash } from "node:crypto";
import { requireScope, setAuthStore } from "./auth.js";
import { config } from "./config.js";
import { evaluateDecision } from "./evaluator.js";
import { notFound, readJson, sendError, sendJson, sendText, serveStatic } from "./http.js";
import { Store } from "./store.js";
import {
  validateBundle,
  validateClientEvaluateRequest,
  validateEvaluateRequest,
  validateRuleDefinition,
  validateRuleSetPayload,
  validateSchemaImport
} from "./validation.js";

const store = await Store.load();
setAuthStore(store);
let schemaSyncTimer = null;
let schemaSyncNextRunAt = "";

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/v1/")) {
      await routeApi(req, res, url);
      return;
    }
    if (await serveStatic(res, url.pathname)) return;
    notFound(res);
  } catch (error) {
    sendError(res, error);
  }
});

server.listen(config.port, () => {
  console.log(`DEE listening on http://localhost:${config.port}`);
});
scheduleSchemaSync();

async function routeApi(req, res, url) {
  const { pathname } = url;

  if (req.method === "GET" && pathname === "/v1/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "meiro-decision-engine",
      now: new Date().toISOString()
    });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/evaluate") {
    requireScope(req, "evaluate");
    const body = await readJson(req);
    validateEvaluateRequest(body);
    const result = evaluateRequest(body);
    await store.save();
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/v1/evaluate/batch") {
    requireScope(req, "evaluate");
    const body = await readJson(req, 8 * 1024 * 1024);
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
    const body = await readJson(req);
    validateClientEvaluateRequest(body);
    if (req.auth.decision_keys?.length && !req.auth.decision_keys.includes(body.decision_key)) {
      const error = new Error(`Client token is not allowed to evaluate: ${body.decision_key}`);
      error.statusCode = 403;
      error.code = "forbidden";
      throw error;
    }
    const result = evaluateClientRequest(body);
    await store.save();
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && pathname === "/v1/rule-sets") {
    requireScope(req, "viewer");
    sendJson(res, 200, { rule_sets: store.listRuleSets() });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/metrics") {
    requireScope(req, "viewer");
    sendJson(res, 200, { metrics: store.getMetrics() });
    return;
  }

  const ruleMetricsMatch = pathname.match(/^\/v1\/metrics\/rule\/([^/]+)$/);
  if (ruleMetricsMatch && req.method === "GET") {
    requireScope(req, "viewer");
    sendJson(res, 200, { metrics: store.getRuleMetrics(decodeURIComponent(ruleMetricsMatch[1])) });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/rule-sets") {
    requireScope(req, "editor");
    const body = await readJson(req);
    validateRuleSetPayload(body);
    validateRuleDefinition(body.draft || body.definition || {}, body.input_schema || {});
    const ruleSet = store.createRuleSet(body, req.auth.name);
    await store.save();
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
    const body = await readJson(req, 8 * 1024 * 1024);
    validateBundle(body);
    const imported = store.importBundle(body, req.auth.name);
    await store.save();
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
    const body = await readJson(req);
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
        schema_sync: schemaSyncRuntime()
      }
    });
    return;
  }

  if (req.method === "PUT" && pathname === "/v1/settings") {
    requireScope(req, "admin");
    const settings = store.updateSettings(await readJson(req), req.auth.name);
    await store.save();
    scheduleSchemaSync();
    sendJson(res, 200, { settings: publicSettings(settings), runtime: { schema_sync: schemaSyncRuntime() } });
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
    const table = store.replaceLookupTable(decodeURIComponent(lookupMatch[1]), await readJson(req), req.auth.name);
    await store.save();
    sendJson(res, 200, { lookup_table: table });
    return;
  }

  if (req.method === "GET" && pathname === "/v1/schema") {
    requireScope(req, "viewer");
    sendJson(res, 200, { schema: store.listSchemaItems(Object.fromEntries(url.searchParams)) });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/schema/import") {
    requireScope(req, "admin");
    const body = await readJson(req);
    validateSchemaImport(body);
    const imported = {
      attributes: store.replaceSchemaItems("attribute", body.attributes || [], req.auth.name),
      segments: store.replaceSchemaItems("segment", body.segments || [], req.auth.name),
      context: store.replaceSchemaItems("context", body.context || [], req.auth.name)
    };
    await store.save();
    sendJson(res, 200, { imported });
    return;
  }

  if (req.method === "POST" && pathname === "/v1/schema/sync") {
    requireScope(req, "admin");
    const body = await readJson(req);
    const synced = await syncSchemaFromMeiroProfile(body, req.auth.name);
    recordSchemaSyncSuccess(synced, req.auth.name);
    await store.save();
    sendJson(res, 200, synced);
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

  const url = new URL(endpoint);
  url.searchParams.set("identifier_type", identifierType);
  url.searchParams.set("identifier_value", identifierValue);
  const response = await fetch(url, {
    headers: {
      "x-api-token": token,
      authorization: `Bearer ${token}`,
      accept: "application/json"
    }
  });
  const rawText = await response.text();
  let profile;
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

  const inferred = inferSchemaFromProfile(profile);
  return {
    source: url.origin + url.pathname,
    imported: {
      attributes: store.replaceSchemaItems("attribute", inferred.attributes, author),
      segments: store.replaceSchemaItems("segment", inferred.segments, author),
      context: store.replaceSchemaItems("context", inferred.context, author)
    },
    profile_shape: Object.keys(profile)
  };
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
    store.updateSettings(
      {
        schema_last_synced_at: createdAtIso(),
        schema_last_sync_status: "error",
        schema_last_sync_error: error.message || "Schema sync failed"
      },
      "schema-scheduler"
    );
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

function schemaSyncConfigured(settings) {
  return Boolean(
    String(settings.meiro_api_url || "").trim() &&
    String(settings.meiro_api_token || "").trim() &&
    String(settings.schema_sync_identifier_type || "").trim() &&
    String(settings.schema_sync_identifier_value || "").trim() &&
    Number(settings.schema_sync_interval_minutes || 0) > 0
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
    source: "meiro_profile_api",
    raw
  }));
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
  delete copy.meiro_api_token;
  return copy;
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
    sendJson(res, 200, { rule_set: publicRuleSet(ruleSet), draft: ruleSet.draft });
    return;
  }

  if (req.method === "PUT" && suffix === "draft") {
    requireScope(req, "editor");
    const body = await readJson(req);
    validateRuleSetPayload(body, { partial: true });
    const existing = store.getRuleSet(key);
    if (!existing) notFoundError(`Rule set not found: ${key}`);
    validateRuleDefinition(body.draft || body.definition || {}, body.input_schema || existing.input_schema || {});
    const ruleSet = store.updateDraft(key, body, req.auth.name);
    await store.save();
    sendJson(res, 200, { rule_set: publicRuleSet(ruleSet), draft: ruleSet.draft });
    return;
  }

  if (req.method === "POST" && suffix === "publish") {
    requireScope(req, "publisher");
    const ruleSet = store.getRuleSet(key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    validateRuleDefinition(ruleSet.draft, ruleSet.input_schema || {});
    const version = store.publish(key, req.auth.name);
    await store.save();
    sendJson(res, 200, { version });
    return;
  }

  if (req.method === "POST" && suffix === "archive") {
    requireScope(req, "editor");
    const ruleSet = store.archiveRuleSet(key, req.auth.name);
    await store.save();
    sendJson(res, 200, { rule_set: publicRuleSet(ruleSet) });
    return;
  }

  if (req.method === "POST" && suffix === "duplicate") {
    requireScope(req, "editor");
    const body = await readJson(req);
    validateRuleSetPayload(
      {
        name: body.name || `${key} Copy`,
        decision_key: body.decision_key || `${key}_copy`
      },
      { partial: false }
    );
    const ruleSet = store.duplicateRuleSet(key, body, req.auth.name);
    await store.save();
    sendJson(res, 201, { rule_set: publicRuleSet(ruleSet), draft: ruleSet.draft });
    return;
  }

  if (req.method === "POST" && suffix === "test") {
    requireScope(req, "editor");
    const ruleSet = store.getRuleSet(key);
    if (!ruleSet) notFoundError(`Rule set not found: ${key}`);
    validateRuleDefinition(ruleSet.draft, ruleSet.input_schema || {});
    const body = {
      ...(await readJson(req)),
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

function evaluateClientRequest(body) {
  const ruleSet = store.getRuleSet(body.decision_key);
  if (!ruleSet) notFoundError(`Rule set not found: ${body.decision_key}`);
  const version = store.getVersion(body.decision_key, body.rule_version);
  const request = {
    identifiers: [],
    attributes: {},
    segments: {},
    context: {},
    ...body
  };
  const evaluated = evaluateDecision({
    request,
    version,
    lookupTables: store.listLookupTables()
  });
  const assigned = assignExperimentVariant(ruleSet, request, evaluated);
  const finalOutputs = assigned ? { ...evaluated.outputs, ...(assigned.outputs || {}) } : evaluated.outputs;
  const ttlSeconds = Number(ruleSet.cache_policy?.client_ttl || 0);
  store.addAudit({
    ...evaluated,
    outputs: finalOutputs,
    experiment: assigned ? { key: assigned.key, bucket: assigned.bucket } : undefined,
    inputs: {
      identifiers_count: Array.isArray(request.identifiers) ? request.identifiers.length : 0,
      attribute_keys: Object.keys(request.attributes || {}),
      segment_keys: Object.keys(request.segments || {}),
      context_keys: Object.keys(request.context || {}),
      request_source: "client"
    }
  });
  return {
    decision_key: evaluated.decision_key,
    profile_key: evaluated.profile_key,
    result: evaluated.result,
    outputs: finalOutputs,
    rule_version: evaluated.rule_version,
    ttl_seconds: Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 0,
    cache_scope: ruleSet.cache_policy?.scope || null,
    experiment: assigned ? { variant_key: assigned.key, bucket: assigned.bucket } : null,
    matched_rules: evaluated.matched_rules,
    errors: evaluated.errors
  };
}

function assignExperimentVariant(ruleSet, request, evaluated) {
  if (ruleSet.type !== "experiment") return null;
  if (["ineligible", "suppressed"].includes(evaluated.result)) return null;
  const experiment = ruleSet.metadata?.experiment || {};
  const variants = Array.isArray(experiment.variants) ? experiment.variants : [];
  if (!variants.length) return null;
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

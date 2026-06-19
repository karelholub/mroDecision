import { mkdir } from "node:fs/promises";
import path from "node:path";

export const config = {
  port: Number(process.env.PORT || 8080),
  storeAdapter: String(process.env.DEE_STORE_ADAPTER || "sqlite").trim().toLowerCase(),
  databaseUrl: process.env.DEE_DATABASE_URL || "",
  postgresSnapshotTable: process.env.DEE_POSTGRES_SNAPSHOT_TABLE || "dee_store_snapshots",
  postgresPoolMax: positiveNumber(process.env.DEE_POSTGRES_POOL_MAX, 10),
  postgresIdleTimeoutMs: positiveNumber(process.env.DEE_POSTGRES_IDLE_TIMEOUT_MS, 30000),
  postgresConnectionTimeoutMs: positiveNumber(process.env.DEE_POSTGRES_CONNECTION_TIMEOUT_MS, 5000),
  postgresStatementTimeoutMs: positiveNumber(process.env.DEE_POSTGRES_STATEMENT_TIMEOUT_MS, 15000),
  dataDir: process.env.DEE_DATA_DIR || path.resolve("data"),
  dbPath: process.env.DEE_DB_PATH || path.join(process.env.DEE_DATA_DIR || path.resolve("data"), "dee.sqlite"),
  auditRetentionDays: Number(process.env.DEE_AUDIT_RETENTION_DAYS || 90),
  clientEventRetentionDays: Number(process.env.DEE_CLIENT_EVENT_RETENTION_DAYS || 180),
  bootstrapTokensEnabled: process.env.DEE_BOOTSTRAP_TOKENS_ENABLED !== "false",
  corsOrigins: parseCsv(process.env.DEE_CORS_ORIGINS || "http://localhost:8091,http://127.0.0.1:8091"),
  requestBodyLimitBytes: positiveNumber(process.env.DEE_REQUEST_BODY_LIMIT_BYTES, 1024 * 1024),
  batchRequestBodyLimitBytes: positiveNumber(process.env.DEE_BATCH_REQUEST_BODY_LIMIT_BYTES, 8 * 1024 * 1024),
  requestTimeoutMs: positiveNumber(process.env.DEE_REQUEST_TIMEOUT_MS, 15000),
  headersTimeoutMs: positiveNumber(process.env.DEE_HEADERS_TIMEOUT_MS, 16000),
  keepAliveTimeoutMs: positiveNumber(process.env.DEE_KEEP_ALIVE_TIMEOUT_MS, 5000),
  maxRequestsPerSocket: positiveNumber(process.env.DEE_MAX_REQUESTS_PER_SOCKET, 1000),
  shutdownGraceMs: positiveNumber(process.env.DEE_SHUTDOWN_GRACE_MS, 25000),
  clientRateLimitWindowMs: positiveNumber(process.env.DEE_CLIENT_RATE_LIMIT_WINDOW_MS, 60000),
  clientRateLimitMax: positiveNumber(process.env.DEE_CLIENT_RATE_LIMIT_MAX, 600),
  runtimeStateAdapter: runtimeStateAdapter(process.env.DEE_RUNTIME_STATE_ADAPTER || "memory"),
  loadSheddingMode: loadSheddingMode(process.env.DEE_LOAD_SHEDDING_MODE || "monitor"),
  loadSheddingMinSamples: positiveNumber(process.env.DEE_LOAD_SHEDDING_MIN_SAMPLES, 100),
  loadSheddingRuntimeP95Ms: positiveNumber(process.env.DEE_LOAD_SHEDDING_RUNTIME_P95_MS, 1000),
  loadSheddingClientErrorRate: positiveNumber(process.env.DEE_LOAD_SHEDDING_CLIENT_ERROR_RATE, 0.2),
  loadSheddingProfileErrorThreshold: positiveNumber(process.env.DEE_LOAD_SHEDDING_PROFILE_ERROR_THRESHOLD, 20),
  loadSheddingRetryAfterSeconds: positiveNumber(process.env.DEE_LOAD_SHEDDING_RETRY_AFTER_SECONDS, 10),
  loadSheddingShedOnOpenCircuit: process.env.DEE_LOAD_SHEDDING_SHED_ON_OPEN_CIRCUIT === "true",
  meiroCircuitFailureThreshold: positiveNumber(process.env.DEE_MEIRO_CIRCUIT_FAILURE_THRESHOLD, 5),
  meiroCircuitCooldownMs: positiveNumber(process.env.DEE_MEIRO_CIRCUIT_COOLDOWN_MS, 30000),
  tokens: parseTokens(process.env.DEE_TOKENS)
};

export async function ensureDataDir() {
  await mkdir(config.dataDir, { recursive: true });
}

function parseTokens(raw) {
  if (!raw) {
    return [
      {
        name: "development-admin",
        token: "dev-admin-token",
        scopes: ["admin", "evaluate", "client"],
        decision_keys: []
      }
    ];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("DEE_TOKENS must be an array");
    return parsed.map((item) => ({
      name: String(item.name || "token"),
      token: String(item.token || ""),
      scopes: Array.isArray(item.scopes) ? item.scopes.map(String) : ["evaluate"],
      decision_keys: Array.isArray(item.decision_keys) ? item.decision_keys.map(String) : []
    }));
  } catch (error) {
    throw new Error(`Invalid DEE_TOKENS: ${error.message}`);
  }
}

function parseCsv(raw) {
  return String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function positiveNumber(raw, fallback) {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function loadSheddingMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  return ["off", "monitor", "shed"].includes(mode) ? mode : "monitor";
}

function runtimeStateAdapter(raw) {
  const adapter = String(raw || "").trim().toLowerCase();
  return ["memory", "postgres"].includes(adapter) ? adapter : "memory";
}

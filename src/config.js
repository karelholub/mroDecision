import { mkdir } from "node:fs/promises";
import path from "node:path";

export const config = {
  port: Number(process.env.PORT || 8080),
  dataDir: process.env.DEE_DATA_DIR || path.resolve("data"),
  dbPath: process.env.DEE_DB_PATH || path.join(process.env.DEE_DATA_DIR || path.resolve("data"), "dee.sqlite"),
  auditRetentionDays: Number(process.env.DEE_AUDIT_RETENTION_DAYS || 90),
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
        scopes: ["admin", "evaluate"]
      }
    ];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("DEE_TOKENS must be an array");
    return parsed.map((item) => ({
      name: String(item.name || "token"),
      token: String(item.token || ""),
      scopes: Array.isArray(item.scopes) ? item.scopes.map(String) : ["evaluate"]
    }));
  } catch (error) {
    throw new Error(`Invalid DEE_TOKENS: ${error.message}`);
  }
}

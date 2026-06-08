import { randomBytes } from "node:crypto";
import { nativePostgresAdapterInfo } from "./storePostgresNativeSchema.js";

const allowedSettingKeys = new Set([
  "environment_label",
  "audit_retention_days",
  "client_event_retention_days",
  "bootstrap_tokens_enabled",
  "meiro_url",
  "meiro_source_slug",
  "meiro_api_url",
  "meiro_api_token",
  "meiro_feedback_url",
  "meiro_skill_url",
  "meiro_cli_url",
  "meiro_cli_token",
  "meiro_profile_cache_ttl_seconds",
  "schema_sync_interval_minutes",
  "schema_sync_identifier_type",
  "schema_sync_identifier_value",
  "assistant_llm_enabled",
  "assistant_llm_provider",
  "assistant_llm_base_url",
  "assistant_llm_model",
  "assistant_llm_api_key",
  "assistant_llm_policy",
  "assistant_llm_timeout_ms",
  "schema_last_synced_at",
  "schema_last_sync_status",
  "schema_last_sync_error",
  "schema_last_sync_count"
]);

const assistantProviderSettingKeys = [
  "assistant_llm_enabled",
  "assistant_llm_provider",
  "assistant_llm_base_url",
  "assistant_llm_model",
  "assistant_llm_api_key",
  "assistant_llm_policy",
  "assistant_llm_timeout_ms"
];

export class PostgresNativeReadStore {
  constructor(client, options = {}) {
    if (!client || typeof client.query !== "function") {
      throw new Error("PostgresNativeReadStore requires a pg client or pool with query(sql, params).");
    }
    this.client = client;
    this.adapter = "postgres_native";
    this.adapterInfo = options.adapterInfo || nativePostgresAdapterInfo;
  }

  async health() {
    try {
      const result = await this.client.query("SELECT 1 AS ok", []);
      return {
        ok: result.rows?.[0]?.ok === 1,
        adapter: this.adapter,
        adapter_info: this.adapterInfo,
        deployment: nativeReadDeploymentReadiness()
      };
    } catch (error) {
      return {
        ok: false,
        adapter: this.adapter,
        adapter_info: this.adapterInfo,
        deployment: nativeReadDeploymentReadiness(error),
        error: error.message
      };
    }
  }

  async listRuleSets() {
    const result = await this.client.query(
      `SELECT
        rs.*,
        (SELECT MAX(version) FROM rule_versions rv WHERE rv.decision_key = rs.decision_key) AS latest_version,
        (SELECT published_at FROM rule_versions rv WHERE rv.decision_key = rs.decision_key ORDER BY version DESC LIMIT 1) AS last_published_at
       FROM rule_sets rs
       ORDER BY updated_at DESC, decision_key ASC`,
      []
    );
    return result.rows.map(rowToPublicRuleSet);
  }

  async getRuleSet(key) {
    const result = await this.client.query("SELECT * FROM rule_sets WHERE decision_key = $1", [key]);
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      ...rowToRuleSet(row),
      versions: await this.getVersionsForRuleSet(key)
    };
  }

  async getVersionsForRuleSet(key) {
    const result = await this.client.query("SELECT * FROM rule_versions WHERE decision_key = $1 ORDER BY version ASC", [key]);
    return result.rows.map(rowToVersion);
  }

  async listLookupTables() {
    const result = await this.client.query("SELECT * FROM lookup_tables ORDER BY updated_at DESC, id ASC", []);
    return result.rows.map(rowToLookupTable);
  }

  async listMessages(params = {}) {
    const values = [];
    const where = [];
    if (params.status) {
      values.push(params.status);
      where.push(`status = $${values.length}`);
    }
    if (params.surface) {
      values.push(params.surface);
      where.push(`surface = $${values.length}`);
    }
    const result = await this.client.query(
      `SELECT * FROM messages ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY updated_at DESC, id ASC`,
      values
    );
    return result.rows.map(rowToMessage);
  }

  async listConditionBlocks() {
    const result = await this.client.query("SELECT * FROM condition_blocks ORDER BY name ASC, id ASC", []);
    return result.rows.map(rowToConditionBlock);
  }

  async listSchemaItems(params = {}) {
    const values = [];
    const where = [];
    if (params.kind) {
      values.push(params.kind);
      where.push(`kind = $${values.length}`);
    }
    const result = await this.client.query(
      `SELECT * FROM schema_items ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY kind ASC, name ASC`,
      values
    );
    return result.rows.map(rowToSchemaItem);
  }

  async getSettings() {
    const result = await this.client.query("SELECT key, value_json FROM settings ORDER BY key ASC", []);
    return Object.fromEntries(result.rows.map((row) => [row.key, parseJson(row.value_json)]));
  }

  async updateSettings(input, author = "system") {
    const now = new Date().toISOString();
    const before = await this.getSettings();
    if (Object.hasOwn(input, "bootstrap_tokens_enabled") && input.bootstrap_tokens_enabled === false && !(await this.hasActiveAdminToken())) {
      throw new Error("Create an active DB admin token before disabling bootstrap tokens");
    }
    await this.transaction(async () => {
      for (const [key, value] of Object.entries(input || {})) {
        if (!allowedSettingKeys.has(key)) continue;
        await this.client.query(
          `INSERT INTO settings (key, value_json, updated_at, updated_by)
           VALUES ($1, $2::jsonb, $3, $4)
           ON CONFLICT(key) DO UPDATE SET
             value_json = EXCLUDED.value_json,
             updated_at = EXCLUDED.updated_at,
             updated_by = EXCLUDED.updated_by`,
          [key, JSON.stringify(value ?? null), now, author]
        );
      }
    });
    const updated = await this.getSettings();
    await this.recordAssistantProviderConfigEvent(input || {}, before, updated, author, now);
    return updated;
  }

  async replaceSchemaItems(kind, items, author = "system") {
    if (!["attribute", "segment", "context"].includes(kind)) throw new Error("Schema kind must be attribute, segment, or context");
    if (!Array.isArray(items)) throw new Error("Schema items must be an array");
    const now = new Date().toISOString();
    await this.transaction(async () => {
      await this.client.query("DELETE FROM schema_items WHERE kind = $1", [kind]);
      for (const item of items) {
        if (!item || typeof item !== "object" || !item.name) throw new Error("Each schema item must include a name");
        await this.client.query(
          `INSERT INTO schema_items (kind, name, type, dimension, source, raw_json, updated_at, author)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
           ON CONFLICT(kind, name) DO UPDATE SET
             type = EXCLUDED.type,
             dimension = EXCLUDED.dimension,
             source = EXCLUDED.source,
             raw_json = EXCLUDED.raw_json,
             updated_at = EXCLUDED.updated_at,
             author = EXCLUDED.author`,
          [
            kind,
            String(item.name),
            String(item.type || (kind === "segment" ? "boolean" : "string")),
            item.dimension ? String(item.dimension) : "",
            item.source ? String(item.source) : "manual",
            JSON.stringify(item),
            now,
            author
          ]
        );
      }
    });
    return this.listSchemaItems({ kind });
  }

  async hasActiveAdminToken() {
    const result = await this.client.query("SELECT scopes_json FROM api_tokens WHERE revoked_at IS NULL", []);
    return result.rows.some((row) => {
      const scopes = parseJson(row.scopes_json, []);
      return Array.isArray(scopes) && scopes.includes("admin");
    });
  }

  async recordAssistantProviderConfigEvent(input, before, after, author = "system", now = new Date().toISOString()) {
    const touched = assistantProviderSettingKeys.filter((key) => Object.hasOwn(input, key));
    if (!touched.length) return;
    const changes = {};
    for (const key of touched) {
      const previous = assistantProviderSettingValue(key, before[key]);
      const current = assistantProviderSettingValue(key, after[key]);
      if (previous !== current) changes[key] = { from: previous, to: current };
    }
    if (!Object.keys(changes).length) return;
    await this.client.query(
      `INSERT INTO assistant_provider_config_events (id, changed_at, changed_by, changes_json, snapshot_json)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)`,
      [randomId(), now, author || "system", JSON.stringify(changes), JSON.stringify(assistantProviderSnapshot(after))]
    );
  }

  async transaction(fn) {
    await this.client.query("BEGIN", []);
    try {
      const result = await fn();
      await this.client.query("COMMIT", []);
      return result;
    } catch (error) {
      await this.client.query("ROLLBACK", []).catch(() => {});
      throw error;
    }
  }
}

function rowToRuleSet(row) {
  return {
    name: row.name,
    decision_key: row.decision_key,
    description: row.description,
    input_schema: parseJson(row.input_schema_json, {}),
    output_schema: parseJson(row.output_schema_json, {}),
    type: normalizeRuleSetType(row.type),
    priority: Number(row.priority || 0),
    surface: row.surface || "",
    cache_policy: parseJson(row.cache_policy_json, {}),
    metadata: parseJson(row.metadata_json, {}),
    author: row.author,
    status: row.status,
    tags: parseJson(row.tags_json, []),
    created_at: isoValue(row.created_at),
    updated_at: isoValue(row.updated_at),
    draft: parseJson(row.draft_json, {})
  };
}

function rowToPublicRuleSet(row) {
  const latest = row.latest_version ? { version: Number(row.latest_version), published_at: isoValue(row.last_published_at) } : null;
  const ruleSet = rowToRuleSet(row);
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

function rowToVersion(row) {
  return {
    version: Number(row.version || 0),
    published_at: isoValue(row.published_at),
    author: row.author,
    definition: parseJson(row.definition_json, {}),
    metadata: parseJson(row.metadata_json, {})
  };
}

function rowToLookupTable(row) {
  return {
    id: row.id,
    name: row.name,
    key_column: row.key_column,
    rows: parseJson(row.rows_json, []),
    metadata: parseJson(row.metadata_json, {}),
    updated_at: isoValue(row.updated_at),
    author: row.author,
    version: Number(row.version || 1)
  };
}

function rowToMessage(row) {
  return {
    id: row.id,
    name: row.name,
    surface: row.surface || "",
    status: row.status || "active",
    content_schema: parseJson(row.content_schema_json, {}),
    default_content: parseJson(row.default_content_json, {}),
    metadata: parseJson(row.metadata_json, {}),
    updated_at: isoValue(row.updated_at),
    author: row.author,
    version: Number(row.version || 1)
  };
}

function rowToConditionBlock(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    conditions: parseJson(row.conditions_json, []),
    tags: parseJson(row.tags_json, []),
    metadata: parseJson(row.metadata_json, {}),
    updated_at: isoValue(row.updated_at),
    author: row.author
  };
}

function rowToSchemaItem(row) {
  return {
    kind: row.kind,
    name: row.name,
    type: row.type,
    dimension: row.dimension || "",
    source: row.source || "manual",
    updated_at: isoValue(row.updated_at),
    author: row.author,
    raw: parseJson(row.raw_json, {})
  };
}

function parseJson(value, fallback = null) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback === null ? value : fallback;
  }
}

function isoValue(value) {
  if (!value) return value || "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalizeRuleSetType(type) {
  return ["decision", "inapp_message", "experiment"].includes(type) ? type : "decision";
}

function randomId() {
  return randomBytes(8).toString("hex");
}

function assistantProviderSnapshot(settings = {}) {
  return {
    enabled: settings.assistant_llm_enabled === true,
    provider: String(settings.assistant_llm_provider || "openai"),
    base_url: String(settings.assistant_llm_base_url || ""),
    model: String(settings.assistant_llm_model || ""),
    policy: String(settings.assistant_llm_policy || "balanced"),
    api_key: assistantProviderSettingValue("assistant_llm_api_key", settings.assistant_llm_api_key),
    timeout_ms: Number(settings.assistant_llm_timeout_ms || 0)
  };
}

function assistantProviderSettingValue(key, value) {
  if (key === "assistant_llm_api_key") return value ? "configured" : "not_configured";
  if (key === "assistant_llm_enabled") return value === true ? "enabled" : "disabled";
  if (value == null || value === "") return "";
  return String(value);
}

function nativeReadDeploymentReadiness(error = null) {
  return {
    status: error ? "not_ready" : "production_ready",
    summary: error
      ? "Native Postgres read contract cannot query the database."
      : "Native Postgres read contract can query row-level tables.",
    recommended_max_replicas: null,
    backup_mode: "managed_database",
    checks: [
      {
        key: "database_connection",
        ok: !error,
        level: error ? "error" : "ok",
        label: "Database connection",
        detail: error ? error.message : "Postgres read probe succeeded."
      },
      {
        key: "native_row_store",
        ok: true,
        level: "ok",
        label: "Native row store",
        detail: "Reads use row-level Postgres tables instead of snapshot JSON."
      }
    ]
  };
}

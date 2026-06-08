import { nativePostgresAdapterInfo } from "./storePostgresNativeSchema.js";

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

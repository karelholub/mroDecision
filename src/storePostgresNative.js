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

  async getLookupTable(id) {
    const result = await this.client.query("SELECT * FROM lookup_tables WHERE id = $1", [id]);
    const row = result.rows[0];
    return row ? rowToLookupTable(row) : null;
  }

  async replaceLookupTable(id, input = {}, author = "system") {
    if (!id) throw new Error("Lookup table id is required");
    const existing = await this.getLookupTable(id);
    const now = new Date().toISOString();
    const table = {
      id,
      name: input.name || existing?.name || id,
      key_column: input.key_column || existing?.key_column || "key",
      rows: Array.isArray(input.rows) ? input.rows : [],
      metadata: isPlainObject(input.metadata) ? input.metadata : existing?.metadata || {},
      updated_at: now,
      author,
      version: Number(existing?.version || 0) + 1
    };
    await this.transaction(async () => {
      await this.client.query(
        `INSERT INTO lookup_tables (id, name, key_column, rows_json, metadata_json, updated_at, author, version)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)
         ON CONFLICT(id) DO UPDATE SET
           name = EXCLUDED.name,
           key_column = EXCLUDED.key_column,
           rows_json = EXCLUDED.rows_json,
           metadata_json = EXCLUDED.metadata_json,
           updated_at = EXCLUDED.updated_at,
           author = EXCLUDED.author,
           version = EXCLUDED.version`,
        lookupTableParams(table)
      );
      await this.insertLookupVersion(table);
    });
    return table;
  }

  async insertLookupVersion(table) {
    await this.client.query(
      `INSERT INTO lookup_table_versions (id, version, name, key_column, rows_json, metadata_json, updated_at, author)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
       ON CONFLICT(id, version) DO UPDATE SET
         name = EXCLUDED.name,
         key_column = EXCLUDED.key_column,
         rows_json = EXCLUDED.rows_json,
         metadata_json = EXCLUDED.metadata_json,
         updated_at = EXCLUDED.updated_at,
         author = EXCLUDED.author`,
      [
        table.id,
        Number(table.version || 1),
        table.name,
        table.key_column || "key",
        JSON.stringify(Array.isArray(table.rows) ? table.rows : []),
        JSON.stringify(isPlainObject(table.metadata) ? table.metadata : {}),
        table.updated_at || new Date().toISOString(),
        table.author || "system"
      ]
    );
  }

  async listLookupTableVersions(id) {
    if (!(await this.getLookupTable(id))) throw new Error(`Lookup table not found: ${id}`);
    const result = await this.client.query("SELECT * FROM lookup_table_versions WHERE id = $1 ORDER BY version DESC", [id]);
    return result.rows.map(rowToLookupTableVersionSummary);
  }

  async getLookupTableVersion(id, requestedVersion) {
    if (!(await this.getLookupTable(id))) throw new Error(`Lookup table not found: ${id}`);
    const result = await this.client.query("SELECT * FROM lookup_table_versions WHERE id = $1 AND version = $2", [id, Number(requestedVersion)]);
    const row = result.rows[0];
    if (!row) throw new Error(`Lookup table version not found: ${requestedVersion}`);
    return rowToLookupTable(row);
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

  async getMessage(id) {
    const result = await this.client.query("SELECT * FROM messages WHERE id = $1", [id]);
    const row = result.rows[0];
    return row ? rowToMessage(row) : null;
  }

  async latestMessageVersion(id) {
    const result = await this.client.query("SELECT MAX(version) AS version FROM message_versions WHERE id = $1", [id]);
    return Number(result.rows[0]?.version || 0);
  }

  async upsertMessage(id, input = {}, author = "system") {
    if (!id) throw new Error("Message id is required");
    const existing = await this.getMessage(id);
    const now = new Date().toISOString();
    const nextVersion = Number(existing?.version || await this.latestMessageVersion(id) || 0) + 1;
    const message = {
      id,
      name: input.name || existing?.name || id,
      surface: input.surface || existing?.surface || "",
      status: ["active", "archived"].includes(input.status) ? input.status : existing?.status || "active",
      content_schema: isPlainObject(input.content_schema) ? input.content_schema : existing?.content_schema || {},
      default_content: isPlainObject(input.default_content) ? input.default_content : existing?.default_content || {},
      metadata: isPlainObject(input.metadata) ? input.metadata : existing?.metadata || {},
      updated_at: now,
      author,
      version: nextVersion
    };
    await this.transaction(async () => {
      await this.client.query(
        `INSERT INTO messages (
          id, name, surface, status, content_schema_json, default_content_json, metadata_json, updated_at, author, version
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10)
        ON CONFLICT(id) DO UPDATE SET
          name = EXCLUDED.name,
          surface = EXCLUDED.surface,
          status = EXCLUDED.status,
          content_schema_json = EXCLUDED.content_schema_json,
          default_content_json = EXCLUDED.default_content_json,
          metadata_json = EXCLUDED.metadata_json,
          updated_at = EXCLUDED.updated_at,
          author = EXCLUDED.author,
          version = EXCLUDED.version`,
        messageParams(message)
      );
      await this.insertMessageVersion(message);
    });
    return message;
  }

  async insertMessageVersion(message) {
    await this.client.query(
      `INSERT INTO message_versions (
         id, version, name, surface, status, content_schema_json, default_content_json, metadata_json, updated_at, author
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10)
       ON CONFLICT(id, version) DO UPDATE SET
         name = EXCLUDED.name,
         surface = EXCLUDED.surface,
         status = EXCLUDED.status,
         content_schema_json = EXCLUDED.content_schema_json,
         default_content_json = EXCLUDED.default_content_json,
         metadata_json = EXCLUDED.metadata_json,
         updated_at = EXCLUDED.updated_at,
         author = EXCLUDED.author`,
      [
        message.id,
        Number(message.version || 1),
        message.name,
        message.surface || "",
        message.status || "active",
        JSON.stringify(message.content_schema || {}),
        JSON.stringify(message.default_content || {}),
        JSON.stringify(isPlainObject(message.metadata) ? message.metadata : {}),
        message.updated_at || new Date().toISOString(),
        message.author || "system"
      ]
    );
  }

  async listMessageVersions(id) {
    if (!(await this.getMessage(id))) throw new Error(`Message not found: ${id}`);
    const result = await this.client.query("SELECT * FROM message_versions WHERE id = $1 ORDER BY version DESC", [id]);
    return result.rows.map(rowToMessageVersionSummary);
  }

  async getMessageVersion(id, requestedVersion) {
    if (!(await this.getMessage(id))) throw new Error(`Message not found: ${id}`);
    const result = await this.client.query("SELECT * FROM message_versions WHERE id = $1 AND version = $2", [id, Number(requestedVersion)]);
    const row = result.rows[0];
    if (!row) throw new Error(`Message version not found: ${requestedVersion}`);
    return rowToMessage(row);
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

  async createRuleSet(input, author = "system") {
    const key = normalizeKey(input.decision_key || input.name);
    if (!key) throw new Error("decision_key is required");
    if (await this.getRuleSet(key)) throw new Error(`Rule set already exists: ${key}`);
    const now = new Date().toISOString();
    const ruleSet = {
      name: input.name || key,
      decision_key: key,
      description: input.description || "",
      input_schema: input.input_schema || {},
      output_schema: input.output_schema || {},
      type: normalizeRuleSetType(input.type),
      priority: Number(input.priority || 0),
      surface: input.surface || "",
      cache_policy: normalizeCachePolicy(input.cache_policy),
      metadata: isPlainObject(input.metadata) ? input.metadata : {},
      author,
      status: "draft",
      tags: Array.isArray(input.tags) ? input.tags : [],
      created_at: now,
      updated_at: now,
      draft: input.draft || input.definition || { fallback: { result: "deferred", outputs: {} }, branches: [] },
      versions: []
    };
    await this.insertRuleSet(ruleSet);
    return ruleSet;
  }

  async upsertRuleSet(input, author = "system") {
    const existing = await this.getRuleSet(input.decision_key);
    if (!existing) {
      const ruleSet = await this.createRuleSet(input, author);
      await this.replaceVersions(ruleSet.decision_key, input.versions || []);
      if (input.status && input.status !== ruleSet.status) {
        await this.client.query("UPDATE rule_sets SET status = $1 WHERE decision_key = $2", [input.status, ruleSet.decision_key]);
        ruleSet.status = input.status;
      }
      ruleSet.versions = input.versions || [];
      return ruleSet;
    }
    const updated = {
      ...existing,
      name: input.name,
      description: input.description || "",
      input_schema: input.input_schema || {},
      output_schema: input.output_schema || {},
      type: normalizeRuleSetType(input.type || existing.type),
      priority: Number(input.priority ?? existing.priority ?? 0),
      surface: input.surface ?? existing.surface ?? "",
      cache_policy: normalizeCachePolicy(input.cache_policy ?? existing.cache_policy),
      metadata: isPlainObject(input.metadata) ? input.metadata : existing.metadata,
      tags: Array.isArray(input.tags) ? input.tags : [],
      draft: input.draft || input.definition || existing.draft,
      versions: Array.isArray(input.versions) ? input.versions : existing.versions,
      status: input.status || (input.versions?.length ? "published" : "draft"),
      author,
      updated_at: new Date().toISOString()
    };
    await this.transaction(async () => {
      await this.updateRuleSetRow(updated);
      await this.replaceVersions(updated.decision_key, updated.versions, { useExistingTransaction: true });
    });
    return updated;
  }

  async updateDraft(key, input, author = "system") {
    const ruleSet = await this.getRuleSet(key);
    if (!ruleSet) throw new Error(`Rule set not found: ${key}`);
    const updated = {
      ...ruleSet,
      name: input.name ?? ruleSet.name,
      description: input.description ?? ruleSet.description,
      input_schema: input.input_schema ?? ruleSet.input_schema,
      output_schema: input.output_schema ?? ruleSet.output_schema,
      type: normalizeRuleSetType(input.type ?? ruleSet.type),
      priority: Number(input.priority ?? ruleSet.priority ?? 0),
      surface: input.surface ?? ruleSet.surface ?? "",
      cache_policy: normalizeCachePolicy(input.cache_policy ?? ruleSet.cache_policy),
      metadata: mergeApprovalMetadata(ruleSet.metadata, input.metadata),
      tags: Array.isArray(input.tags) ? input.tags : ruleSet.tags,
      draft: input.draft || input.definition || ruleSet.draft,
      author,
      status: ruleSet.status === "archived" ? "archived" : "draft",
      updated_at: new Date().toISOString()
    };
    updated.metadata = resetApprovalForDraftEdit(updated.metadata, author);
    await this.updateRuleSetRow(updated);
    return updated;
  }

  async publish(key, author = "system") {
    const ruleSet = await this.getRuleSet(key);
    if (!ruleSet) throw new Error(`Rule set not found: ${key}`);
    if (ruleSet.status === "archived") throw new Error("Archived rule sets cannot be published");
    if (!ruleSet.draft) throw new Error("Rule set has no draft to publish");
    const nextVersion = Math.max(0, ...ruleSet.versions.map((item) => Number(item.version || 0))) + 1;
    const publishedAt = new Date().toISOString();
    const version = {
      version: nextVersion,
      published_at: publishedAt,
      author,
      definition: structuredClone(ruleSet.draft),
      metadata: structuredClone(ruleSet.metadata || {})
    };
    await this.transaction(async () => {
      await this.client.query(
        `INSERT INTO rule_versions (decision_key, version, published_at, author, definition_json, metadata_json)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
        [key, version.version, version.published_at, version.author, JSON.stringify(version.definition), JSON.stringify(version.metadata)]
      );
      await this.updateRuleSetRow({ ...ruleSet, status: "published", author, updated_at: publishedAt });
    });
    return version;
  }

  async archiveRuleSet(key, author = "system") {
    const ruleSet = await this.getRuleSet(key);
    if (!ruleSet) throw new Error(`Rule set not found: ${key}`);
    const updated = { ...ruleSet, status: "archived", author, updated_at: new Date().toISOString() };
    await this.updateRuleSetRow(updated);
    return updated;
  }

  async insertRuleSet(ruleSet) {
    await this.client.query(
      `INSERT INTO rule_sets (
        decision_key, name, description, input_schema_json, output_schema_json,
        type, priority, surface, cache_policy_json, metadata_json,
        author, status, tags_json, draft_json, created_at, updated_at
      ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13::jsonb, $14::jsonb, $15, $16)`,
      ruleSetParams(ruleSet)
    );
  }

  async updateRuleSetRow(ruleSet) {
    await this.client.query(
      `UPDATE rule_sets SET
        name = $2,
        description = $3,
        input_schema_json = $4::jsonb,
        output_schema_json = $5::jsonb,
        type = $6,
        priority = $7,
        surface = $8,
        cache_policy_json = $9::jsonb,
        metadata_json = $10::jsonb,
        author = $11,
        status = $12,
        tags_json = $13::jsonb,
        draft_json = $14::jsonb,
        updated_at = $16
       WHERE decision_key = $1`,
      ruleSetParams(ruleSet)
    );
  }

  async replaceVersions(decisionKey, versions = [], options = {}) {
    const operation = async () => {
      await this.client.query("DELETE FROM rule_versions WHERE decision_key = $1", [decisionKey]);
      for (const version of versions || []) {
        await this.client.query(
          `INSERT INTO rule_versions (decision_key, version, published_at, author, definition_json, metadata_json)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
          [
            decisionKey,
            Number(version.version),
            version.published_at || new Date().toISOString(),
            version.author || "system",
            JSON.stringify(version.definition || {}),
            JSON.stringify(isPlainObject(version.metadata) ? version.metadata : {})
          ]
        );
      }
    };
    if (options.useExistingTransaction) {
      await operation();
      return;
    }
    await this.transaction(operation);
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

function rowToLookupTableVersionSummary(row) {
  const rows = parseJson(row.rows_json, []);
  return {
    id: row.id,
    version: Number(row.version || 1),
    name: row.name,
    key_column: row.key_column,
    row_count: Array.isArray(rows) ? rows.length : 0,
    metadata: parseJson(row.metadata_json, {}),
    updated_at: isoValue(row.updated_at),
    author: row.author
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

function rowToMessageVersionSummary(row) {
  const message = rowToMessage(row);
  return {
    id: message.id,
    version: message.version,
    name: message.name,
    surface: message.surface,
    status: message.status,
    content_keys: Object.keys(message.default_content || {}),
    metadata: message.metadata,
    updated_at: message.updated_at,
    author: message.author
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

function normalizeCachePolicy(policy) {
  return isPlainObject(policy) ? policy : {};
}

function ruleSetParams(ruleSet) {
  return [
    ruleSet.decision_key,
    ruleSet.name,
    ruleSet.description || "",
    JSON.stringify(ruleSet.input_schema || {}),
    JSON.stringify(ruleSet.output_schema || {}),
    normalizeRuleSetType(ruleSet.type),
    Number(ruleSet.priority || 0),
    ruleSet.surface || "",
    JSON.stringify(normalizeCachePolicy(ruleSet.cache_policy)),
    JSON.stringify(isPlainObject(ruleSet.metadata) ? ruleSet.metadata : {}),
    ruleSet.author || "system",
    ruleSet.status || "draft",
    JSON.stringify(Array.isArray(ruleSet.tags) ? ruleSet.tags : []),
    JSON.stringify(ruleSet.draft || {}),
    ruleSet.created_at || new Date().toISOString(),
    ruleSet.updated_at || new Date().toISOString()
  ];
}

function lookupTableParams(table) {
  return [
    table.id,
    table.name,
    table.key_column || "key",
    JSON.stringify(Array.isArray(table.rows) ? table.rows : []),
    JSON.stringify(isPlainObject(table.metadata) ? table.metadata : {}),
    table.updated_at || new Date().toISOString(),
    table.author || "system",
    Number(table.version || 1)
  ];
}

function messageParams(message) {
  return [
    message.id,
    message.name,
    message.surface || "",
    message.status || "active",
    JSON.stringify(message.content_schema || {}),
    JSON.stringify(message.default_content || {}),
    JSON.stringify(isPlainObject(message.metadata) ? message.metadata : {}),
    message.updated_at || new Date().toISOString(),
    message.author || "system",
    Number(message.version || 1)
  ];
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeApprovalMetadata(existing = {}, next) {
  if (!isPlainObject(next)) return existing;
  if (Object.hasOwn(next, "approval")) return next;
  return existing.approval ? { ...next, approval: existing.approval } : next;
}

function resetApprovalForDraftEdit(metadata = {}, author = "") {
  const approval = metadata.approval;
  if (!approval || approval.status === "draft") return metadata;
  return {
    ...metadata,
    approval: {
      ...approval,
      status: "draft",
      invalidated_by: author,
      invalidated_at: new Date().toISOString(),
      approved_by: "",
      approved_at: ""
    }
  };
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

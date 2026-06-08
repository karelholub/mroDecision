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

  async save() {
    return undefined;
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

  async listVersions(key) {
    const ruleSet = await this.getRuleSet(key);
    if (!ruleSet) throw new Error(`Rule set not found: ${key}`);
    return ruleSet.versions;
  }

  async getVersion(key, requestedVersion) {
    const ruleSet = await this.getRuleSet(key);
    if (!ruleSet) throw new Error(`Rule set not found: ${key}`);
    if (requestedVersion != null) {
      const version = ruleSet.versions.find((item) => Number(item.version) === Number(requestedVersion));
      if (!version) throw new Error(`Rule version not found: ${requestedVersion}`);
      return version;
    }
    const latest = ruleSet.versions.at(-1);
    if (!latest) throw new Error(`Rule set has no published version: ${key}`);
    return latest;
  }

  async addAudit(entry) {
    await this.client.query(
      `INSERT INTO audit_log (
        evaluated_at, decision_key, profile_key, rule_version, result,
        outputs_json, matched_rules_json, errors_json, entry_json
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)`,
      [
        entry.evaluated_at || new Date().toISOString(),
        entry.decision_key || "",
        entry.profile_key || "",
        Number(entry.rule_version || 0),
        entry.result || "",
        JSON.stringify(entry.outputs || {}),
        JSON.stringify(entry.matched_rules || []),
        JSON.stringify(entry.errors || []),
        JSON.stringify(entry || {})
      ]
    );
  }

  async addExperimentAssignment(input = {}) {
    const assignment = {
      id: input.id || randomId(16),
      assigned_at: input.assigned_at || new Date().toISOString(),
      decision_key: input.decision_key || "",
      profile_key: input.profile_key || "",
      rule_version: Number(input.rule_version || 0),
      variant_key: input.variant_key || "",
      strategy: input.strategy || "",
      reason: input.reason || "",
      bucket: input.bucket == null ? null : Number(input.bucket),
      assignment_json: isPlainObject(input.assignment) ? input.assignment : {}
    };
    await this.client.query(
      `INSERT INTO experiment_assignments (
        id, assigned_at, decision_key, profile_key, rule_version, variant_key,
        strategy, reason, bucket, assignment_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        assignment.id,
        assignment.assigned_at,
        assignment.decision_key,
        assignment.profile_key,
        assignment.rule_version,
        assignment.variant_key,
        assignment.strategy,
        assignment.reason,
        assignment.bucket,
        JSON.stringify(assignment.assignment_json)
      ]
    );
    return assignment;
  }

  async addClientEvent(input = {}) {
    const event = {
      event_id: input.event_id || `evt_${randomId(16)}`,
      event_type: input.event_type,
      occurred_at: input.occurred_at || new Date().toISOString(),
      decision_key: input.decision_key || "",
      profile_key: input.profile_key || "",
      rule_version: input.rule_version ?? null,
      variant_key: input.variant_key || "",
      message_id: input.message_id || "",
      surface: input.surface || "",
      context: input.context || {},
      event: isPlainObject(input.event) ? input.event : {}
    };
    const result = await this.client.query(
      `INSERT INTO client_events (
        event_id, event_type, occurred_at, decision_key, profile_key,
        rule_version, variant_key, message_id, surface, context_json, event_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
      ON CONFLICT(event_id) DO NOTHING
      RETURNING event_json`,
      [
        event.event_id,
        event.event_type,
        event.occurred_at,
        event.decision_key,
        event.profile_key,
        event.rule_version,
        event.variant_key,
        event.message_id,
        event.surface,
        JSON.stringify(event.context),
        JSON.stringify(event)
      ]
    );
    if (!result.rows.length) {
      const existing = await this.client.query("SELECT event_json FROM client_events WHERE event_id = $1", [event.event_id]);
      return {
        ...(parseJson(existing.rows[0]?.event_json, event)),
        accepted: false,
        duplicate: true
      };
    }
    return { ...event, accepted: true, duplicate: false };
  }

  async countClientEvents(params = {}) {
    const values = [];
    const conditions = [];
    for (const key of ["event_type", "decision_key", "profile_key", "variant_key", "message_id", "surface"]) {
      if (params[key]) {
        values.push(params[key]);
        conditions.push(`${key} = $${values.length}`);
      }
    }
    if (params.since) {
      values.push(params.since);
      conditions.push(`occurred_at >= $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.client.query(`SELECT COUNT(*) AS count FROM client_events ${where}`, values);
    return Number(result.rows[0]?.count || 0);
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

  async listMessageAssets() {
    const result = await this.client.query(
      "SELECT id, filename, content_type, size_bytes, metadata_json, created_at, created_by FROM message_assets ORDER BY created_at DESC, id ASC",
      []
    );
    const references = await this.messageAssetReferences();
    return result.rows.map((row) => rowToMessageAsset(row, references.get(row.id) || []));
  }

  async createMessageAsset(input = {}, author = "system") {
    const filename = String(input.filename || "message-asset").slice(0, 180);
    const contentType = String(input.content_type || "").toLowerCase();
    const allowedTypes = new Set(["image/gif", "image/jpeg", "image/png", "image/svg+xml", "image/webp"]);
    if (!allowedTypes.has(contentType)) throw new Error("Message asset must be a PNG, JPEG, WebP, GIF, or SVG image");
    const base64 = imageBase64FromInput(input);
    const sizeBytes = Buffer.byteLength(base64, "base64");
    if (sizeBytes <= 0) throw new Error("Message asset is empty");
    if (sizeBytes > 2 * 1024 * 1024) throw new Error("Message asset limit is 2 MB");
    const now = new Date().toISOString();
    const asset = {
      id: `msg_asset_${randomId()}`,
      filename,
      content_type: contentType,
      size_bytes: sizeBytes,
      content_base64: base64,
      metadata: isPlainObject(input.metadata) ? input.metadata : {},
      created_at: now,
      created_by: author
    };
    await this.client.query(
      `INSERT INTO message_assets (
        id, filename, content_type, size_bytes, content_base64, metadata_json, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
      [
        asset.id,
        asset.filename,
        asset.content_type,
        asset.size_bytes,
        asset.content_base64,
        JSON.stringify(asset.metadata),
        asset.created_at,
        asset.created_by
      ]
    );
    return rowToMessageAsset(asset, []);
  }

  async getMessageAsset(id, includeContent = false) {
    const result = await this.client.query("SELECT * FROM message_assets WHERE id = $1", [id]);
    const row = result.rows[0];
    if (!row) throw new Error(`Message asset not found: ${id}`);
    const references = (await this.messageAssetReferences()).get(id) || [];
    const asset = rowToMessageAsset(row, references);
    if (includeContent) asset.content_base64 = row.content_base64;
    return asset;
  }

  async deleteMessageAsset(id, options = {}) {
    const asset = await this.getMessageAsset(id);
    if (asset.used_by.length && !options.force) throw new Error("Message asset is still used");
    await this.client.query("DELETE FROM message_assets WHERE id = $1", [id]);
    return { deleted: true, asset };
  }

  async cleanupMessageAssets() {
    const assets = await this.listMessageAssets();
    const unused = assets.filter((asset) => !asset.used_by.length);
    for (const asset of unused) {
      await this.client.query("DELETE FROM message_assets WHERE id = $1", [asset.id]);
    }
    return { deleted: unused.length, assets: unused };
  }

  async messageAssetReferences() {
    const references = new Map();
    const assetUrlPattern = /\/v1\/message-assets\/([^/]+)\/content/g;
    for (const message of await this.listMessages()) {
      collectAssetReferences(references, assetUrlPattern, {
        default_content: message.default_content || {},
        metadata: message.metadata || {}
      }, {
        object_type: "message",
        id: message.id,
        name: message.name,
        surface: message.surface || "",
        status: message.status || "",
        usage: "message_content"
      });
    }
    for (const ruleSummary of await this.listRuleSets()) {
      const rule = await this.getRuleSet(ruleSummary.decision_key);
      if (!rule) continue;
      collectAssetReferences(references, assetUrlPattern, rule.draft || {}, {
        object_type: "rule",
        id: rule.decision_key,
        name: rule.name,
        surface: rule.surface || "",
        status: rule.status || "",
        usage: "draft_outputs"
      });
      for (const version of rule.versions || []) {
        collectAssetReferences(references, assetUrlPattern, version.definition || {}, {
          object_type: "rule_version",
          id: rule.decision_key,
          name: rule.name,
          surface: rule.surface || "",
          status: "published",
          version: version.version,
          usage: "published_outputs"
        });
      }
    }
    return references;
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

  async listMeiroDeliveries(params = {}) {
    const requestedLimit = Number(params.limit || 20);
    const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 20, 100);
    const values = [];
    const where = [];
    if (params.target) {
      values.push(String(params.target));
      where.push(`target = $${values.length}`);
    }
    if (params.ok === "true" || params.ok === true) {
      where.push("ok = true");
    }
    if (params.ok === "false" || params.ok === false) {
      where.push("ok = false");
    }
    if (params.status) {
      const status = Number(params.status);
      if (Number.isFinite(status)) {
        values.push(status);
        where.push(`status = $${values.length}`);
      }
    }
    if (params.search) {
      const search = `%${String(params.search)}%`;
      values.push(search);
      where.push(`(endpoint ILIKE $${values.length} OR error ILIKE $${values.length} OR response_preview ILIKE $${values.length} OR payload_json::text ILIKE $${values.length})`);
    }
    values.push(limit);
    const result = await this.client.query(
      `SELECT * FROM meiro_deliveries ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY attempted_at DESC LIMIT $${values.length}`,
      values
    );
    return result.rows.map(rowToMeiroDelivery);
  }

  async getMeiroDeliverySummary(params = {}) {
    const deliveries = await this.listMeiroDeliveries({ ...params, limit: params.limit || 100 });
    const targets = {};
    const statuses = {};
    let success = 0;
    let failed = 0;
    let durationTotal = 0;
    for (const item of deliveries) {
      if (item.ok) success += 1;
      else failed += 1;
      durationTotal += item.duration_ms || 0;
      targets[item.target || "unknown"] = (targets[item.target || "unknown"] || 0) + 1;
      statuses[item.status || 0] = (statuses[item.status || 0] || 0) + 1;
    }
    return {
      total: deliveries.length,
      success,
      failed,
      success_rate: deliveries.length ? success / deliveries.length : 0,
      avg_duration_ms: deliveries.length ? Math.round(durationTotal / deliveries.length) : 0,
      targets,
      statuses,
      last_attempted_at: deliveries[0]?.attempted_at || ""
    };
  }

  async recordMeiroDelivery(input = {}) {
    const delivery = {
      id: input.id || randomId(12),
      target: input.target || "unknown",
      endpoint: input.endpoint || "",
      ok: Boolean(input.ok),
      status: Number(input.status || 0),
      attempted_at: input.attempted_at || new Date().toISOString(),
      duration_ms: Number(input.duration_ms || 0),
      error: input.error || "",
      response_preview: input.response_preview || "",
      payload: isPlainObject(input.payload) ? input.payload : {}
    };
    await this.client.query(
      `INSERT INTO meiro_deliveries (
        id, target, endpoint, ok, status, attempted_at, duration_ms, error, response_preview, payload_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        delivery.id,
        delivery.target,
        delivery.endpoint,
        delivery.ok,
        delivery.status,
        delivery.attempted_at,
        delivery.duration_ms,
        delivery.error,
        delivery.response_preview,
        JSON.stringify(delivery.payload)
      ]
    );
    return rowToMeiroDelivery({
      ...delivery,
      payload_json: delivery.payload
    });
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

function rowToMessageAsset(row, usedBy = []) {
  return {
    id: row.id,
    filename: row.filename,
    content_type: row.content_type,
    size_bytes: Number(row.size_bytes || 0),
    content_url: `/v1/message-assets/${encodeURIComponent(row.id)}/content`,
    metadata: parseJson(row.metadata_json, {}),
    created_at: isoValue(row.created_at),
    created_by: row.created_by,
    used_by: usedBy
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

function rowToMeiroDelivery(row) {
  return {
    id: row.id,
    target: row.target || "unknown",
    endpoint: row.endpoint || "",
    ok: Boolean(row.ok),
    status: Number(row.status || 0),
    attempted_at: isoValue(row.attempted_at),
    duration_ms: Number(row.duration_ms || 0),
    error: row.error || "",
    response_preview: row.response_preview || "",
    payload: parseJson(row.payload_json, {})
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

function imageBase64FromInput(input = {}) {
  if (input.data_url) {
    const match = String(input.data_url).match(/^data:([^;,]+);base64,(.+)$/);
    if (!match) throw new Error("data_url must be a base64 data URL");
    if (String(input.content_type || "").toLowerCase() !== match[1].toLowerCase()) throw new Error("content_type must match the data URL media type");
    return match[2];
  }
  if (input.base64) return String(input.base64).replace(/\s+/g, "");
  throw new Error("Message asset requires data_url or base64");
}

function collectAssetReferences(references, pattern, payload, reference) {
  const text = JSON.stringify(payload ?? null);
  for (const match of text.matchAll(pattern)) {
    const id = decodeURIComponent(match[1]);
    if (!references.has(id)) references.set(id, []);
    const existing = references.get(id);
    const key = [
      reference.object_type,
      reference.id,
      reference.usage,
      reference.version || "",
      reference.surface || ""
    ].join(":");
    if (existing.some((item) => item.reference_key === key)) continue;
    existing.push({ ...reference, reference_key: key });
  }
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

function randomId(bytes = 8) {
  return randomBytes(bytes).toString("hex");
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

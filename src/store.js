import { readFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { config, ensureDataDir } from "./config.js";
import { createdAtNow } from "./http.js";

const databaseFile = () => config.dbPath;
const runtimeFile = () => path.join(config.dataDir, "store.runtime.json");
const seedFile = () => path.join(config.dataDir, "seed.json");

export class Store {
  constructor(db) {
    this.db = db;
    this.transactionDepth = 0;
  }

  static async load() {
    await ensureDataDir();
    const db = new DatabaseSync(databaseFile());
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA journal_mode = WAL");
    migrate(db);
    await seedIfEmpty(db);
    return new Store(db);
  }

  async save() {
    // SQLite writes are committed per statement; this method preserves the old store API.
  }

  close() {
    this.db.close();
  }

  listRuleSets() {
    return this.db
      .prepare(
        `SELECT
          rs.*,
          (SELECT MAX(version) FROM rule_versions rv WHERE rv.decision_key = rs.decision_key) AS latest_version,
          (SELECT published_at FROM rule_versions rv WHERE rv.decision_key = rs.decision_key ORDER BY version DESC LIMIT 1) AS last_published_at
         FROM rule_sets rs
         ORDER BY updated_at DESC, decision_key ASC`
      )
      .all()
      .map(rowToPublicRuleSet);
  }

  getRuleSet(key) {
    const row = this.db.prepare("SELECT * FROM rule_sets WHERE decision_key = ?").get(key);
    if (!row) return undefined;
    return {
      ...rowToRuleSet(row),
      versions: this.getVersionsForRuleSet(key)
    };
  }

  createRuleSet(input, author) {
    const key = normalizeKey(input.decision_key || input.name);
    if (!key) badRequest("decision_key is required");
    if (this.getRuleSet(key)) conflict(`Rule set already exists: ${key}`);

    const now = createdAtNow();
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

    insertRuleSet(this.db, ruleSet);
    return ruleSet;
  }

  upsertRuleSet(input, author) {
    const existing = this.getRuleSet(input.decision_key);
    if (!existing) {
      const ruleSet = this.createRuleSet(input, author);
      replaceVersions(this.db, ruleSet.decision_key, input.versions || []);
      if (input.status && input.status !== ruleSet.status) {
        this.db.prepare("UPDATE rule_sets SET status = ? WHERE decision_key = ?").run(input.status, ruleSet.decision_key);
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
      updated_at: createdAtNow()
    };

    updateRuleSet(this.db, updated);
    replaceVersions(this.db, updated.decision_key, updated.versions);
    return updated;
  }

  updateDraft(key, input, author) {
    const ruleSet = this.getRuleSet(key);
    if (!ruleSet) notFound(`Rule set not found: ${key}`);
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
      metadata: isPlainObject(input.metadata) ? input.metadata : ruleSet.metadata,
      tags: Array.isArray(input.tags) ? input.tags : ruleSet.tags,
      draft: input.draft || input.definition || ruleSet.draft,
      author,
      status: ruleSet.status === "archived" ? "archived" : "draft",
      updated_at: createdAtNow()
    };
    updateRuleSet(this.db, updated);
    return updated;
  }

  publish(key, author) {
    const ruleSet = this.getRuleSet(key);
    if (!ruleSet) notFound(`Rule set not found: ${key}`);
    if (ruleSet.status === "archived") badRequest("Archived rule sets cannot be published");
    if (!ruleSet.draft) badRequest("Rule set has no draft to publish");

    const nextVersion = Math.max(0, ...ruleSet.versions.map((item) => item.version)) + 1;
    const version = {
      version: nextVersion,
      published_at: createdAtNow(),
      author,
      definition: structuredClone(ruleSet.draft)
    };

    this.db
      .prepare(
        `INSERT INTO rule_versions (decision_key, version, published_at, author, definition_json)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(key, version.version, version.published_at, version.author, stringify(version.definition));

    const updated = {
      ...ruleSet,
      status: "published",
      author,
      updated_at: version.published_at
    };
    updateRuleSet(this.db, updated);
    return version;
  }

  archiveRuleSet(key, author) {
    const ruleSet = this.getRuleSet(key);
    if (!ruleSet) notFound(`Rule set not found: ${key}`);
    const updated = {
      ...ruleSet,
      status: "archived",
      author,
      updated_at: createdAtNow()
    };
    updateRuleSet(this.db, updated);
    return updated;
  }

  duplicateRuleSet(key, input, author) {
    const ruleSet = this.getRuleSet(key);
    if (!ruleSet) notFound(`Rule set not found: ${key}`);
    const newKey = normalizeKey(input.decision_key || `${key}_copy`);
    if (!newKey) badRequest("decision_key is required");
    if (this.getRuleSet(newKey)) conflict(`Rule set already exists: ${newKey}`);
    const now = createdAtNow();
    const duplicate = {
      ...ruleSet,
      name: input.name || `${ruleSet.name} Copy`,
      decision_key: newKey,
      author,
      status: "draft",
      created_at: now,
      updated_at: now,
      versions: []
    };
    insertRuleSet(this.db, duplicate);
    return duplicate;
  }

  listVersions(key) {
    if (!this.getRuleSet(key)) notFound(`Rule set not found: ${key}`);
    return this.getVersionsForRuleSet(key).map(({ definition, ...version }) => version);
  }

  getVersion(key, requestedVersion) {
    if (!this.getRuleSet(key)) notFound(`Rule set not found: ${key}`);
    const row =
      requestedVersion == null
        ? this.db
            .prepare("SELECT * FROM rule_versions WHERE decision_key = ? ORDER BY version DESC LIMIT 1")
            .get(key)
        : this.db
            .prepare("SELECT * FROM rule_versions WHERE decision_key = ? AND version = ?")
            .get(key, Number(requestedVersion));

    if (!row) {
      if (requestedVersion == null) notFound(`No published version for rule set: ${key}`);
      notFound(`Version not found: ${requestedVersion}`);
    }
    return rowToVersion(row);
  }

  rollbackDraftToVersion(key, requestedVersion, author) {
    const ruleSet = this.getRuleSet(key);
    if (!ruleSet) notFound(`Rule set not found: ${key}`);
    if (ruleSet.status === "archived") badRequest("Archived rule sets cannot be rolled back");
    const version = this.getVersion(key, requestedVersion);
    const updated = {
      ...ruleSet,
      draft: structuredClone(version.definition),
      status: "draft",
      author,
      updated_at: createdAtNow()
    };
    updateRuleSet(this.db, updated);
    return updated;
  }

  addAudit(entry) {
    this.db
      .prepare(
        `INSERT INTO audit_log (
          evaluated_at, decision_key, profile_key, rule_version, result,
          outputs_json, matched_rules_json, errors_json, entry_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.evaluated_at,
        entry.decision_key,
        entry.profile_key,
        entry.rule_version,
        entry.result,
        stringify(entry.outputs || {}),
        stringify(entry.matched_rules || []),
        stringify(entry.errors || []),
        stringify(entry)
      );

    const cutoff = new Date(Date.now() - this.getAuditRetentionDays() * 24 * 60 * 60 * 1000).toISOString();
    this.db.prepare("DELETE FROM audit_log WHERE evaluated_at < ?").run(cutoff);
  }

  queryAudit(params) {
    const conditions = [];
    const values = [];
    for (const key of ["decision_key", "profile_key", "result"]) {
      if (params[key]) {
        conditions.push(`${key} = ?`);
        values.push(params[key]);
      }
    }
    if (params.from) {
      conditions.push("evaluated_at >= ?");
      values.push(params.from);
    }
    if (params.to) {
      conditions.push("evaluated_at <= ?");
      values.push(params.to);
    }
    const limit = Math.min(Number(params.limit || 100), 1000);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT entry_json FROM audit_log ${where} ORDER BY evaluated_at DESC LIMIT ?`)
      .all(...values, limit)
      .map((row) => parse(row.entry_json));
  }

  getMetrics() {
    const now = Date.now();
    const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const rules = this.listRuleSets();
    const settings = this.getSettings();
    const auditSummary = this.db
      .prepare(
        `SELECT
          COUNT(*) AS total_requests,
          SUM(CASE WHEN evaluated_at >= ? THEN 1 ELSE 0 END) AS requests_24h,
          SUM(CASE WHEN evaluated_at >= ? THEN 1 ELSE 0 END) AS requests_7d,
          COUNT(DISTINCT profile_key) AS unique_profiles
         FROM audit_log`
      )
      .get(since24h, since7d);
    const resultDistribution = this.db
      .prepare("SELECT result, COUNT(*) AS count FROM audit_log GROUP BY result ORDER BY count DESC, result ASC LIMIT 8")
      .all();
    const ruleUsage = this.db
      .prepare(
        `SELECT
          decision_key,
          COUNT(*) AS requests,
          SUM(CASE WHEN evaluated_at >= ? THEN 1 ELSE 0 END) AS requests_24h,
          MAX(evaluated_at) AS last_evaluated_at,
          COUNT(DISTINCT profile_key) AS unique_profiles
         FROM audit_log
         GROUP BY decision_key
         ORDER BY requests DESC, decision_key ASC
         LIMIT 10`
      )
      .all(since24h);
    return {
      generated_at: createdAtNow(),
      requests: {
        total: Number(auditSummary.total_requests || 0),
        last_24h: Number(auditSummary.requests_24h || 0),
        last_7d: Number(auditSummary.requests_7d || 0),
        unique_profiles: Number(auditSummary.unique_profiles || 0)
      },
      rules: {
        total: rules.length,
        published: rules.filter((rule) => rule.status === "published").length,
        draft: rules.filter((rule) => rule.status === "draft").length,
        archived: rules.filter((rule) => rule.status === "archived").length
      },
      lookups: {
        total: this.listLookupTables().length
      },
      schema: {
        total: this.listSchemaItems().length,
        attributes: this.listSchemaItems({ kind: "attribute" }).length,
        segments: this.listSchemaItems({ kind: "segment" }).length,
        context: this.listSchemaItems({ kind: "context" }).length,
        last_sync_status: settings.schema_last_sync_status || "never",
        last_synced_at: settings.schema_last_synced_at || "",
        last_sync_count: Number(settings.schema_last_sync_count || 0)
      },
      result_distribution: resultDistribution.map((row) => ({ result: row.result, count: Number(row.count || 0) })),
      rule_usage: ruleUsage.map((row) => ({
        decision_key: row.decision_key,
        requests: Number(row.requests || 0),
        requests_24h: Number(row.requests_24h || 0),
        unique_profiles: Number(row.unique_profiles || 0),
        last_evaluated_at: row.last_evaluated_at || null
      }))
    };
  }

  getRuleMetrics(decisionKey) {
    if (!this.getRuleSet(decisionKey)) notFound(`Rule set not found: ${decisionKey}`);
    const audit = this.queryAudit({ decision_key: decisionKey, limit: 1000 });
    const total = audit.length;
    const results = countBy(audit, (entry) => entry.result || "unknown");
    const matchedBranches = countBy(
      audit.flatMap((entry) => Array.isArray(entry.matched_rules) && entry.matched_rules.length ? entry.matched_rules : ["fallback"]),
      (value) => value
    );
    const recent = audit.slice(0, 20).map((entry) => ({
      evaluated_at: entry.evaluated_at,
      profile_key: entry.profile_key,
      result: entry.result,
      rule_version: entry.rule_version,
      matched_rules: entry.matched_rules || [],
      outputs: entry.outputs || {},
      errors: entry.errors || []
    }));
    return {
      decision_key: decisionKey,
      requests: total,
      unique_profiles: new Set(audit.map((entry) => entry.profile_key)).size,
      fallback_count: audit.filter((entry) => !entry.matched_rules?.length).length,
      error_count: audit.filter((entry) => entry.errors?.length).length,
      result_distribution: Object.entries(results).map(([result, count]) => ({ result, count })),
      matched_branch_distribution: Object.entries(matchedBranches).map(([branch, count]) => ({ branch, count })),
      recent_decisions: recent
    };
  }

  listSchemaItems(params = {}) {
    const conditions = [];
    const values = [];
    if (params.kind) {
      conditions.push("kind = ?");
      values.push(params.kind);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT * FROM schema_items ${where} ORDER BY kind ASC, name ASC`)
      .all(...values)
      .map(rowToSchemaItem);
  }

  replaceSchemaItems(kind, items, author) {
    if (!["attribute", "segment", "context"].includes(kind)) badRequest("Schema kind must be attribute, segment, or context");
    if (!Array.isArray(items)) badRequest("Schema items must be an array");
    const now = createdAtNow();
    const insert = this.db.prepare(
      `INSERT INTO schema_items (kind, name, type, dimension, source, raw_json, updated_at, author)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(kind, name) DO UPDATE SET
         type = excluded.type,
         dimension = excluded.dimension,
         source = excluded.source,
         raw_json = excluded.raw_json,
         updated_at = excluded.updated_at,
         author = excluded.author`
    );
    this.transaction(() => {
      this.db.prepare("DELETE FROM schema_items WHERE kind = ?").run(kind);
      for (const item of items) {
        if (!isPlainObject(item) || !item.name) badRequest("Each schema item must include a name");
        insert.run(
          kind,
          String(item.name),
          String(item.type || (kind === "segment" ? "boolean" : "string")),
          item.dimension ? String(item.dimension) : "",
          item.source ? String(item.source) : "manual",
          stringify(item),
          now,
          author
        );
      }
    });
    return this.listSchemaItems({ kind });
  }

  listLookupTables() {
    return this.db
      .prepare("SELECT * FROM lookup_tables ORDER BY updated_at DESC, id ASC")
      .all()
      .map(rowToLookupTable);
  }

  replaceLookupTable(id, input, author) {
    if (!id) badRequest("Lookup table id is required");
    const now = createdAtNow();
    const existing = this.db.prepare("SELECT * FROM lookup_tables WHERE id = ?").get(id);
    const table = {
      id,
      name: input.name || existing?.name || id,
      key_column: input.key_column || existing?.key_column || "key",
      rows: Array.isArray(input.rows) ? input.rows : [],
      updated_at: now,
      author,
      version: (existing?.version || 0) + 1
    };

    this.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO lookup_tables (id, name, key_column, rows_json, updated_at, author, version)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             key_column = excluded.key_column,
             rows_json = excluded.rows_json,
             updated_at = excluded.updated_at,
             author = excluded.author,
             version = excluded.version`
        )
        .run(table.id, table.name, table.key_column, stringify(table.rows), table.updated_at, table.author, table.version);
      insertLookupVersion(this.db, table);
    });
    return table;
  }

  listLookupTableVersions(id) {
    if (!this.db.prepare("SELECT id FROM lookup_tables WHERE id = ?").get(id)) notFound(`Lookup table not found: ${id}`);
    return this.db
      .prepare("SELECT * FROM lookup_table_versions WHERE id = ? ORDER BY version DESC")
      .all(id)
      .map(rowToLookupTableVersionSummary);
  }

  getLookupTableVersion(id, requestedVersion) {
    if (!this.db.prepare("SELECT id FROM lookup_tables WHERE id = ?").get(id)) notFound(`Lookup table not found: ${id}`);
    const row = this.db
      .prepare("SELECT * FROM lookup_table_versions WHERE id = ? AND version = ?")
      .get(id, Number(requestedVersion));
    if (!row) notFound(`Lookup table version not found: ${requestedVersion}`);
    return rowToLookupTable(row);
  }

  listApiTokens() {
    return this.db
      .prepare("SELECT id, name, scopes_json, decision_keys_json, created_at, last_used_at, revoked_at FROM api_tokens ORDER BY created_at DESC")
      .all()
      .map(rowToApiToken);
  }

  createApiToken(input, author) {
    const scopes = normalizeScopes(input.scopes);
    const decisionKeys = normalizeDecisionKeys(input.decision_keys);
    const now = createdAtNow();
    const plaintext = `dee_${randomBytes(24).toString("base64url")}`;
    const token = {
      id: randomBytes(12).toString("hex"),
      name: input.name || "API token",
      scopes,
      decision_keys: decisionKeys,
      created_at: now,
      created_by: author,
      last_used_at: null,
      revoked_at: null
    };
    this.db
      .prepare(
        `INSERT INTO api_tokens (id, name, token_hash, scopes_json, decision_keys_json, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(token.id, token.name, hashToken(plaintext), stringify(scopes), stringify(decisionKeys), token.created_at, token.created_by);
    return { ...token, token: plaintext };
  }

  revokeApiToken(id, author) {
    const existing = this.db.prepare("SELECT * FROM api_tokens WHERE id = ? AND revoked_at IS NULL").get(id);
    if (!existing) notFound(`Active API token not found: ${id}`);
    const revokedAt = createdAtNow();
    this.db
      .prepare("UPDATE api_tokens SET revoked_at = ?, revoked_by = ? WHERE id = ?")
      .run(revokedAt, author, id);
    return { ...rowToApiToken({ ...existing, revoked_at: revokedAt }), revoked_by: author };
  }

  verifyApiToken(plaintext) {
    const hash = hashToken(plaintext);
    const row = this.db.prepare("SELECT * FROM api_tokens WHERE token_hash = ? AND revoked_at IS NULL").get(hash);
    if (!row) return null;
    this.db.prepare("UPDATE api_tokens SET last_used_at = ? WHERE id = ?").run(createdAtNow(), row.id);
    return rowToApiToken(row);
  }

  getSettings() {
    const rows = this.db.prepare("SELECT key, value_json FROM settings ORDER BY key ASC").all();
    return Object.fromEntries(rows.map((row) => [row.key, parse(row.value_json)]));
  }

  updateSettings(input, author) {
    const allowed = new Set([
      "environment_label",
      "audit_retention_days",
      "meiro_url",
      "meiro_source_slug",
      "meiro_api_url",
      "meiro_api_token",
      "schema_sync_interval_minutes",
      "schema_sync_identifier_type",
      "schema_sync_identifier_value",
      "schema_last_synced_at",
      "schema_last_sync_status",
      "schema_last_sync_error",
      "schema_last_sync_count"
    ]);
    const now = createdAtNow();
    const upsert = this.db.prepare(
      `INSERT INTO settings (key, value_json, updated_at, updated_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`
    );
    for (const [key, value] of Object.entries(input)) {
      if (allowed.has(key)) upsert.run(key, stringify(value), now, author);
    }
    return this.getSettings();
  }

  getAuditRetentionDays() {
    const row = this.db.prepare("SELECT value_json FROM settings WHERE key = 'audit_retention_days'").get();
    return Number(row ? parse(row.value_json) : config.auditRetentionDays) || config.auditRetentionDays;
  }

  exportBundle({ includeAudit = false } = {}) {
    const bundle = {
      kind: "meiro-dee-config-bundle",
      exported_at: createdAtNow(),
      rule_sets: this.db.prepare("SELECT * FROM rule_sets ORDER BY decision_key ASC").all().map((row) => ({
        ...rowToRuleSet(row),
        versions: this.getVersionsForRuleSet(row.decision_key)
      })),
      lookup_tables: this.listLookupTables()
    };
    if (includeAudit) {
      bundle.audit = this.db
        .prepare("SELECT entry_json FROM audit_log ORDER BY evaluated_at DESC")
        .all()
        .map((row) => parse(row.entry_json));
    }
    return bundle;
  }

  importBundle(bundle, author) {
    const imported = { rule_sets: 0, lookup_tables: 0 };
    this.transaction(() => {
      for (const ruleSet of bundle.rule_sets) {
        this.upsertRuleSet(ruleSet, author);
        imported.rule_sets += 1;
      }
      for (const table of bundle.lookup_tables || []) {
        this.replaceLookupTable(table.id, table, author);
        imported.lookup_tables += 1;
      }
    });
    return imported;
  }

  getVersionsForRuleSet(key) {
    return this.db
      .prepare("SELECT * FROM rule_versions WHERE decision_key = ? ORDER BY version ASC")
      .all(key)
      .map(rowToVersion);
  }

  transaction(fn) {
    if (this.transactionDepth > 0) return fn();
    this.transactionDepth += 1;
    this.db.exec("BEGIN");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    } finally {
      this.transactionDepth -= 1;
    }
  }
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rule_sets (
      decision_key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      input_schema_json TEXT NOT NULL DEFAULT '{}',
      output_schema_json TEXT NOT NULL DEFAULT '{}',
      type TEXT NOT NULL DEFAULT 'decision',
      priority INTEGER NOT NULL DEFAULT 0,
      surface TEXT NOT NULL DEFAULT '',
      cache_policy_json TEXT NOT NULL DEFAULT '{}',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      author TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
      tags_json TEXT NOT NULL DEFAULT '[]',
      draft_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rule_versions (
      decision_key TEXT NOT NULL,
      version INTEGER NOT NULL,
      published_at TEXT NOT NULL,
      author TEXT NOT NULL,
      definition_json TEXT NOT NULL,
      PRIMARY KEY (decision_key, version),
      FOREIGN KEY (decision_key) REFERENCES rule_sets(decision_key) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lookup_tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_column TEXT NOT NULL DEFAULT 'key',
      rows_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL,
      author TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS lookup_table_versions (
      id TEXT NOT NULL,
      version INTEGER NOT NULL,
      name TEXT NOT NULL,
      key_column TEXT NOT NULL DEFAULT 'key',
      rows_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL,
      author TEXT NOT NULL,
      PRIMARY KEY (id, version)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evaluated_at TEXT NOT NULL,
      decision_key TEXT NOT NULL,
      profile_key TEXT NOT NULL,
      rule_version INTEGER NOT NULL,
      result TEXT NOT NULL,
      outputs_json TEXT NOT NULL DEFAULT '{}',
      matched_rules_json TEXT NOT NULL DEFAULT '[]',
      errors_json TEXT NOT NULL DEFAULT '[]',
      entry_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_tokens (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      scopes_json TEXT NOT NULL DEFAULT '[]',
      decision_keys_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      last_used_at TEXT,
      revoked_at TEXT,
      revoked_by TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schema_items (
      kind TEXT NOT NULL CHECK (kind IN ('attribute', 'segment', 'context')),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      dimension TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      raw_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL,
      author TEXT NOT NULL,
      PRIMARY KEY (kind, name)
    );

    CREATE INDEX IF NOT EXISTS idx_rule_versions_decision ON rule_versions(decision_key, version);
    CREATE INDEX IF NOT EXISTS idx_audit_decision_time ON audit_log(decision_key, evaluated_at);
    CREATE INDEX IF NOT EXISTS idx_audit_profile_time ON audit_log(profile_key, evaluated_at);
    CREATE INDEX IF NOT EXISTS idx_audit_result_time ON audit_log(result, evaluated_at);
    CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_schema_items_kind ON schema_items(kind, name);
    CREATE INDEX IF NOT EXISTS idx_lookup_table_versions ON lookup_table_versions(id, version);
  `);
  ensureColumn(db, "rule_sets", "type", "TEXT NOT NULL DEFAULT 'decision'");
  ensureColumn(db, "rule_sets", "priority", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "rule_sets", "surface", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "rule_sets", "cache_policy_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "rule_sets", "metadata_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "api_tokens", "decision_keys_json", "TEXT NOT NULL DEFAULT '[]'");
  seedLookupHistory(db);
  seedSettings(db);
}

function seedSettings(db) {
  const now = createdAtNow();
  const defaults = {
    environment_label: "local",
    audit_retention_days: config.auditRetentionDays,
    meiro_url: "",
    meiro_source_slug: "",
    meiro_api_url: "",
    meiro_api_token: "",
    schema_sync_interval_minutes: 15,
    schema_sync_identifier_type: "",
    schema_sync_identifier_value: "",
    schema_last_synced_at: "",
    schema_last_sync_status: "never",
    schema_last_sync_error: "",
    schema_last_sync_count: 0
  };
  const insert = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value_json, updated_at, updated_by)
     VALUES (?, ?, ?, ?)`
  );
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, stringify(value), now, "system");
  }
}

async function seedIfEmpty(db) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM rule_sets").get().count;
  if (count > 0) return;
  const state = await readInitialState();
  for (const ruleSet of state.ruleSets) {
    insertRuleSet(db, ruleSet);
    replaceVersions(db, ruleSet.decision_key, ruleSet.versions || []);
  }
  for (const table of state.lookupTables) {
    const lookupTable = {
      id: table.id,
      name: table.name || table.id,
      key_column: table.key_column || "key",
      rows: table.rows || [],
      updated_at: table.updated_at || createdAtNow(),
      author: table.author || "system",
      version: table.version || 1
    };
    db.prepare(
      `INSERT INTO lookup_tables (id, name, key_column, rows_json, updated_at, author, version)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      lookupTable.id,
      lookupTable.name,
      lookupTable.key_column,
      stringify(lookupTable.rows),
      lookupTable.updated_at,
      lookupTable.author,
      lookupTable.version
    );
    insertLookupVersion(db, lookupTable);
  }
  for (const entry of state.audit) {
    db.prepare(
      `INSERT INTO audit_log (
        evaluated_at, decision_key, profile_key, rule_version, result,
        outputs_json, matched_rules_json, errors_json, entry_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      entry.evaluated_at,
      entry.decision_key,
      entry.profile_key,
      entry.rule_version,
      entry.result,
      stringify(entry.outputs || {}),
      stringify(entry.matched_rules || []),
      stringify(entry.errors || []),
      stringify(entry)
    );
  }
}

async function readInitialState() {
  for (const file of [runtimeFile(), seedFile()]) {
    try {
      const raw = await readFile(file, "utf8");
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return normalizeState({});
}

function insertRuleSet(db, ruleSet) {
  db.prepare(
    `INSERT INTO rule_sets (
      decision_key, name, description, input_schema_json, output_schema_json,
      type, priority, surface, cache_policy_json, metadata_json,
      author, status, tags_json, draft_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    ruleSet.decision_key,
    ruleSet.name,
    ruleSet.description || "",
    stringify(ruleSet.input_schema || {}),
    stringify(ruleSet.output_schema || {}),
    normalizeRuleSetType(ruleSet.type),
    Number(ruleSet.priority || 0),
    ruleSet.surface || "",
    stringify(normalizeCachePolicy(ruleSet.cache_policy)),
    stringify(isPlainObject(ruleSet.metadata) ? ruleSet.metadata : {}),
    ruleSet.author || "system",
    ruleSet.status || (ruleSet.versions?.length ? "published" : "draft"),
    stringify(ruleSet.tags || []),
    stringify(ruleSet.draft || { fallback: { result: "deferred", outputs: {} }, branches: [] }),
    ruleSet.created_at || createdAtNow(),
    ruleSet.updated_at || createdAtNow()
  );
}

function updateRuleSet(db, ruleSet) {
  db.prepare(
    `UPDATE rule_sets SET
      name = ?,
      description = ?,
      input_schema_json = ?,
      output_schema_json = ?,
      type = ?,
      priority = ?,
      surface = ?,
      cache_policy_json = ?,
      metadata_json = ?,
      author = ?,
      status = ?,
      tags_json = ?,
      draft_json = ?,
      updated_at = ?
     WHERE decision_key = ?`
  ).run(
    ruleSet.name,
    ruleSet.description || "",
    stringify(ruleSet.input_schema || {}),
    stringify(ruleSet.output_schema || {}),
    normalizeRuleSetType(ruleSet.type),
    Number(ruleSet.priority || 0),
    ruleSet.surface || "",
    stringify(normalizeCachePolicy(ruleSet.cache_policy)),
    stringify(isPlainObject(ruleSet.metadata) ? ruleSet.metadata : {}),
    ruleSet.author || "system",
    ruleSet.status,
    stringify(ruleSet.tags || []),
    stringify(ruleSet.draft || {}),
    ruleSet.updated_at,
    ruleSet.decision_key
  );
}

function replaceVersions(db, decisionKey, versions) {
  db.prepare("DELETE FROM rule_versions WHERE decision_key = ?").run(decisionKey);
  const insert = db.prepare(
    `INSERT INTO rule_versions (decision_key, version, published_at, author, definition_json)
     VALUES (?, ?, ?, ?, ?)`
  );
  for (const version of versions || []) {
    insert.run(
      decisionKey,
      Number(version.version),
      version.published_at || createdAtNow(),
      version.author || "system",
      stringify(version.definition || {})
    );
  }
}

function insertLookupVersion(db, table) {
  db.prepare(
    `INSERT INTO lookup_table_versions (id, version, name, key_column, rows_json, updated_at, author)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id, version) DO UPDATE SET
       name = excluded.name,
       key_column = excluded.key_column,
       rows_json = excluded.rows_json,
       updated_at = excluded.updated_at,
       author = excluded.author`
  ).run(table.id, table.version, table.name, table.key_column, stringify(table.rows || []), table.updated_at, table.author);
}

function seedLookupHistory(db) {
  const tables = db.prepare("SELECT * FROM lookup_tables").all();
  for (const row of tables) {
    const exists = db
      .prepare("SELECT id FROM lookup_table_versions WHERE id = ? AND version = ?")
      .get(row.id, row.version);
    if (!exists) insertLookupVersion(db, rowToLookupTable(row));
  }
}

function rowToRuleSet(row) {
  return {
    name: row.name,
    decision_key: row.decision_key,
    description: row.description,
    input_schema: parse(row.input_schema_json),
    output_schema: parse(row.output_schema_json),
    type: normalizeRuleSetType(row.type),
    priority: Number(row.priority || 0),
    surface: row.surface || "",
    cache_policy: parse(row.cache_policy_json || "{}"),
    metadata: parse(row.metadata_json || "{}"),
    author: row.author,
    status: row.status,
    tags: parse(row.tags_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
    draft: parse(row.draft_json)
  };
}

function rowToPublicRuleSet(row) {
  const latest = row.latest_version ? { version: row.latest_version, published_at: row.last_published_at } : null;
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
    version: row.version,
    published_at: row.published_at,
    author: row.author,
    definition: parse(row.definition_json)
  };
}

function rowToLookupTable(row) {
  return {
    id: row.id,
    name: row.name,
    key_column: row.key_column,
    rows: parse(row.rows_json),
    updated_at: row.updated_at,
    author: row.author,
    version: row.version
  };
}

function rowToLookupTableVersionSummary(row) {
  return {
    id: row.id,
    version: row.version,
    name: row.name,
    key_column: row.key_column,
    row_count: parse(row.rows_json).length,
    updated_at: row.updated_at,
    author: row.author
  };
}

function rowToApiToken(row) {
  return {
    id: row.id,
    name: row.name,
    scopes: parse(row.scopes_json),
    decision_keys: parse(row.decision_keys_json || "[]"),
    created_at: row.created_at,
    last_used_at: row.last_used_at || null,
    revoked_at: row.revoked_at || null
  };
}

function rowToSchemaItem(row) {
  return {
    kind: row.kind,
    name: row.name,
    type: row.type,
    dimension: row.dimension || "",
    source: row.source || "manual",
    updated_at: row.updated_at,
    author: row.author,
    raw: parse(row.raw_json || "{}")
  };
}

function normalizeScopes(scopes) {
  const allowed = new Set(["viewer", "editor", "publisher", "admin", "evaluate", "client"]);
  const normalized = Array.isArray(scopes) ? scopes.filter((scope) => allowed.has(scope)) : ["evaluate"];
  return [...new Set(normalized.length ? normalized : ["evaluate"])];
}

function normalizeDecisionKeys(keys) {
  return [...new Set((Array.isArray(keys) ? keys : []).map((key) => String(key).trim()).filter(Boolean))];
}

function normalizeState(state) {
  return {
    ruleSets: Array.isArray(state.ruleSets) ? state.ruleSets : [],
    lookupTables: Array.isArray(state.lookupTables) ? state.lookupTables : [],
    audit: Array.isArray(state.audit) ? state.audit : []
  };
}

function normalizeRuleSetType(type) {
  return ["decision", "inapp_message", "experiment"].includes(type) ? type : "decision";
}

function normalizeCachePolicy(policy) {
  return isPlainObject(policy) ? policy : {};
}

function countBy(items, fn) {
  const counts = {};
  for (const item of items) {
    const key = fn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function ensureColumn(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function stringify(value) {
  return JSON.stringify(value ?? null);
}

function parse(value) {
  return JSON.parse(value || "null");
}

function hashToken(plaintext) {
  return createHash("sha256").update(String(plaintext)).digest("hex");
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "bad_request";
  throw error;
}

function conflict(message) {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = "conflict";
  throw error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  error.code = "not_found";
  throw error;
}

import { readFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { config, ensureDataDir } from "./config.js";
import { createdAtNow } from "./http.js";

const databaseFile = () => config.dbPath;
const runtimeFile = () => path.join(config.dataDir, "store.runtime.json");
const seedFile = () => path.join(config.dataDir, "seed.json");
const portableSettingKeys = [
  "environment_label",
  "audit_retention_days",
  "client_event_retention_days",
  "meiro_url",
  "meiro_source_slug",
  "meiro_api_url",
  "meiro_feedback_url",
  "meiro_skill_url",
  "meiro_cli_url",
  "meiro_profile_cache_ttl_seconds",
  "schema_sync_interval_minutes",
  "schema_sync_identifier_type",
  "schema_sync_identifier_value"
];
const redactedBundleSettingKeys = ["meiro_api_token", "meiro_cli_token"];

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

  health() {
    try {
      const row = this.db.prepare("SELECT 1 AS ok").get();
      return { ok: row?.ok === 1, path: config.dbPath };
    } catch (error) {
      return { ok: false, path: config.dbPath, error: error.message };
    }
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
      metadata: mergeApprovalMetadata(ruleSet.metadata, input.metadata),
      tags: Array.isArray(input.tags) ? input.tags : ruleSet.tags,
      draft: input.draft || input.definition || ruleSet.draft,
      author,
      status: ruleSet.status === "archived" ? "archived" : "draft",
      updated_at: createdAtNow()
    };
    updated.metadata = resetApprovalForDraftEdit(updated.metadata, author);
    updateRuleSet(this.db, updated);
    return updated;
  }

  setRuleApproval(key, input, author) {
    const ruleSet = this.getRuleSet(key);
    if (!ruleSet) notFound(`Rule set not found: ${key}`);
    if (ruleSet.status === "archived") badRequest("Archived rule sets cannot be reviewed");
    const status = input.status;
    if (!["submitted", "approved"].includes(status)) badRequest("Approval status must be submitted or approved");
    const now = createdAtNow();
    const existing = ruleSet.metadata?.approval || {};
    const approval = {
      ...existing,
      status,
      draft_hash: input.draft_hash || existing.draft_hash || "",
      note: input.note || "",
      requested_by: status === "submitted" ? author : existing.requested_by || "",
      requested_at: status === "submitted" ? now : existing.requested_at || "",
      approved_by: status === "approved" ? author : "",
      approved_at: status === "approved" ? now : ""
    };
    const updated = {
      ...ruleSet,
      metadata: {
        ...(ruleSet.metadata || {}),
        approval
      },
      author,
      updated_at: now
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
      definition: structuredClone(ruleSet.draft),
      metadata: structuredClone(ruleSet.metadata || {})
    };

    this.db
      .prepare(
        `INSERT INTO rule_versions (decision_key, version, published_at, author, definition_json, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(key, version.version, version.published_at, version.author, stringify(version.definition), stringify(version.metadata));

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
      metadata: isPlainObject(version.metadata) ? structuredClone(version.metadata) : ruleSet.metadata,
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

  addClientEvent(input) {
    const event = {
      event_id: input.event_id || `evt_${randomBytes(16).toString("hex")}`,
      event_type: input.event_type,
      occurred_at: input.occurred_at || createdAtNow(),
      decision_key: input.decision_key,
      profile_key: input.profile_key,
      rule_version: input.rule_version ?? null,
      variant_key: input.variant_key || "",
      message_id: input.message_id || "",
      surface: input.surface || "",
      context: input.context || {},
      event: isPlainObject(input.event) ? input.event : {}
    };
    const result = this.db
      .prepare(
        `INSERT OR IGNORE INTO client_events (
          event_id, event_type, occurred_at, decision_key, profile_key,
          rule_version, variant_key, message_id, surface, context_json, event_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.event_id,
        event.event_type,
        event.occurred_at,
        event.decision_key,
        event.profile_key,
        event.rule_version,
        event.variant_key,
        event.message_id,
        event.surface,
        stringify(event.context),
        stringify(event)
      );
    const accepted = result.changes > 0;
    if (!accepted) {
      const existing = this.db.prepare("SELECT event_json FROM client_events WHERE event_id = ?").get(event.event_id);
      return {
        ...(existing ? parse(existing.event_json) : event),
        accepted: false,
        duplicate: true
      };
    }
    const cutoff = new Date(Date.now() - this.getClientEventRetentionDays() * 24 * 60 * 60 * 1000).toISOString();
    this.db.prepare("DELETE FROM client_events WHERE occurred_at < ?").run(cutoff);
    return { ...event, accepted: true, duplicate: false };
  }

  countClientEvents(params = {}) {
    const conditions = [];
    const values = [];
    for (const key of ["event_type", "decision_key", "profile_key", "variant_key", "message_id", "surface"]) {
      if (params[key]) {
        conditions.push(`${key} = ?`);
        values.push(params[key]);
      }
    }
    if (params.since) {
      conditions.push("occurred_at >= ?");
      values.push(params.since);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const row = this.db.prepare(`SELECT COUNT(*) AS count FROM client_events ${where}`).get(...values);
    return Number(row?.count || 0);
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
    if (params.matched_rule) {
      conditions.push("entry_json LIKE ?");
      values.push(`%"${params.matched_rule}"%`);
    }
    if (params.search) {
      conditions.push("entry_json LIKE ?");
      values.push(`%${params.search}%`);
    }
    const limit = Math.min(Number(params.limit || 100), 1000);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT entry_json FROM audit_log ${where} ORDER BY evaluated_at DESC LIMIT ?`)
      .all(...values, limit)
      .map((row) => parse(row.entry_json));
  }

  getMetrics(options = {}) {
    const now = Date.now();
    const windowHours = normalizeMetricsWindowHours(options.window_hours);
    const sinceWindow = new Date(now - windowHours * 60 * 60 * 1000).toISOString();
    const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const rules = this.listRuleSets();
    const settings = this.getSettings();
    const auditSummary = this.db
      .prepare(
        `SELECT
          COUNT(*) AS total_requests,
          SUM(CASE WHEN evaluated_at >= ? THEN 1 ELSE 0 END) AS requests_window,
          SUM(CASE WHEN evaluated_at >= ? THEN 1 ELSE 0 END) AS requests_24h,
          SUM(CASE WHEN evaluated_at >= ? THEN 1 ELSE 0 END) AS requests_7d,
          COUNT(DISTINCT profile_key) AS unique_profiles,
          COUNT(DISTINCT CASE WHEN evaluated_at >= ? THEN profile_key END) AS unique_profiles_window
         FROM audit_log`
      )
      .get(sinceWindow, since24h, since7d, sinceWindow);
    const resultDistribution = this.db
      .prepare("SELECT result, COUNT(*) AS count FROM audit_log WHERE evaluated_at >= ? GROUP BY result ORDER BY count DESC, result ASC LIMIT 8")
      .all(sinceWindow);
    const ruleUsage = this.db
      .prepare(
        `SELECT
          decision_key,
          COUNT(*) AS requests,
          SUM(CASE WHEN evaluated_at >= ? THEN 1 ELSE 0 END) AS requests_24h,
          MAX(evaluated_at) AS last_evaluated_at,
          COUNT(DISTINCT profile_key) AS unique_profiles
         FROM audit_log
         WHERE evaluated_at >= ?
         GROUP BY decision_key
         ORDER BY requests DESC, decision_key ASC
         LIMIT 10`
      )
      .all(since24h, sinceWindow);
    const clientEventSummary = this.db
      .prepare(
        `SELECT
          event_type,
          COUNT(*) AS count,
          SUM(CASE WHEN occurred_at >= ? THEN 1 ELSE 0 END) AS count_window,
          SUM(CASE WHEN occurred_at >= ? THEN 1 ELSE 0 END) AS count_24h,
          COUNT(DISTINCT profile_key) AS unique_profiles,
          COUNT(DISTINCT CASE WHEN occurred_at >= ? THEN profile_key END) AS unique_profiles_window
         FROM client_events
         GROUP BY event_type
         ORDER BY event_type ASC`
      )
      .all(sinceWindow, since24h, sinceWindow);
    return {
      generated_at: createdAtNow(),
      window: {
        hours: windowHours,
        from: sinceWindow,
        to: new Date(now).toISOString(),
        label: metricsWindowLabel(windowHours)
      },
      requests: {
        total: Number(auditSummary.total_requests || 0),
        window: Number(auditSummary.requests_window || 0),
        last_24h: Number(auditSummary.requests_24h || 0),
        last_7d: Number(auditSummary.requests_7d || 0),
        unique_profiles: Number(auditSummary.unique_profiles || 0),
        unique_profiles_window: Number(auditSummary.unique_profiles_window || 0)
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
      client_events: {
        total: clientEventSummary.reduce((sum, row) => sum + Number(row.count || 0), 0),
        last_24h: clientEventSummary.reduce((sum, row) => sum + Number(row.count_24h || 0), 0),
        window: clientEventSummary.reduce((sum, row) => sum + Number(row.count_window || 0), 0),
        by_type: clientEventSummary.map((row) => ({
          event_type: row.event_type,
          count: Number(row.count_window || 0),
          total_count: Number(row.count || 0),
          count_24h: Number(row.count_24h || 0),
          unique_profiles: Number(row.unique_profiles_window || 0),
          total_unique_profiles: Number(row.unique_profiles || 0)
        }))
      },
      result_distribution: resultDistribution.map((row) => ({ result: row.result, count: Number(row.count || 0) })),
      rule_usage: ruleUsage.map((row) => ({
        decision_key: row.decision_key,
        requests: Number(row.requests || 0),
        requests_window: Number(row.requests || 0),
        requests_24h: Number(row.requests_24h || 0),
        unique_profiles: Number(row.unique_profiles || 0),
        last_evaluated_at: row.last_evaluated_at || null
      }))
    };
  }

  getClientEventMetrics(params = {}) {
    const conditions = [];
    const values = [];
    for (const key of ["decision_key", "profile_key", "event_type", "variant_key", "message_id", "surface"]) {
      if (params[key]) {
        conditions.push(`${key} = ?`);
        values.push(params[key]);
      }
    }
    if (params.event_object) {
      conditions.push("(variant_key = ? OR message_id = ?)");
      values.push(params.event_object, params.event_object);
    }
    if (params.from) {
      conditions.push("occurred_at >= ?");
      values.push(params.from);
    }
    if (params.to) {
      conditions.push("occurred_at <= ?");
      values.push(params.to);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.min(Number(params.limit || 10), 100);
    const group = (column) =>
      this.db
        .prepare(
          `SELECT ${column} AS key, event_type, COUNT(*) AS count, COUNT(DISTINCT profile_key) AS unique_profiles, MAX(occurred_at) AS last_seen_at
           FROM client_events
           ${where}
           GROUP BY ${column}, event_type
           ORDER BY count DESC, key ASC
           LIMIT ?`
        )
        .all(...values, limit)
        .map((row) => ({
          key: row.key || "(empty)",
          event_type: row.event_type,
          count: Number(row.count || 0),
          unique_profiles: Number(row.unique_profiles || 0),
          last_seen_at: row.last_seen_at || null
        }));
    const recent = this.db
      .prepare(`SELECT event_json FROM client_events ${where} ORDER BY occurred_at DESC LIMIT ?`)
      .all(...values, Math.min(Number(params.recent_limit || 20), 100))
      .map((row) => parse(row.event_json));
    return {
      generated_at: createdAtNow(),
      filters: {
        decision_key: params.decision_key || "",
        profile_key: params.profile_key || "",
        event_type: params.event_type || "",
        variant_key: params.variant_key || "",
        message_id: params.message_id || "",
        surface: params.surface || "",
        from: params.from || "",
        to: params.to || ""
      },
      by_rule: group("decision_key"),
      by_variant: group("variant_key"),
      by_message: group("message_id"),
      by_surface: group("surface"),
      by_profile: group("profile_key"),
      recent_events: recent
    };
  }

  getExperimentOperations() {
    const experiments = this.listRuleSets()
      .filter((rule) => rule.type === "experiment")
      .map((rule) => {
        let publishedVersion = null;
        try {
          publishedVersion = rule.version ? this.getVersion(rule.decision_key) : null;
        } catch {
          publishedVersion = null;
        }
        const draftExperiment = rule.metadata?.experiment || {};
        const publishedExperiment = publishedVersion?.metadata?.experiment || {};
        const activeExperiment = publishedVersion ? publishedExperiment : draftExperiment;
        const variants = Array.isArray(activeExperiment.variants) ? activeExperiment.variants : [];
        const eventRows = this.db
          .prepare(
            `SELECT
              variant_key,
              event_type,
              COUNT(*) AS count,
              COUNT(DISTINCT profile_key) AS unique_profiles,
              MAX(occurred_at) AS last_seen_at
             FROM client_events
             WHERE decision_key = ?
             GROUP BY variant_key, event_type
             ORDER BY variant_key ASC, event_type ASC`
          )
          .all(rule.decision_key);
        const eventTotals = this.db
          .prepare(
            `SELECT
              event_type,
              COUNT(*) AS count,
              COUNT(DISTINCT profile_key) AS unique_profiles,
              MAX(occurred_at) AS last_seen_at
             FROM client_events
             WHERE decision_key = ?
             GROUP BY event_type
             ORDER BY event_type ASC`
          )
          .all(rule.decision_key);
        const variantMetrics = variants.map((variant) => {
          const rows = eventRows.filter((row) => (row.variant_key || "") === (variant.key || ""));
          const events = eventCounts(rows);
          return {
            key: variant.key,
            weight: Number(variant.weight || 0),
            outputs: isPlainObject(variant.outputs) ? variant.outputs : {},
            events,
            conversion_rate: conversionRate(events)
          };
        });
        const unconfiguredVariantRows = eventRows
          .filter((row) => row.variant_key && !variants.some((variant) => variant.key === row.variant_key))
          .reduce((groups, row) => {
            const existing = groups.get(row.variant_key) || [];
            existing.push(row);
            groups.set(row.variant_key, existing);
            return groups;
          }, new Map());
        for (const [key, rows] of unconfiguredVariantRows.entries()) {
          const events = eventCounts(rows);
          variantMetrics.push({ key, weight: 0, outputs: {}, events, conversion_rate: conversionRate(events), configured: false });
        }
        const events = eventCounts(eventTotals);
        const baseline = baselineVariant(variantMetrics);
        for (const variant of variantMetrics) {
          variant.baseline = baseline ? variant.key === baseline.key : false;
          variant.lift_vs_baseline = baseline && baseline.conversion_rate > 0
            ? (variant.conversion_rate - baseline.conversion_rate) / baseline.conversion_rate
            : null;
          variant.significance = experimentSignificance(variant, baseline);
        }
        const winner = winnerVariant(variantMetrics);
        const significantWinner = significantWinnerVariant(variantMetrics);
        return {
          name: rule.name,
          decision_key: rule.decision_key,
          status: rule.status,
          experiment_status: activeExperiment.status || "draft",
          draft_status: draftExperiment.status || "draft",
          published_status: publishedExperiment.status || "",
          assignment_unit: activeExperiment.unit || "profile",
          version: rule.version || null,
          last_published_at: rule.last_published_at || null,
          updated_at: rule.updated_at,
          variant_count: variants.length,
          allocation_total: variants.reduce((sum, variant) => sum + Number(variant.weight || 0), 0),
          variants: variantMetrics,
          events,
          conversion_rate: conversionRate(events),
          baseline_variant: baseline?.key || "",
          winner_variant: winner?.key || "",
          winner_lift_vs_baseline: winner?.lift_vs_baseline ?? null,
          significant_winner_variant: significantWinner?.key || "",
          significant_winner_confidence: significantWinner?.significance?.confidence || 0
        };
      });
    return {
      generated_at: createdAtNow(),
      summary: {
        total: experiments.length,
        running: experiments.filter((item) => item.status === "published" && item.experiment_status === "running").length,
        paused: experiments.filter((item) => item.status !== "archived" && item.experiment_status === "paused").length,
        draft: experiments.filter((item) => item.status !== "archived" && item.experiment_status === "draft").length,
        archived: experiments.filter((item) => item.status === "archived").length,
        exposures: experiments.reduce((sum, item) => sum + Number(item.events.exposure?.count || 0), 0),
        impressions: experiments.reduce((sum, item) => sum + Number(item.events.impression?.count || 0), 0),
        conversions: experiments.reduce((sum, item) => sum + Number(item.events.conversion?.count || 0), 0)
      },
      experiments
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
      metadata: isPlainObject(input.metadata) ? input.metadata : existing ? parse(existing.metadata_json || "{}") : {},
      updated_at: now,
      author,
      version: (existing?.version || 0) + 1
    };

    this.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO lookup_tables (id, name, key_column, rows_json, metadata_json, updated_at, author, version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             key_column = excluded.key_column,
             rows_json = excluded.rows_json,
             metadata_json = excluded.metadata_json,
             updated_at = excluded.updated_at,
             author = excluded.author,
             version = excluded.version`
        )
        .run(table.id, table.name, table.key_column, stringify(table.rows), stringify(table.metadata), table.updated_at, table.author, table.version);
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

  listMessages(params = {}) {
    const conditions = [];
    const values = [];
    if (params.status) {
      conditions.push("status = ?");
      values.push(params.status);
    }
    if (params.surface) {
      conditions.push("surface = ?");
      values.push(params.surface);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT * FROM messages ${where} ORDER BY updated_at DESC, id ASC`)
      .all(...values)
      .map(rowToMessage);
  }

  upsertMessage(id, input, author) {
    if (!id) badRequest("Message id is required");
    const existing = this.db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
    const now = createdAtNow();
    const message = {
      id,
      name: input.name || existing?.name || id,
      surface: input.surface || existing?.surface || "",
      status: ["active", "archived"].includes(input.status) ? input.status : existing?.status || "active",
      content_schema: isPlainObject(input.content_schema) ? input.content_schema : existing ? parse(existing.content_schema_json) : {},
      default_content: isPlainObject(input.default_content) ? input.default_content : existing ? parse(existing.default_content_json) : {},
      metadata: isPlainObject(input.metadata) ? input.metadata : existing ? parse(existing.metadata_json) : {},
      updated_at: now,
      author
    };
    this.db
      .prepare(
        `INSERT INTO messages (
          id, name, surface, status, content_schema_json, default_content_json, metadata_json, updated_at, author
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          surface = excluded.surface,
          status = excluded.status,
          content_schema_json = excluded.content_schema_json,
          default_content_json = excluded.default_content_json,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at,
          author = excluded.author`
      )
      .run(
        message.id,
        message.name,
        message.surface,
        message.status,
        stringify(message.content_schema),
        stringify(message.default_content),
        stringify(message.metadata),
        message.updated_at,
        message.author
      );
    return message;
  }

  getMessage(id) {
    const row = this.db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
    return row ? rowToMessage(row) : null;
  }

  listEvaluationProfiles(params = {}) {
    const conditions = [];
    const values = [];
    if (params.decision_key) {
      conditions.push("decision_key = ?");
      values.push(params.decision_key);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT * FROM evaluation_profiles ${where} ORDER BY updated_at DESC, id ASC`)
      .all(...values)
      .map(rowToEvaluationProfile);
  }

  upsertEvaluationProfile(id, input, author) {
    const profileId = normalizeKey(id || input.id || input.name);
    if (!profileId) badRequest("Evaluation profile id is required");
    if (!isPlainObject(input.request)) badRequest("request must be an object");
    const existing = this.db.prepare("SELECT * FROM evaluation_profiles WHERE id = ?").get(profileId);
    const now = createdAtNow();
    const request = input.request;
    const profile = {
      id: profileId,
      name: input.name || existing?.name || profileId,
      decision_key: input.decision_key || request.decision_key || existing?.decision_key || "",
      profile_key: input.profile_key || request.profile_key || existing?.profile_key || "",
      request,
      notes: input.notes || existing?.notes || "",
      updated_at: now,
      author
    };
    this.db
      .prepare(
        `INSERT INTO evaluation_profiles (
          id, name, decision_key, profile_key, request_json, notes, updated_at, author
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          decision_key = excluded.decision_key,
          profile_key = excluded.profile_key,
          request_json = excluded.request_json,
          notes = excluded.notes,
          updated_at = excluded.updated_at,
          author = excluded.author`
      )
      .run(
        profile.id,
        profile.name,
        profile.decision_key,
        profile.profile_key,
        stringify(profile.request),
        profile.notes,
        profile.updated_at,
        profile.author
      );
    return profile;
  }

  deleteEvaluationProfile(id) {
    const result = this.db.prepare("DELETE FROM evaluation_profiles WHERE id = ?").run(id);
    if (!result.changes) notFound(`Evaluation profile not found: ${id}`);
  }

  listConditionBlocks() {
    return this.db
      .prepare("SELECT * FROM condition_blocks ORDER BY name ASC, id ASC")
      .all()
      .map(rowToConditionBlock);
  }

  getConditionBlock(id) {
    const row = this.db.prepare("SELECT * FROM condition_blocks WHERE id = ?").get(id);
    return row ? rowToConditionBlock(row) : undefined;
  }

  upsertConditionBlock(id, input, author) {
    const blockId = normalizeKey(id || input.id || input.name);
    if (!blockId) badRequest("Condition block id is required");
    const existing = this.getConditionBlock(blockId);
    const conditions = normalizeConditionBlockConditions(input.conditions ?? existing?.conditions);
    const now = createdAtNow();
    const block = {
      id: blockId,
      name: input.name || existing?.name || blockId,
      description: input.description ?? existing?.description ?? "",
      conditions,
      tags: Array.isArray(input.tags) ? input.tags : existing?.tags || [],
      metadata: isPlainObject(input.metadata) ? input.metadata : existing?.metadata || {},
      updated_at: now,
      author
    };
    this.db
      .prepare(
        `INSERT INTO condition_blocks (
          id, name, description, conditions_json, tags_json, metadata_json, updated_at, author
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          conditions_json = excluded.conditions_json,
          tags_json = excluded.tags_json,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at,
          author = excluded.author`
      )
      .run(
        block.id,
        block.name,
        block.description,
        stringify(block.conditions),
        stringify(block.tags),
        stringify(block.metadata),
        block.updated_at,
        block.author
      );
    return block;
  }

  deleteConditionBlock(id) {
    const result = this.db.prepare("DELETE FROM condition_blocks WHERE id = ?").run(id);
    if (!result.changes) notFound(`Condition block not found: ${id}`);
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
      if (key === "bootstrap_tokens_enabled" && value === false && !this.hasActiveAdminToken()) {
        badRequest("Create an active DB admin token before disabling bootstrap tokens");
      }
      if (allowed.has(key)) upsert.run(key, stringify(value), now, author);
    }
    return this.getSettings();
  }

  bootstrapTokensEnabled() {
    const row = this.db.prepare("SELECT value_json FROM settings WHERE key = 'bootstrap_tokens_enabled'").get();
    return row ? parse(row.value_json) !== false : config.bootstrapTokensEnabled;
  }

  hasActiveAdminToken() {
    return this.db
      .prepare("SELECT scopes_json FROM api_tokens WHERE revoked_at IS NULL")
      .all()
      .some((row) => parse(row.scopes_json).includes("admin"));
  }

  getAuditRetentionDays() {
    const row = this.db.prepare("SELECT value_json FROM settings WHERE key = 'audit_retention_days'").get();
    return Number(row ? parse(row.value_json) : config.auditRetentionDays) || config.auditRetentionDays;
  }

  getClientEventRetentionDays() {
    const row = this.db.prepare("SELECT value_json FROM settings WHERE key = 'client_event_retention_days'").get();
    return Number(row ? parse(row.value_json) : config.clientEventRetentionDays) || config.clientEventRetentionDays;
  }

  listMeiroDeliveries(params = {}) {
    const requestedLimit = Number(params.limit || 20);
    const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 20, 100);
    const clauses = [];
    const values = [];
    if (params.target) {
      clauses.push("target = ?");
      values.push(String(params.target));
    }
    if (params.ok === "true" || params.ok === true) {
      clauses.push("ok = 1");
    }
    if (params.ok === "false" || params.ok === false) {
      clauses.push("ok = 0");
    }
    if (params.status) {
      const status = Number(params.status);
      if (Number.isFinite(status)) {
        clauses.push("status = ?");
        values.push(status);
      }
    }
    if (params.search) {
      clauses.push("(endpoint LIKE ? OR error LIKE ? OR response_preview LIKE ? OR payload_json LIKE ?)");
      const search = `%${String(params.search)}%`;
      values.push(search, search, search, search);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT * FROM meiro_deliveries ${where} ORDER BY attempted_at DESC LIMIT ?`)
      .all(...values, limit)
      .map(rowToMeiroDelivery);
  }

  getMeiroDeliverySummary(params = {}) {
    const deliveries = this.listMeiroDeliveries({ ...params, limit: params.limit || 100 });
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

  recordMeiroDelivery(input) {
    const delivery = {
      id: input.id || randomBytes(12).toString("hex"),
      target: input.target || "unknown",
      endpoint: input.endpoint || "",
      ok: input.ok ? 1 : 0,
      status: Number(input.status || 0),
      attempted_at: input.attempted_at || createdAtNow(),
      duration_ms: Number(input.duration_ms || 0),
      error: input.error || "",
      response_preview: input.response_preview || "",
      payload: isPlainObject(input.payload) ? input.payload : {}
    };
    this.db
      .prepare(
        `INSERT INTO meiro_deliveries (
          id, target, endpoint, ok, status, attempted_at, duration_ms, error, response_preview, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        delivery.id,
        delivery.target,
        delivery.endpoint,
        delivery.ok,
        delivery.status,
        delivery.attempted_at,
        delivery.duration_ms,
        delivery.error,
        delivery.response_preview,
        stringify(delivery.payload)
      );
    return rowToMeiroDelivery({
      ...delivery,
      payload_json: stringify(delivery.payload)
    });
  }

  exportBundle({ includeAudit = false } = {}) {
    const bundle = {
      kind: "meiro-dee-config-bundle",
      exported_at: createdAtNow(),
      rule_sets: this.db.prepare("SELECT * FROM rule_sets ORDER BY decision_key ASC").all().map((row) => ({
        ...rowToRuleSet(row),
        versions: this.getVersionsForRuleSet(row.decision_key)
      })),
      lookup_tables: this.listLookupTables(),
      messages: this.listMessages(),
      condition_blocks: this.listConditionBlocks(),
      settings: portableSettings(this.getSettings()),
      settings_secrets_redacted: redactedBundleSettingKeys
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
    const imported = { rule_sets: 0, lookup_tables: 0, messages: 0, condition_blocks: 0, settings: 0 };
    this.transaction(() => {
      for (const ruleSet of bundle.rule_sets) {
        this.upsertRuleSet(ruleSet, author);
        imported.rule_sets += 1;
      }
      for (const table of bundle.lookup_tables || []) {
        this.replaceLookupTable(table.id, table, author);
        imported.lookup_tables += 1;
      }
      for (const message of bundle.messages || []) {
        this.upsertMessage(message.id, message, author);
        imported.messages += 1;
      }
      for (const block of bundle.condition_blocks || []) {
        this.upsertConditionBlock(block.id, block, author);
        imported.condition_blocks += 1;
      }
      const settings = portableSettings(bundle.settings || {});
      if (Object.keys(settings).length > 0) {
        this.updateSettings(settings, author);
        imported.settings = Object.keys(settings).length;
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
      metadata_json TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY (decision_key, version),
      FOREIGN KEY (decision_key) REFERENCES rule_sets(decision_key) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lookup_tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_column TEXT NOT NULL DEFAULT 'key',
      rows_json TEXT NOT NULL DEFAULT '[]',
      metadata_json TEXT NOT NULL DEFAULT '{}',
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
      metadata_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL,
      author TEXT NOT NULL,
      PRIMARY KEY (id, version)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      surface TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
      content_schema_json TEXT NOT NULL DEFAULT '{}',
      default_content_json TEXT NOT NULL DEFAULT '{}',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL,
      author TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evaluation_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      decision_key TEXT NOT NULL DEFAULT '',
      profile_key TEXT NOT NULL DEFAULT '',
      request_json TEXT NOT NULL DEFAULT '{}',
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      author TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS condition_blocks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      conditions_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL,
      author TEXT NOT NULL
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

    CREATE TABLE IF NOT EXISTS client_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'exposure', 'conversion')),
      occurred_at TEXT NOT NULL,
      decision_key TEXT NOT NULL,
      profile_key TEXT NOT NULL,
      rule_version INTEGER,
      variant_key TEXT NOT NULL DEFAULT '',
      message_id TEXT NOT NULL DEFAULT '',
      surface TEXT NOT NULL DEFAULT '',
      context_json TEXT NOT NULL DEFAULT '{}',
      event_json TEXT NOT NULL
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

    CREATE TABLE IF NOT EXISTS meiro_deliveries (
      id TEXT PRIMARY KEY,
      target TEXT NOT NULL,
      endpoint TEXT NOT NULL DEFAULT '',
      ok INTEGER NOT NULL DEFAULT 0,
      status INTEGER NOT NULL DEFAULT 0,
      attempted_at TEXT NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      error TEXT NOT NULL DEFAULT '',
      response_preview TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_rule_versions_decision ON rule_versions(decision_key, version);
    CREATE INDEX IF NOT EXISTS idx_audit_decision_time ON audit_log(decision_key, evaluated_at);
    CREATE INDEX IF NOT EXISTS idx_audit_profile_time ON audit_log(profile_key, evaluated_at);
    CREATE INDEX IF NOT EXISTS idx_audit_result_time ON audit_log(result, evaluated_at);
    CREATE INDEX IF NOT EXISTS idx_client_events_decision_time ON client_events(decision_key, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_client_events_profile_time ON client_events(profile_key, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_client_events_type_time ON client_events(event_type, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_schema_items_kind ON schema_items(kind, name);
    CREATE INDEX IF NOT EXISTS idx_lookup_table_versions ON lookup_table_versions(id, version);
    CREATE INDEX IF NOT EXISTS idx_messages_surface_status ON messages(surface, status);
    CREATE INDEX IF NOT EXISTS idx_evaluation_profiles_rule ON evaluation_profiles(decision_key, updated_at);
    CREATE INDEX IF NOT EXISTS idx_condition_blocks_name ON condition_blocks(name, id);
    CREATE INDEX IF NOT EXISTS idx_meiro_deliveries_time ON meiro_deliveries(attempted_at);
  `);
  migrateClientEventsForConversions(db);
  ensureColumn(db, "rule_sets", "type", "TEXT NOT NULL DEFAULT 'decision'");
  ensureColumn(db, "rule_sets", "priority", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "rule_sets", "surface", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "rule_sets", "cache_policy_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "rule_sets", "metadata_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "rule_versions", "metadata_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "lookup_tables", "metadata_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "lookup_table_versions", "metadata_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "api_tokens", "decision_keys_json", "TEXT NOT NULL DEFAULT '[]'");
  seedLookupHistory(db);
  seedSettings(db);
  seedConditionBlocks(db);
}

function seedSettings(db) {
  const now = createdAtNow();
  const defaults = {
    environment_label: "local",
    audit_retention_days: config.auditRetentionDays,
    client_event_retention_days: config.clientEventRetentionDays,
    bootstrap_tokens_enabled: config.bootstrapTokensEnabled,
    meiro_url: "",
    meiro_source_slug: "",
    meiro_api_url: "",
    meiro_api_token: "",
    meiro_feedback_url: "",
    meiro_skill_url: "https://sse-demo.eu1.pipes.meiro.io/skill",
    meiro_cli_url: "",
    meiro_cli_token: "",
    meiro_profile_cache_ttl_seconds: 300,
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

function seedConditionBlocks(db) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM condition_blocks").get().count;
  if (count > 0) return;
  const now = createdAtNow();
  const insert = db.prepare(
    `INSERT INTO condition_blocks (id, name, description, conditions_json, tags_json, metadata_json, updated_at, author)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const block of defaultConditionBlocks()) {
    insert.run(
      block.id,
      block.name,
      block.description || "",
      stringify(block.conditions),
      stringify(block.tags || []),
      stringify(block.metadata || { seeded: true }),
      now,
      "system"
    );
  }
}

function defaultConditionBlocks() {
  return [
    {
      id: "high_intent",
      name: "High intent",
      description: "Lead and web engagement scores indicate a strong buying signal.",
      tags: ["intent"],
      conditions: [
        { source: "attribute", key: "lead_score", operator: "greater_than_or_equal", value: "70" },
        { source: "attribute", key: "web_engagement_score", operator: "greater_than_or_equal", value: "60" }
      ]
    },
    {
      id: "credit_safe",
      name: "Credit safe",
      description: "Suppress customers with high balance or recent late payment risk.",
      tags: ["risk"],
      conditions: [
        { source: "attribute", key: "outstanding_balance_tier", operator: "not_in", value: "high, critical" },
        { source: "attribute", key: "late_payments_count_12m", operator: "less_than_or_equal", value: "1" }
      ]
    },
    {
      id: "retention_risk",
      name: "Retention risk",
      description: "Churn risk score is high enough for retention-oriented treatments.",
      tags: ["retention"],
      conditions: [
        { source: "attribute", key: "churn_risk_score", operator: "greater_than_or_equal", value: "65" }
      ]
    },
    {
      id: "surface_match",
      name: "Surface matches rule",
      description: "Context surface equals the rule surface.",
      tags: ["context"],
      conditions: [
        { source: "context", key: "surface", operator: "equals", value: "" }
      ]
    },
    {
      id: "known_profile",
      name: "Known profile",
      description: "Customer lifetime value exists on the profile.",
      tags: ["quality"],
      conditions: [
        { source: "attribute", key: "customer_lifetime_value", operator: "is_not_blank", value: "" }
      ]
    }
  ];
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
      metadata: isPlainObject(table.metadata) ? table.metadata : {},
      updated_at: table.updated_at || createdAtNow(),
      author: table.author || "system",
      version: table.version || 1
    };
    db.prepare(
      `INSERT INTO lookup_tables (id, name, key_column, rows_json, metadata_json, updated_at, author, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      lookupTable.id,
      lookupTable.name,
      lookupTable.key_column,
      stringify(lookupTable.rows),
      stringify(lookupTable.metadata),
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
    `INSERT INTO rule_versions (decision_key, version, published_at, author, definition_json, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const version of versions || []) {
    insert.run(
      decisionKey,
      Number(version.version),
      version.published_at || createdAtNow(),
      version.author || "system",
      stringify(version.definition || {}),
      stringify(isPlainObject(version.metadata) ? version.metadata : {})
    );
  }
}

function insertLookupVersion(db, table) {
  db.prepare(
    `INSERT INTO lookup_table_versions (id, version, name, key_column, rows_json, metadata_json, updated_at, author)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id, version) DO UPDATE SET
       name = excluded.name,
       key_column = excluded.key_column,
       rows_json = excluded.rows_json,
       metadata_json = excluded.metadata_json,
       updated_at = excluded.updated_at,
       author = excluded.author`
  ).run(table.id, table.version, table.name, table.key_column, stringify(table.rows || []), stringify(table.metadata || {}), table.updated_at, table.author);
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
    definition: parse(row.definition_json),
    metadata: parse(row.metadata_json || "{}")
  };
}

function rowToLookupTable(row) {
  return {
    id: row.id,
    name: row.name,
    key_column: row.key_column,
    rows: parse(row.rows_json),
    metadata: parse(row.metadata_json || "{}"),
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
    metadata: parse(row.metadata_json || "{}"),
    updated_at: row.updated_at,
    author: row.author
  };
}

function rowToMessage(row) {
  return {
    id: row.id,
    name: row.name,
    surface: row.surface || "",
    status: row.status || "active",
    content_schema: parse(row.content_schema_json || "{}"),
    default_content: parse(row.default_content_json || "{}"),
    metadata: parse(row.metadata_json || "{}"),
    updated_at: row.updated_at,
    author: row.author
  };
}

function rowToEvaluationProfile(row) {
  return {
    id: row.id,
    name: row.name,
    decision_key: row.decision_key || "",
    profile_key: row.profile_key || "",
    request: parse(row.request_json || "{}"),
    notes: row.notes || "",
    updated_at: row.updated_at,
    author: row.author
  };
}

function rowToConditionBlock(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    conditions: parse(row.conditions_json || "[]"),
    tags: parse(row.tags_json || "[]"),
    metadata: parse(row.metadata_json || "{}"),
    updated_at: row.updated_at,
    author: row.author
  };
}

function portableSettings(settings) {
  if (!isPlainObject(settings)) return {};
  return Object.fromEntries(
    portableSettingKeys
      .filter((key) => settings[key] !== undefined)
      .map((key) => [key, settings[key]])
  );
}

function rowToMeiroDelivery(row) {
  return {
    id: row.id,
    target: row.target,
    endpoint: row.endpoint || "",
    ok: Boolean(row.ok),
    status: Number(row.status || 0),
    attempted_at: row.attempted_at,
    duration_ms: Number(row.duration_ms || 0),
    error: row.error || "",
    response_preview: row.response_preview || "",
    payload: parse(row.payload_json || "{}")
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

function normalizeConditionBlockConditions(value) {
  if (!Array.isArray(value) || !value.length) badRequest("Condition block conditions must be a non-empty array");
  const allowedSources = new Set(["attribute", "segment", "context", "score"]);
  const allowedOperators = new Set([
    "equals",
    "not_equals",
    "greater_than",
    "greater_than_or_equal",
    "less_than",
    "less_than_or_equal",
    "in",
    "not_in",
    "contains",
    "not_contains",
    "is_blank",
    "is_not_blank",
    "matches_regex",
    "within_last_days",
    "before_date",
    "after_date"
  ]);
  return value.map((condition, index) => {
    if (!isPlainObject(condition)) badRequest(`Condition ${index + 1} must be an object`);
    const source = String(condition.source || "attribute").trim();
    const key = String(condition.key || "").trim();
    const operator = String(condition.operator || "equals").trim();
    if (!allowedSources.has(source)) badRequest(`Condition ${index + 1} has unsupported source`);
    if (!key) badRequest(`Condition ${index + 1} key is required`);
    if (!allowedOperators.has(operator)) badRequest(`Condition ${index + 1} has unsupported operator`);
    return {
      source,
      key,
      operator,
      value: condition.value ?? "",
      ...(condition.value_source && isPlainObject(condition.value_source) ? { value_source: condition.value_source } : {})
    };
  });
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
      invalidated_at: createdAtNow(),
      approved_by: "",
      approved_at: ""
    }
  };
}

function countBy(items, fn) {
  const counts = {};
  for (const item of items) {
    const key = fn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function eventCounts(rows = []) {
  const counts = {};
  for (const row of rows) {
    counts[row.event_type] = {
      count: Number(row.count || 0),
      unique_profiles: Number(row.unique_profiles || 0),
      last_seen_at: row.last_seen_at || null
    };
  }
  return counts;
}

function conversionRate(events = {}) {
  const exposures = Number(events.exposure?.count || 0);
  if (!exposures) return 0;
  return Number(events.conversion?.count || 0) / exposures;
}

function normalizeMetricsWindowHours(value) {
  const parsed = Number(value || 24);
  const allowed = [1, 6, 24, 72, 168, 720];
  return allowed.includes(parsed) ? parsed : 24;
}

function metricsWindowLabel(hours) {
  if (hours === 1) return "Last hour";
  if (hours < 24) return `Last ${hours} hours`;
  if (hours === 24) return "Last 24 hours";
  if (hours === 72) return "Last 3 days";
  if (hours === 168) return "Last 7 days";
  if (hours === 720) return "Last 30 days";
  return `Last ${hours} hours`;
}

function baselineVariant(variants = []) {
  return variants.find((variant) => variant.key === "control") || variants[0] || null;
}

function winnerVariant(variants = []) {
  return variants
    .filter((variant) => Number(variant.events?.exposure?.count || 0) > 0)
    .sort(
      (left, right) =>
        Number(right.conversion_rate || 0) - Number(left.conversion_rate || 0) ||
        Number(right.events?.conversion?.count || 0) - Number(left.events?.conversion?.count || 0) ||
        String(left.key || "").localeCompare(String(right.key || ""))
    )[0] || null;
}

function significantWinnerVariant(variants = []) {
  return variants
    .filter((variant) => !variant.baseline && variant.significance?.significant && Number(variant.lift_vs_baseline || 0) > 0)
    .sort(
      (left, right) =>
        Number(right.significance.confidence || 0) - Number(left.significance.confidence || 0) ||
        Number(right.lift_vs_baseline || 0) - Number(left.lift_vs_baseline || 0)
    )[0] || null;
}

function experimentSignificance(variant = {}, baseline = null) {
  const variantExposures = Number(variant.events?.exposure?.count || 0);
  const variantConversions = Number(variant.events?.conversion?.count || 0);
  const baselineExposures = Number(baseline?.events?.exposure?.count || 0);
  const baselineConversions = Number(baseline?.events?.conversion?.count || 0);
  const minimumExposuresPerVariant = 100;
  const needsExposure = Math.max(0, minimumExposuresPerVariant - Math.min(variantExposures, baselineExposures));
  if (!baseline || variant.baseline) {
    return {
      status: variant.baseline ? "baseline" : "not_comparable",
      significant: false,
      confidence: 0,
      p_value: null,
      minimum_exposures_per_variant: minimumExposuresPerVariant,
      needs_more_exposures: Math.max(0, minimumExposuresPerVariant - variantExposures),
      note: variant.baseline ? "Baseline variant" : "No baseline variant available"
    };
  }
  if (!variantExposures || !baselineExposures) {
    return {
      status: "insufficient_data",
      significant: false,
      confidence: 0,
      p_value: null,
      minimum_exposures_per_variant: minimumExposuresPerVariant,
      needs_more_exposures: needsExposure,
      note: "Need exposures for both baseline and variant"
    };
  }
  const p1 = variantConversions / variantExposures;
  const p2 = baselineConversions / baselineExposures;
  const pooled = (variantConversions + baselineConversions) / (variantExposures + baselineExposures);
  const standardError = Math.sqrt(pooled * (1 - pooled) * ((1 / variantExposures) + (1 / baselineExposures)));
  if (!standardError) {
    return {
      status: "no_variance",
      significant: false,
      confidence: 0,
      p_value: null,
      minimum_exposures_per_variant: minimumExposuresPerVariant,
      needs_more_exposures: needsExposure,
      note: "No conversion variance yet"
    };
  }
  const z = (p1 - p2) / standardError;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  const confidence = Math.max(0, Math.min(1, 1 - pValue));
  const significant = confidence >= 0.95 && needsExposure === 0;
  return {
    status: significant ? "significant_95" : needsExposure > 0 ? "needs_sample" : "not_significant",
    significant,
    confidence,
    p_value: pValue,
    z_score: z,
    minimum_exposures_per_variant: minimumExposuresPerVariant,
    needs_more_exposures: needsExposure,
    note: significant
      ? "Significant at 95% confidence"
      : needsExposure > 0
        ? `Need at least ${needsExposure} more exposures per compared variant before declaring significance`
        : "Difference is not significant at 95% confidence"
  };
}

function normalCdf(value) {
  return 0.5 * (1 + erf(value / Math.SQRT2));
}

function erf(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const approximation = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * approximation;
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function migrateClientEventsForConversions(db) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'client_events'").get();
  if (!row?.sql || row.sql.includes("'conversion'")) return;
  db.exec(`
    ALTER TABLE client_events RENAME TO client_events_old;
    CREATE TABLE client_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'exposure', 'conversion')),
      occurred_at TEXT NOT NULL,
      decision_key TEXT NOT NULL,
      profile_key TEXT NOT NULL,
      rule_version INTEGER,
      variant_key TEXT NOT NULL DEFAULT '',
      message_id TEXT NOT NULL DEFAULT '',
      surface TEXT NOT NULL DEFAULT '',
      context_json TEXT NOT NULL DEFAULT '{}',
      event_json TEXT NOT NULL
    );
    INSERT INTO client_events (
      event_id, event_type, occurred_at, decision_key, profile_key, rule_version,
      variant_key, message_id, surface, context_json, event_json
    )
    SELECT
      event_id, event_type, occurred_at, decision_key, profile_key, rule_version,
      variant_key, message_id, surface, context_json, event_json
    FROM client_events_old;
    DROP TABLE client_events_old;
  `);
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

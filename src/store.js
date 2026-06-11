import { readFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { config, ensureDataDir } from "./config.js";
import { normalizeDecisionStack } from "./decisionStacks.js";
import { createdAtNow } from "./http.js";

const databaseFile = () => config.dbPath;
const runtimeFile = () => path.join(config.dataDir, "store.runtime.json");
const seedFile = () => path.join(config.dataDir, "seed.json");
const defaultSqliteAdapterInfo = {
  id: "sqlite",
  label: "SQLite",
  production_notes: "Single-writer local file store; run one service replica per database volume.",
  capabilities: {
    persistent: true,
    multi_instance: false,
    managed_database: false,
    transactions: "sqlite",
    online_migrations: false,
    recommended_max_replicas: 1,
    backup_mode: "file_snapshot"
  }
};
const portableSettingKeys = [
  "environment_label",
  "audit_retention_days",
  "client_event_retention_days",
  "approval_workflow_enabled",
  "meiro_url",
  "meiro_source_slug",
  "meiro_api_url",
  "meiro_feedback_url",
  "meiro_skill_url",
  "meiro_cli_url",
  "meiro_profile_cache_ttl_seconds",
  "schema_sync_interval_minutes",
  "schema_sync_identifier_type",
  "schema_sync_identifier_value",
  "web_page_variables",
  "web_sdk_conditions",
  "assistant_llm_enabled",
  "assistant_llm_provider",
  "assistant_llm_base_url",
  "assistant_llm_model",
  "assistant_llm_policy",
  "assistant_llm_timeout_ms"
];
const redactedBundleSettingKeys = ["meiro_api_token", "meiro_cli_token", "assistant_llm_api_key"];
const assistantProviderSettingKeys = [
  "assistant_llm_enabled",
  "assistant_llm_provider",
  "assistant_llm_base_url",
  "assistant_llm_model",
  "assistant_llm_api_key",
  "assistant_llm_policy",
  "assistant_llm_timeout_ms"
];
const snapshotTables = [
  "rule_sets",
  "rule_versions",
  "decision_stacks",
  "lookup_tables",
  "lookup_table_versions",
  "messages",
  "message_versions",
  "message_assets",
  "evaluation_profiles",
  "condition_blocks",
  "audit_log",
  "client_events",
  "precompute_runs",
  "experiment_assignments",
  "api_tokens",
  "settings",
  "assistant_provider_config_events",
  "assistant_provider_plan_events",
  "schema_items",
  "meiro_deliveries"
];

export class Store {
  constructor(db, options = {}) {
    this.db = db;
    this.transactionDepth = 0;
    this.adapter = options.adapter || "sqlite";
    this.adapterInfo = options.adapterInfo || (this.adapter === "sqlite" ? defaultSqliteAdapterInfo : null);
  }

  static async load(options = {}) {
    await ensureDataDir();
    const db = new DatabaseSync(databaseFile());
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA journal_mode = WAL");
    migrate(db);
    await seedIfEmpty(db);
    return new Store(db, { adapter: options.adapter || "sqlite", adapterInfo: options.adapterInfo || defaultSqliteAdapterInfo });
  }

  static async loadInMemory(options = {}) {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    migrate(db);
    await seedIfEmpty(db);
    return new Store(db, {
      adapter: options.adapter || "sqlite-memory",
      adapterInfo: options.adapterInfo || defaultSqliteAdapterInfo
    });
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
      return {
        ok: row?.ok === 1,
        adapter: this.adapter || "sqlite",
        adapter_info: this.adapterInfo,
        deployment: storeDeploymentReadiness(this.adapterInfo),
        path: config.dbPath
      };
    } catch (error) {
      return {
        ok: false,
        adapter: this.adapter || "sqlite",
        adapter_info: this.adapterInfo,
        deployment: storeDeploymentReadiness(this.adapterInfo, error),
        path: config.dbPath,
        error: error.message
      };
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

  listDecisionStacks() {
    return this.db
      .prepare("SELECT * FROM decision_stacks ORDER BY updated_at DESC, id ASC")
      .all()
      .map(rowToDecisionStack);
  }

  getDecisionStack(id) {
    const row = this.db.prepare("SELECT * FROM decision_stacks WHERE id = ?").get(id);
    return row ? rowToDecisionStack(row) : undefined;
  }

  upsertDecisionStack(input, author) {
    const existing = input.id ? this.getDecisionStack(input.id) : undefined;
    const stack = normalizeDecisionStack(input, author, existing);
    this.db
      .prepare(
        `INSERT INTO decision_stacks (
          id, name, description, status, surface, ttl_seconds,
          steps_json, metadata_json, created_at, updated_at, author
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          status = excluded.status,
          surface = excluded.surface,
          ttl_seconds = excluded.ttl_seconds,
          steps_json = excluded.steps_json,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at,
          author = excluded.author`
      )
      .run(
        stack.id,
        stack.name,
        stack.description,
        stack.status,
        stack.surface,
        stack.ttl_seconds,
        stringify(stack.steps),
        stringify(stack.metadata),
        stack.created_at,
        stack.updated_at,
        stack.author
      );
    return stack;
  }

  archiveDecisionStack(id, author) {
    const stack = this.getDecisionStack(id);
    if (!stack) notFound(`Decision stack not found: ${id}`);
    const updated = { ...stack, status: "archived", author, updated_at: createdAtNow() };
    this.db
      .prepare("UPDATE decision_stacks SET status = ?, updated_at = ?, author = ? WHERE id = ?")
      .run(updated.status, updated.updated_at, updated.author, updated.id);
    return updated;
  }

  listChangeLog(params = {}) {
    const limit = Math.max(1, Math.min(200, Number(params.limit || 50)));
    const changes = [];
    for (const row of this.db.prepare("SELECT decision_key, name, type, status, metadata_json, updated_at, author FROM rule_sets").all()) {
      const metadata = parse(row.metadata_json || "{}");
      changes.push({
        id: `rule:${row.decision_key}:draft:${row.updated_at}`,
        object_type: row.type === "experiment" ? "experiment" : "rule",
        action: row.type === "experiment" ? "experiment_draft_updated" : "rule_draft_updated",
        object_id: row.decision_key,
        object_name: row.name,
        status: row.status,
        version: null,
        author: row.author,
        changed_at: row.updated_at,
        campaign: campaignLabel(metadata),
        metadata
      });
    }
    for (const row of this.db.prepare(
      `SELECT rv.decision_key, rv.version, rv.published_at, rv.author, rv.metadata_json, rs.name, rs.type
       FROM rule_versions rv
       LEFT JOIN rule_sets rs ON rs.decision_key = rv.decision_key`
    ).all()) {
      const metadata = parse(row.metadata_json || "{}");
      changes.push({
        id: `rule:${row.decision_key}:published:${row.version}`,
        object_type: row.type === "experiment" ? "experiment" : "rule",
        action: row.type === "experiment" ? "experiment_published" : "rule_published",
        object_id: row.decision_key,
        object_name: row.name || row.decision_key,
        status: "published",
        version: row.version,
        author: row.author,
        changed_at: row.published_at,
        campaign: campaignLabel(metadata),
        metadata
      });
    }
    for (const row of this.db.prepare("SELECT id, version, name, metadata_json, updated_at, author FROM lookup_table_versions").all()) {
      const metadata = parse(row.metadata_json || "{}");
      changes.push({
        id: `lookup:${row.id}:${row.version}`,
        object_type: "reference_data",
        action: "reference_data_updated",
        object_id: row.id,
        object_name: row.name,
        status: "versioned",
        version: row.version,
        author: row.author,
        changed_at: row.updated_at,
        campaign: campaignLabel(metadata),
        metadata
      });
    }
    for (const row of this.db.prepare("SELECT id, name, surface, status, metadata_json, updated_at, author FROM messages").all()) {
      const metadata = parse(row.metadata_json || "{}");
      changes.push({
        id: `message:${row.id}:${row.updated_at}`,
        object_type: "message",
        action: "message_updated",
        object_id: row.id,
        object_name: row.name,
        status: row.status,
        version: null,
        author: row.author,
        changed_at: row.updated_at,
        campaign: campaignLabel(metadata),
        metadata: { ...metadata, surface: row.surface }
      });
    }
    return changes
      .filter((item) => item.changed_at)
      .sort((left, right) => String(right.changed_at).localeCompare(String(left.changed_at)))
      .slice(0, limit);
  }

  listCampaignOperations(params = {}) {
    const windowHours = normalizeMetricsWindowHours(params.window_hours);
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
    const campaigns = new Map();
    const decisionCampaigns = new Map();
    const ruleSummaries = new Map();
    const messageSummaries = new Map();
    const ensure = (label) => {
      const campaign = label || "Unassigned";
      if (!campaigns.has(campaign)) {
        campaigns.set(campaign, {
          campaign,
          window_hours: windowHours,
          rules: 0,
          experiments: 0,
          messages: 0,
          published_rules: 0,
          draft_rules: 0,
          archived_rules: 0,
          requests: 0,
          unique_profiles: 0,
          client_events: { exposure: 0, impression: 0, conversion: 0 },
          decision_keys: [],
          surfaces: [],
          assets: { experiments: [], rules: [], messages: [] },
          review_status: { draft: 0, submitted: 0, approved: 0, published: 0, archived: 0 },
          conflicts: [],
          recent_events: [],
          last_activity_at: null
        });
      }
      return campaigns.get(campaign);
    };
    const touch = (campaign, at) => {
      if (at && (!campaign.last_activity_at || String(at) > String(campaign.last_activity_at))) campaign.last_activity_at = at;
    };
    for (const rule of this.listRuleSets()) {
      const campaign = ensure(campaignLabel(rule.metadata) || "Unassigned");
      campaign.rules += 1;
      if (rule.type === "experiment") campaign.experiments += 1;
      if (rule.status === "published") campaign.published_rules += 1;
      if (rule.status === "draft" || rule.status === "submitted") campaign.draft_rules += 1;
      if (rule.status === "archived") campaign.archived_rules += 1;
      const approvalStatus = rule.metadata?.approval?.status || rule.status || "draft";
      if (campaign.review_status[approvalStatus] !== undefined) campaign.review_status[approvalStatus] += 1;
      campaign.decision_keys.push(rule.decision_key);
      decisionCampaigns.set(rule.decision_key, campaign.campaign);
      const hydratedRule = this.getRuleSet(rule.decision_key) || rule;
      const summary = campaignRuleSummary({ ...rule, draft: hydratedRule.draft || {} });
      ruleSummaries.set(rule.decision_key, summary);
      if (rule.type === "experiment") campaign.assets.experiments.push(summary);
      else campaign.assets.rules.push(summary);
      touch(campaign, rule.updated_at);
    }
    for (const message of this.listMessages()) {
      const campaign = ensure(campaignLabel(message.metadata) || "Unassigned");
      campaign.messages += 1;
      if (message.surface && !campaign.surfaces.includes(message.surface)) campaign.surfaces.push(message.surface);
      const summary = campaignMessageSummary(message);
      messageSummaries.set(message.id, summary);
      campaign.assets.messages.push(summary);
      touch(campaign, message.updated_at);
    }
    const requestRows = this.db
      .prepare(
        `SELECT decision_key, COUNT(*) AS requests, COUNT(DISTINCT profile_key) AS unique_profiles, MAX(evaluated_at) AS last_seen_at
         FROM audit_log
         WHERE evaluated_at >= ?
         GROUP BY decision_key`
      )
      .all(since);
    for (const row of requestRows) {
      const campaign = ensure(decisionCampaigns.get(row.decision_key) || "Unassigned");
      campaign.requests += Number(row.requests || 0);
      campaign.unique_profiles += Number(row.unique_profiles || 0);
      if (!campaign.decision_keys.includes(row.decision_key)) campaign.decision_keys.push(row.decision_key);
      touch(campaign, row.last_seen_at);
    }
    const eventRows = this.db
      .prepare(
        `SELECT decision_key, event_type, COUNT(*) AS count, MAX(occurred_at) AS last_seen_at
         FROM client_events
         WHERE occurred_at >= ?
         GROUP BY decision_key, event_type`
      )
      .all(since);
    for (const row of eventRows) {
      const campaign = ensure(decisionCampaigns.get(row.decision_key) || "Unassigned");
      if (campaign.client_events[row.event_type] !== undefined) {
        campaign.client_events[row.event_type] += Number(row.count || 0);
      }
      if (!campaign.decision_keys.includes(row.decision_key)) campaign.decision_keys.push(row.decision_key);
      touch(campaign, row.last_seen_at);
    }
    const recentRows = this.db
      .prepare(
        `SELECT decision_key, event_json, occurred_at
         FROM client_events
         WHERE occurred_at >= ?
         ORDER BY occurred_at DESC
         LIMIT 200`
      )
      .all(since);
    for (const row of recentRows) {
      const campaign = campaigns.get(decisionCampaigns.get(row.decision_key) || "Unassigned");
      if (!campaign || campaign.recent_events.length >= 12) continue;
      const event = parse(row.event_json);
      campaign.recent_events.push({
        occurred_at: event.occurred_at || row.occurred_at,
        event_type: event.event_type || event.type || "",
        decision_key: row.decision_key,
        profile_key: event.profile_key || "",
        variant_key: event.variant_key || "",
        message_id: event.message_id || "",
        surface: event.surface || "",
        object_key: event.variant_key || event.message_id || ""
      });
    }
    return [...campaigns.values()]
      .map((campaign) => {
        const exposures = Number(campaign.client_events.exposure || 0);
        const conversions = Number(campaign.client_events.conversion || 0);
        const conflicts = campaignRuleConflicts(campaign.assets);
        return {
          ...campaign,
          conflicts,
          conflict_count: conflicts.length,
          client_event_total: Object.values(campaign.client_events).reduce((sum, value) => sum + Number(value || 0), 0),
          conversion_rate: exposures > 0 ? conversions / exposures : 0,
          decision_keys: campaign.decision_keys.slice(0, 12),
          surfaces: campaign.surfaces.slice(0, 8),
          assets: {
            experiments: campaign.assets.experiments.slice(0, 20),
            rules: campaign.assets.rules.slice(0, 30),
            messages: campaign.assets.messages.slice(0, 30)
          },
          dependencies: campaignDependencies(campaign.assets, messageSummaries),
          review_status: campaign.review_status,
          recent_events: campaign.recent_events
        };
      })
      .sort((left, right) =>
        Number(right.requests || 0) - Number(left.requests || 0) ||
        Number(right.client_event_total || 0) - Number(left.client_event_total || 0) ||
        Number(right.rules + right.messages) - Number(left.rules + left.messages) ||
        left.campaign.localeCompare(right.campaign)
      )
      .slice(0, Math.max(1, Math.min(50, Number(params.limit || 12))));
  }

  listCampaignAssets(campaignName = "Unassigned") {
    const target = campaignName || "Unassigned";
    const belongsToCampaign = (metadata = {}) => (campaignLabel(metadata) || "Unassigned") === target;
    return {
      campaign: target,
      rules: this.listRuleSets().filter((rule) => belongsToCampaign(rule.metadata)),
      messages: this.listMessages().filter((message) => belongsToCampaign(message.metadata))
    };
  }

  listRuleConflicts(params = {}) {
    const campaigns = this.listCampaignOperations({
      window_hours: params.window_hours,
      limit: params.limit || 50
    });
    const conflicts = campaigns.flatMap((campaign) =>
      (campaign.conflicts || []).map((conflict) => ({
        ...conflict,
        campaign: campaign.campaign,
        rules: [conflict.left?.rule_id, conflict.right?.rule_id].filter(Boolean),
        surfaces: [conflict.left?.surface, conflict.right?.surface].filter(Boolean)
      }))
    );
    const byRule = {};
    for (const conflict of conflicts) {
      for (const ruleId of conflict.rules || []) {
        if (!byRule[ruleId]) byRule[ruleId] = [];
        byRule[ruleId].push(conflict);
      }
    }
    return {
      generated_at: createdAtNow(),
      count: conflicts.length,
      conflicts,
      by_rule: byRule
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
      assigned_to: status === "submitted" ? input.assigned_to || existing.assigned_to || "" : existing.assigned_to || "",
      requested_by: status === "submitted" ? author : existing.requested_by || "",
      requested_at: status === "submitted" ? now : existing.requested_at || "",
      approved_by: status === "approved" ? author : "",
      approved_at: status === "approved" ? now : "",
      history: [
        ...(Array.isArray(existing.history) ? existing.history : []),
        {
          status,
          by: author,
          at: now,
          note: input.note || "",
          assigned_to: input.assigned_to || existing.assigned_to || ""
        }
      ].slice(-20)
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

  setRuleCampaign(key, input = {}, author) {
    const ruleSet = this.getRuleSet(key);
    if (!ruleSet) notFound(`Rule set not found: ${key}`);
    const updated = {
      ...ruleSet,
      metadata: assignCampaignMetadata(ruleSet.metadata || {}, input.campaign || "", input.folder || ""),
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

  addPrecomputeRun(input = {}) {
    const receivedAt = input.received_at || createdAtNow();
    const run = {
      id: input.id || randomBytes(16).toString("hex"),
      received_at: receivedAt,
      source: input.source || "meiro_pipes_inapp_precompute",
      surface: input.surface || "",
      sync_id: input.sync_id || "",
      profile_count: Number(input.profile_count || 0),
      candidate_evaluations: Number(input.candidate_evaluations || 0),
      eligible_count: Number(input.eligible_count || 0),
      not_selected_count: Number(input.not_selected_count || 0),
      error_count: Number(input.error_count || 0)
    };
    this.db
      .prepare(
        `INSERT INTO precompute_runs (
          id, received_at, source, surface, sync_id, profile_count, candidate_evaluations,
          eligible_count, not_selected_count, error_count, run_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        run.id,
        run.received_at,
        run.source,
        run.surface,
        run.sync_id,
        run.profile_count,
        run.candidate_evaluations,
        run.eligible_count,
        run.not_selected_count,
        run.error_count,
        stringify({ ...run, ...(input.metadata || {}) })
      );
    const cutoff = new Date(Date.now() - this.getAuditRetentionDays() * 24 * 60 * 60 * 1000).toISOString();
    this.db.prepare("DELETE FROM precompute_runs WHERE received_at < ?").run(cutoff);
    return run;
  }

  addExperimentAssignment(input = {}) {
    const assignedAt = input.assigned_at || createdAtNow();
    const assignment = {
      id: input.id || randomBytes(16).toString("hex"),
      assigned_at: assignedAt,
      decision_key: input.decision_key || "",
      profile_key: input.profile_key || "",
      rule_version: Number(input.rule_version || 0),
      variant_key: input.variant_key || "",
      strategy: input.strategy || "",
      reason: input.reason || "",
      bucket: input.bucket == null ? null : Number(input.bucket),
      assignment_json: isPlainObject(input.assignment) ? input.assignment : {}
    };
    this.db
      .prepare(
        `INSERT INTO experiment_assignments (
          id, assigned_at, decision_key, profile_key, rule_version, variant_key,
          strategy, reason, bucket, assignment_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        assignment.id,
        assignment.assigned_at,
        assignment.decision_key,
        assignment.profile_key,
        assignment.rule_version,
        assignment.variant_key,
        assignment.strategy,
        assignment.reason,
        assignment.bucket,
        stringify(assignment.assignment_json)
      );
    const cutoff = new Date(Date.now() - this.getClientEventRetentionDays() * 24 * 60 * 60 * 1000).toISOString();
    this.db.prepare("DELETE FROM experiment_assignments WHERE assigned_at < ?").run(cutoff);
    return assignment;
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
    const sincePreviousWindow = new Date(now - windowHours * 2 * 60 * 60 * 1000).toISOString();
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
    const precomputeEntries = this.db
      .prepare("SELECT entry_json FROM audit_log WHERE evaluated_at >= ? AND entry_json LIKE ? ORDER BY evaluated_at DESC LIMIT 5000")
      .all(sinceWindow, '%"request_source":"meiro_pipes_inapp_precompute"%')
      .map((row) => parse(row.entry_json));
    const precomputeRuns = this.db
      .prepare("SELECT * FROM precompute_runs WHERE received_at >= ? ORDER BY received_at DESC LIMIT 100")
      .all(sinceWindow)
      .map(rowToPrecomputeRun);
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
      precompute: precomputeMetrics(precomputeEntries, precomputeRuns),
      result_distribution: resultDistribution.map((row) => ({ result: row.result, count: Number(row.count || 0) })),
      rule_usage: ruleUsage.map((row) => ({
        decision_key: row.decision_key,
        requests: Number(row.requests || 0),
        requests_window: Number(row.requests || 0),
        requests_24h: Number(row.requests_24h || 0),
        unique_profiles: Number(row.unique_profiles || 0),
        last_evaluated_at: row.last_evaluated_at || null
      })),
      anomaly_baseline: this.getMetricsAnomalyBaseline({
        current_from: sinceWindow,
        previous_from: sincePreviousWindow,
        to: new Date(now).toISOString(),
        window_hours: windowHours
      })
    };
  }

  getMetricsAnomalyBaseline({ current_from, previous_from, to, window_hours }) {
    const auditRows = this.db
      .prepare(
        `SELECT
          SUM(CASE WHEN evaluated_at >= ? AND evaluated_at <= ? THEN 1 ELSE 0 END) AS current_requests,
          SUM(CASE WHEN evaluated_at >= ? AND evaluated_at < ? THEN 1 ELSE 0 END) AS previous_requests,
          COUNT(DISTINCT CASE WHEN evaluated_at >= ? AND evaluated_at <= ? THEN profile_key END) AS current_profiles,
          COUNT(DISTINCT CASE WHEN evaluated_at >= ? AND evaluated_at < ? THEN profile_key END) AS previous_profiles
         FROM audit_log`
      )
      .get(current_from, to, previous_from, current_from, current_from, to, previous_from, current_from);
    const eventRows = this.db
      .prepare(
        `SELECT
          SUM(CASE WHEN occurred_at >= ? AND occurred_at <= ? THEN 1 ELSE 0 END) AS current_events,
          SUM(CASE WHEN occurred_at >= ? AND occurred_at < ? THEN 1 ELSE 0 END) AS previous_events
         FROM client_events`
      )
      .get(current_from, to, previous_from, current_from);
    const currentRequests = Number(auditRows.current_requests || 0);
    const previousRequests = Number(auditRows.previous_requests || 0);
    const currentProfiles = Number(auditRows.current_profiles || 0);
    const previousProfiles = Number(auditRows.previous_profiles || 0);
    const currentEvents = Number(eventRows.current_events || 0);
    const previousEvents = Number(eventRows.previous_events || 0);
    const currentCoverage = currentRequests ? currentEvents / currentRequests : 0;
    const previousCoverage = previousRequests ? previousEvents / previousRequests : 0;
    const signals = [
      anomalySignal({
        id: "request_volume",
        label: "Request volume",
        current: currentRequests,
        previous: previousRequests,
        unit: "requests",
        detail: "Evaluations in the selected window compared with the previous matching window."
      }),
      anomalySignal({
        id: "unique_profiles",
        label: "Unique profiles",
        current: currentProfiles,
        previous: previousProfiles,
        unit: "profiles",
        detail: "Distinct profile keys evaluated in the selected window."
      }),
      anomalySignal({
        id: "client_feedback",
        label: "Client feedback",
        current: currentEvents,
        previous: previousEvents,
        unit: "events",
        detail: "Client impressions, exposures, and conversions in the selected window."
      }),
      anomalySignal({
        id: "feedback_coverage",
        label: "Feedback coverage",
        current: currentCoverage,
        previous: previousCoverage,
        unit: "ratio",
        detail: "Client feedback events per evaluation request."
      })
    ];
    const alerts = signals
      .map((signal) => anomalyAlertFromSignal(signal))
      .filter(Boolean);
    return {
      window_hours,
      current_from,
      previous_from,
      previous_to: current_from,
      generated_at: createdAtNow(),
      signals,
      alerts
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
        const rawEvents = this.db
          .prepare("SELECT event_json FROM client_events WHERE decision_key = ? ORDER BY occurred_at ASC")
          .all(rule.decision_key)
          .map((row) => parse(row.event_json));
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
        const assignmentHistory = this.getExperimentAssignmentHistory(rule.decision_key);
        const winnerRecommendation = experimentWinnerRecommendation({
          rule,
          experiment: activeExperiment,
          variants: variantMetrics,
          winner,
          significantWinner
        });
        return {
          name: rule.name,
          decision_key: rule.decision_key,
          surface: rule.surface || "",
          status: rule.status,
          experiment_status: activeExperiment.status || "draft",
          experiment_mode: activeExperiment.mode === "bandit" || activeExperiment.bandit?.enabled === true ? "bandit" : "fixed",
          bandit: activeExperiment.bandit || null,
          goal: activeExperiment.goal || null,
          schedule: activeExperiment.schedule || null,
          display: activeExperiment.display || null,
          targeting: activeExperiment.targeting || null,
          trigger: activeExperiment.trigger || null,
          consent: activeExperiment.consent || null,
          goal_report: experimentGoalReport({ events: rawEvents, variants, goal: activeExperiment.goal || {} }),
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
          significant_winner_confidence: significantWinner?.significance?.confidence || 0,
          winner_recommendation: winnerRecommendation,
          assignment_history: assignmentHistory
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

  getExperimentAssignmentHistory(decisionKey, options = {}) {
    const windowHours = Math.max(1, Math.min(Number(options.window_hours || 24), 168));
    const end = floorToHour(new Date(Date.now()));
    const start = options.since ? new Date(options.since) : new Date(end.getTime() - (windowHours - 1) * 60 * 60 * 1000);
    const since = start.toISOString();
    const total = this.db
      .prepare("SELECT COUNT(*) AS count FROM experiment_assignments WHERE decision_key = ? AND assigned_at >= ?")
      .get(decisionKey, since)?.count || 0;
    const recent = this.db
      .prepare(
        `SELECT *
         FROM experiment_assignments
         WHERE decision_key = ? AND assigned_at >= ?
         ORDER BY assigned_at DESC
         LIMIT ?`
      )
      .all(decisionKey, since, Math.min(Number(options.limit || 100), 500))
      .map(rowToExperimentAssignment);
    const trendRows = this.db
      .prepare(
        `SELECT
          strftime('%Y-%m-%dT%H:00:00.000Z', assigned_at) AS bucket,
          COALESCE(NULLIF(variant_key, ''), '(empty)') AS variant_key,
          COUNT(*) AS count
         FROM experiment_assignments
         WHERE decision_key = ? AND assigned_at >= ?
         GROUP BY bucket, variant_key
         ORDER BY bucket ASC, variant_key ASC`
      )
      .all(decisionKey, since);
    return {
      window_hours: windowHours,
      total: Number(total || 0),
      by_variant: this.assignmentGroup(decisionKey, since, "variant_key"),
      by_strategy: this.assignmentGroup(decisionKey, since, "strategy"),
      by_reason: this.assignmentGroup(decisionKey, since, "reason"),
      trend: assignmentTrend(trendRows, start, windowHours),
      recent: recent.slice(0, 12)
    };
  }

  assignmentGroup(decisionKey, since, column) {
    const allowed = new Set(["variant_key", "strategy", "reason"]);
    if (!allowed.has(column)) return [];
    return this.db
      .prepare(
        `SELECT COALESCE(NULLIF(${column}, ''), '(empty)') AS key, COUNT(*) AS count
         FROM experiment_assignments
         WHERE decision_key = ? AND assigned_at >= ?
         GROUP BY key
         ORDER BY count DESC, key ASC`
      )
      .all(decisionKey, since)
      .map((row) => ({ key: row.key, count: Number(row.count || 0) }));
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

  listMessageAssets() {
    const rows = this.db
      .prepare("SELECT id, filename, content_type, size_bytes, metadata_json, created_at, created_by FROM message_assets ORDER BY created_at DESC, id ASC")
      .all();
    const references = this.messageAssetReferences();
    return rows.map((row) => rowToMessageAsset(row, references.get(row.id) || []));
  }

  createMessageAsset(input, author) {
    const filename = String(input.filename || "message-asset").slice(0, 180);
    const contentType = String(input.content_type || "").toLowerCase();
    const allowedTypes = new Set(["image/gif", "image/jpeg", "image/png", "image/svg+xml", "image/webp"]);
    if (!allowedTypes.has(contentType)) badRequest("Message asset must be a PNG, JPEG, WebP, GIF, or SVG image");
    const base64 = imageBase64FromInput(input);
    const sizeBytes = Buffer.byteLength(base64, "base64");
    if (sizeBytes <= 0) badRequest("Message asset is empty");
    if (sizeBytes > 2 * 1024 * 1024) badRequest("Message asset limit is 2 MB");
    const now = createdAtNow();
    const id = `msg_asset_${randomBytes(8).toString("hex")}`;
    const asset = {
      id,
      filename,
      content_type: contentType,
      size_bytes: sizeBytes,
      content_base64: base64,
      metadata: isPlainObject(input.metadata) ? input.metadata : {},
      created_at: now,
      created_by: author
    };
    this.db
      .prepare(
        `INSERT INTO message_assets (
          id, filename, content_type, size_bytes, content_base64, metadata_json, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        asset.id,
        asset.filename,
        asset.content_type,
        asset.size_bytes,
        asset.content_base64,
        stringify(asset.metadata),
        asset.created_at,
        asset.created_by
      );
    return rowToMessageAsset(asset, []);
  }

  getMessageAsset(id, includeContent = false) {
    const row = this.db.prepare("SELECT * FROM message_assets WHERE id = ?").get(id);
    if (!row) notFound(`Message asset not found: ${id}`);
    const references = this.messageAssetReferences().get(id) || [];
    const asset = rowToMessageAsset(row, references);
    if (includeContent) asset.content_base64 = row.content_base64;
    return asset;
  }

  deleteMessageAsset(id, options = {}) {
    const asset = this.getMessageAsset(id);
    if (asset.used_by.length && !options.force) badRequest("Message asset is still used");
    this.db.prepare("DELETE FROM message_assets WHERE id = ?").run(id);
    return { deleted: true, asset };
  }

  cleanupMessageAssets() {
    const assets = this.listMessageAssets();
    const unused = assets.filter((asset) => !asset.used_by.length);
    for (const asset of unused) {
      this.db.prepare("DELETE FROM message_assets WHERE id = ?").run(asset.id);
    }
    return { deleted: unused.length, assets: unused };
  }

  messageAssetReferences() {
    const references = new Map();
    const assetUrlPattern = /\/v1\/message-assets\/([^/]+)\/content/g;
    for (const message of this.listMessages()) {
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
    for (const ruleSummary of this.listRuleSets()) {
      const rule = this.getRuleSet(ruleSummary.decision_key);
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

  upsertMessage(id, input, author) {
    if (!id) badRequest("Message id is required");
    const existing = this.db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
    const now = createdAtNow();
    const nextVersion = Number(existing?.version || this.latestMessageVersion(id) || 0) + 1;
    const message = {
      id,
      name: input.name || existing?.name || id,
      surface: input.surface || existing?.surface || "",
      status: ["active", "archived"].includes(input.status) ? input.status : existing?.status || "active",
      content_schema: isPlainObject(input.content_schema) ? input.content_schema : existing ? parse(existing.content_schema_json) : {},
      default_content: isPlainObject(input.default_content) ? input.default_content : existing ? parse(existing.default_content_json) : {},
      metadata: isPlainObject(input.metadata) ? input.metadata : existing ? parse(existing.metadata_json) : {},
      updated_at: now,
      author,
      version: nextVersion
    };
    this.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO messages (
            id, name, surface, status, content_schema_json, default_content_json, metadata_json, updated_at, author, version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            surface = excluded.surface,
            status = excluded.status,
            content_schema_json = excluded.content_schema_json,
            default_content_json = excluded.default_content_json,
            metadata_json = excluded.metadata_json,
            updated_at = excluded.updated_at,
            author = excluded.author,
            version = excluded.version`
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
          message.author,
          message.version
        );
      insertMessageVersion(this.db, message);
    });
    return message;
  }

  getMessage(id) {
    const row = this.db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
    return row ? rowToMessage(row) : null;
  }

  setMessageCampaign(id, input = {}, author) {
    const message = this.getMessage(id);
    if (!message) notFound(`Message not found: ${id}`);
    return this.upsertMessage(id, {
      ...message,
      metadata: assignCampaignMetadata(message.metadata || {}, input.campaign || "", input.folder || "")
    }, author);
  }

  latestMessageVersion(id) {
    const row = this.db.prepare("SELECT MAX(version) AS version FROM message_versions WHERE id = ?").get(id);
    return Number(row?.version || 0);
  }

  listMessageVersions(id) {
    if (!this.db.prepare("SELECT id FROM messages WHERE id = ?").get(id)) notFound(`Message not found: ${id}`);
    return this.db
      .prepare("SELECT * FROM message_versions WHERE id = ? ORDER BY version DESC")
      .all(id)
      .map(rowToMessageVersionSummary);
  }

  getMessageVersion(id, requestedVersion) {
    if (!this.db.prepare("SELECT id FROM messages WHERE id = ?").get(id)) notFound(`Message not found: ${id}`);
    const row = this.db
      .prepare("SELECT * FROM message_versions WHERE id = ? AND version = ?")
      .get(id, Number(requestedVersion));
    if (!row) notFound(`Message version not found: ${requestedVersion}`);
    return rowToMessageVersion(row);
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
      .prepare("SELECT id, name, scopes_json, decision_keys_json, metadata_json, created_at, last_used_at, revoked_at FROM api_tokens ORDER BY created_at DESC")
      .all()
      .map(rowToApiToken);
  }

  createApiToken(input, author) {
    const scopes = normalizeScopes(input.scopes);
    const decisionKeys = normalizeDecisionKeys(input.decision_keys);
    const metadata = normalizeTokenMetadata(input.metadata || input);
    const now = createdAtNow();
    const plaintext = `dee_${randomBytes(24).toString("base64url")}`;
    const token = {
      id: randomBytes(12).toString("hex"),
      name: input.name || "API token",
      scopes,
      decision_keys: decisionKeys,
      metadata,
      created_at: now,
      created_by: author,
      last_used_at: null,
      revoked_at: null
    };
    this.db
      .prepare(
        `INSERT INTO api_tokens (id, name, token_hash, scopes_json, decision_keys_json, metadata_json, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(token.id, token.name, hashToken(plaintext), stringify(scopes), stringify(decisionKeys), stringify(metadata), token.created_at, token.created_by);
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
      "approval_workflow_enabled",
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
    const now = createdAtNow();
    const before = this.getSettings();
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
    const updated = this.getSettings();
    this.recordAssistantProviderConfigEvent(input, before, updated, author, now);
    return updated;
  }

  listAssistantProviderConfigEvents(params = {}) {
    const requestedLimit = Number(params.limit || 10);
    const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 10, 50);
    return this.db
      .prepare(
        `SELECT id, changed_at, changed_by, changes_json, snapshot_json
         FROM assistant_provider_config_events
         ORDER BY changed_at DESC
         LIMIT ?`
      )
      .all(limit)
      .map((row) => ({
        id: row.id,
        changed_at: row.changed_at,
        changed_by: row.changed_by,
        changes: parse(row.changes_json),
        snapshot: parse(row.snapshot_json)
      }));
  }

  recordAssistantProviderPlanEvent(input = {}) {
    const event = assistantProviderPlanEvent(input);
    this.db
      .prepare(
        `INSERT INTO assistant_provider_plan_events (
          id, planned_at, planned_by, mode, status, provider, model, policy, contract_version,
          governance_status, prompt_hash, prompt_length, request_type, decision_key, surface,
          action_count, warning_count, error_count, duration_ms, fallback_reason, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.id,
        event.planned_at,
        event.planned_by,
        event.mode,
        event.status,
        event.provider,
        event.model,
        event.policy,
        event.contract_version,
        event.governance_status,
        event.prompt_hash,
        event.prompt_length,
        event.request_type,
        event.decision_key,
        event.surface,
        event.action_count,
        event.warning_count,
        event.error_count,
        event.duration_ms,
        event.fallback_reason,
        stringify(event.metadata)
      );
    return event;
  }

  listAssistantProviderPlanEvents(params = {}) {
    const requestedLimit = Number(params.limit || 10);
    const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 10, 50);
    return this.db
      .prepare(
        `SELECT id, planned_at, planned_by, mode, status, provider, model, policy, contract_version,
                governance_status, prompt_hash, prompt_length, request_type, decision_key, surface,
                action_count, warning_count, error_count, duration_ms, fallback_reason, metadata_json
         FROM assistant_provider_plan_events
         ORDER BY planned_at DESC
         LIMIT ?`
      )
      .all(limit)
      .map((row) => ({
        id: row.id,
        planned_at: row.planned_at,
        planned_by: row.planned_by,
        mode: row.mode,
        status: row.status,
        provider: row.provider,
        model: row.model,
        policy: row.policy,
        contract_version: row.contract_version,
        governance_status: row.governance_status,
        prompt_hash: row.prompt_hash,
        prompt_length: Number(row.prompt_length || 0),
        request_type: row.request_type,
        decision_key: row.decision_key,
        surface: row.surface,
        action_count: Number(row.action_count || 0),
        warning_count: Number(row.warning_count || 0),
        error_count: Number(row.error_count || 0),
        duration_ms: Number(row.duration_ms || 0),
        fallback_reason: row.fallback_reason,
        metadata: parse(row.metadata_json)
      }));
  }

  recordAssistantProviderConfigEvent(input, before, after, author, now = createdAtNow()) {
    const touched = assistantProviderSettingKeys.filter((key) => Object.hasOwn(input, key));
    if (!touched.length) return;
    const changes = {};
    for (const key of touched) {
      const previous = assistantProviderSettingValue(key, before[key]);
      const current = assistantProviderSettingValue(key, after[key]);
      if (previous !== current) changes[key] = { from: previous, to: current };
    }
    if (!Object.keys(changes).length) return;
    this.db
      .prepare(
        `INSERT INTO assistant_provider_config_events (id, changed_at, changed_by, changes_json, snapshot_json)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(randomId(), now, author || "system", stringify(changes), stringify(assistantProviderSnapshot(after)));
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
      decision_stacks: this.listDecisionStacks(),
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

  exportSnapshot() {
    return {
      kind: "meiro-dee-store-snapshot",
      version: 1,
      exported_at: createdAtNow(),
      tables: Object.fromEntries(snapshotTables.map((table) => [
        table,
        this.db.prepare(`SELECT * FROM ${table}`).all()
      ]))
    };
  }

  importSnapshot(snapshot) {
    if (!snapshot || snapshot.kind !== "meiro-dee-store-snapshot" || !isPlainObject(snapshot.tables)) {
      throw new Error("Invalid DEE store snapshot");
    }
    this.transaction(() => {
      for (const table of [...snapshotTables].reverse()) {
        this.db.prepare(`DELETE FROM ${table}`).run();
      }
      for (const table of snapshotTables) {
        const rows = Array.isArray(snapshot.tables[table]) ? snapshot.tables[table] : [];
        for (const row of rows) {
          insertSnapshotRow(this.db, table, row);
        }
      }
    });
    return {
      tables: Object.fromEntries(snapshotTables.map((table) => [
        table,
        Array.isArray(snapshot.tables[table]) ? snapshot.tables[table].length : 0
      ]))
    };
  }

  importBundle(bundle, author) {
    const imported = { rule_sets: 0, decision_stacks: 0, lookup_tables: 0, messages: 0, condition_blocks: 0, settings: 0 };
    this.transaction(() => {
      for (const ruleSet of bundle.rule_sets) {
        this.upsertRuleSet(ruleSet, author);
        imported.rule_sets += 1;
      }
      for (const table of bundle.lookup_tables || []) {
        this.replaceLookupTable(table.id, table, author);
        imported.lookup_tables += 1;
      }
      for (const stack of bundle.decision_stacks || []) {
        this.upsertDecisionStack(stack, author);
        imported.decision_stacks += 1;
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

function insertSnapshotRow(db, table, row) {
  if (!snapshotTables.includes(table)) throw new Error(`Unsupported snapshot table: ${table}`);
  if (!isPlainObject(row)) return;
  const columns = tableColumns(db, table).filter((column) => Object.prototype.hasOwnProperty.call(row, column));
  if (!columns.length) return;
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO ${table} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${placeholders})`;
  db.prepare(sql).run(...columns.map((column) => row[column]));
}

function tableColumns(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
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

    CREATE TABLE IF NOT EXISTS decision_stacks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
      surface TEXT NOT NULL DEFAULT '',
      ttl_seconds INTEGER NOT NULL DEFAULT 0,
      steps_json TEXT NOT NULL DEFAULT '[]',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      author TEXT NOT NULL
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
      author TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS message_versions (
      id TEXT NOT NULL,
      version INTEGER NOT NULL,
      name TEXT NOT NULL,
      surface TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
      content_schema_json TEXT NOT NULL DEFAULT '{}',
      default_content_json TEXT NOT NULL DEFAULT '{}',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL,
      author TEXT NOT NULL,
      PRIMARY KEY (id, version)
    );

    CREATE TABLE IF NOT EXISTS message_assets (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      content_base64 TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL
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
      event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'exposure', 'conversion', 'skipped')),
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

    CREATE TABLE IF NOT EXISTS precompute_runs (
      id TEXT PRIMARY KEY,
      received_at TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      surface TEXT NOT NULL DEFAULT '',
      sync_id TEXT NOT NULL DEFAULT '',
      profile_count INTEGER NOT NULL DEFAULT 0,
      candidate_evaluations INTEGER NOT NULL DEFAULT 0,
      eligible_count INTEGER NOT NULL DEFAULT 0,
      not_selected_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      run_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS experiment_assignments (
      id TEXT PRIMARY KEY,
      assigned_at TEXT NOT NULL,
      decision_key TEXT NOT NULL,
      profile_key TEXT NOT NULL DEFAULT '',
      rule_version INTEGER NOT NULL DEFAULT 0,
      variant_key TEXT NOT NULL DEFAULT '',
      strategy TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      bucket REAL,
      assignment_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS api_tokens (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      scopes_json TEXT NOT NULL DEFAULT '[]',
      decision_keys_json TEXT NOT NULL DEFAULT '[]',
      metadata_json TEXT NOT NULL DEFAULT '{}',
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

    CREATE TABLE IF NOT EXISTS assistant_provider_config_events (
      id TEXT PRIMARY KEY,
      changed_at TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      changes_json TEXT NOT NULL DEFAULT '{}',
      snapshot_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS assistant_provider_plan_events (
      id TEXT PRIMARY KEY,
      planned_at TEXT NOT NULL,
      planned_by TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      policy TEXT NOT NULL,
      contract_version TEXT NOT NULL,
      governance_status TEXT NOT NULL,
      prompt_hash TEXT NOT NULL,
      prompt_length INTEGER NOT NULL DEFAULT 0,
      request_type TEXT NOT NULL DEFAULT '',
      decision_key TEXT NOT NULL DEFAULT '',
      surface TEXT NOT NULL DEFAULT '',
      action_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      fallback_reason TEXT NOT NULL DEFAULT '',
      metadata_json TEXT NOT NULL DEFAULT '{}'
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
    CREATE INDEX IF NOT EXISTS idx_decision_stacks_status ON decision_stacks(status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_audit_decision_time ON audit_log(decision_key, evaluated_at);
    CREATE INDEX IF NOT EXISTS idx_audit_profile_time ON audit_log(profile_key, evaluated_at);
    CREATE INDEX IF NOT EXISTS idx_audit_result_time ON audit_log(result, evaluated_at);
    CREATE INDEX IF NOT EXISTS idx_client_events_decision_time ON client_events(decision_key, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_client_events_profile_time ON client_events(profile_key, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_client_events_type_time ON client_events(event_type, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_precompute_runs_time ON precompute_runs(received_at);
    CREATE INDEX IF NOT EXISTS idx_precompute_runs_surface_time ON precompute_runs(surface, received_at);
    CREATE INDEX IF NOT EXISTS idx_experiment_assignments_rule_time ON experiment_assignments(decision_key, assigned_at);
    CREATE INDEX IF NOT EXISTS idx_experiment_assignments_variant_time ON experiment_assignments(decision_key, variant_key, assigned_at);
    CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_schema_items_kind ON schema_items(kind, name);
    CREATE INDEX IF NOT EXISTS idx_lookup_table_versions ON lookup_table_versions(id, version);
    CREATE INDEX IF NOT EXISTS idx_messages_surface_status ON messages(surface, status);
    CREATE INDEX IF NOT EXISTS idx_message_versions ON message_versions(id, version);
    CREATE INDEX IF NOT EXISTS idx_message_assets_created ON message_assets(created_at);
    CREATE INDEX IF NOT EXISTS idx_evaluation_profiles_rule ON evaluation_profiles(decision_key, updated_at);
    CREATE INDEX IF NOT EXISTS idx_condition_blocks_name ON condition_blocks(name, id);
    CREATE INDEX IF NOT EXISTS idx_meiro_deliveries_time ON meiro_deliveries(attempted_at);
    CREATE INDEX IF NOT EXISTS idx_assistant_provider_config_events_time ON assistant_provider_config_events(changed_at);
    CREATE INDEX IF NOT EXISTS idx_assistant_provider_plan_events_time ON assistant_provider_plan_events(planned_at);
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
  ensureColumn(db, "messages", "version", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "api_tokens", "decision_keys_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "api_tokens", "metadata_json", "TEXT NOT NULL DEFAULT '{}'");
  seedLookupHistory(db);
  seedMessageHistory(db);
  seedSettings(db);
  seedConditionBlocks(db);
}

function seedSettings(db) {
  const now = createdAtNow();
  const defaults = {
    environment_label: "local",
    audit_retention_days: config.auditRetentionDays,
    client_event_retention_days: config.clientEventRetentionDays,
    approval_workflow_enabled: false,
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
    assistant_llm_enabled: false,
    assistant_llm_provider: "openai",
    assistant_llm_base_url: "",
    assistant_llm_model: "",
    assistant_llm_api_key: "",
    assistant_llm_policy: "balanced",
    assistant_llm_timeout_ms: 15000,
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

function insertMessageVersion(db, message) {
  db.prepare(
    `INSERT INTO message_versions (
       id, version, name, surface, status, content_schema_json, default_content_json, metadata_json, updated_at, author
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id, version) DO UPDATE SET
       name = excluded.name,
       surface = excluded.surface,
       status = excluded.status,
       content_schema_json = excluded.content_schema_json,
       default_content_json = excluded.default_content_json,
       metadata_json = excluded.metadata_json,
       updated_at = excluded.updated_at,
       author = excluded.author`
  ).run(
    message.id,
    message.version || 1,
    message.name,
    message.surface || "",
    message.status || "active",
    stringify(message.content_schema || {}),
    stringify(message.default_content || {}),
    stringify(message.metadata || {}),
    message.updated_at,
    message.author
  );
}

function seedMessageHistory(db) {
  const messages = db.prepare("SELECT * FROM messages").all();
  for (const row of messages) {
    const message = rowToMessage(row);
    const exists = db
      .prepare("SELECT id FROM message_versions WHERE id = ? AND version = ?")
      .get(message.id, message.version || 1);
    if (!exists) insertMessageVersion(db, message);
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

function rowToDecisionStack(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    status: row.status || "draft",
    surface: row.surface || "",
    ttl_seconds: Number(row.ttl_seconds || 0),
    steps: parse(row.steps_json || "[]"),
    metadata: parse(row.metadata_json || "{}"),
    created_at: row.created_at,
    updated_at: row.updated_at,
    author: row.author
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
    author: row.author,
    version: Number(row.version || 1)
  };
}

function rowToMessageVersion(row) {
  return rowToMessage(row);
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
    metadata: parse(row.metadata_json || "{}"),
    created_at: row.created_at,
    created_by: row.created_by,
    used_by: usedBy
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

function campaignLabel(metadata = {}) {
  const campaign = typeof metadata?.campaign === "string" ? metadata.campaign : metadata?.campaign?.name || "";
  const folder = metadata?.campaign?.folder || metadata?.folder || "";
  return [campaign, folder].filter(Boolean).join(" / ");
}

function assignCampaignMetadata(metadata = {}, campaign = "", folder = "") {
  const next = isPlainObject(metadata) ? structuredClone(metadata) : {};
  delete next.folder;
  const name = String(campaign || "").trim();
  const folderName = String(folder || "").trim();
  if (name || folderName) {
    next.campaign = { name, folder: folderName };
  } else {
    delete next.campaign;
  }
  return next;
}

function campaignRuleSummary(rule = {}) {
  const experiment = rule.metadata?.experiment || {};
  const approval = rule.metadata?.approval || {};
  return {
    id: rule.decision_key,
    name: rule.name || rule.decision_key,
    type: rule.type || "decision",
    status: rule.status || "draft",
    surface: rule.surface || "",
    priority: Number(rule.priority || 0),
    updated_at: rule.updated_at || "",
    approval_status: approval.status || rule.status || "draft",
    variant_count: Array.isArray(experiment.variants) ? experiment.variants.length : 0,
    message_ids: referencedMessageIds(rule.draft || {}),
    audience_outcomes: campaignAudienceOutcomes(rule)
  };
}

function campaignMessageSummary(message = {}) {
  return {
    id: message.id,
    name: message.name || message.id,
    status: message.status || "active",
    surface: message.surface || "",
    template_type: message.metadata?.template_type || "",
    placement: message.metadata?.placement || "",
    updated_at: message.updated_at || ""
  };
}

function campaignDependencies(assets = {}, messagesById = new Map()) {
  const links = [];
  for (const rule of [...(assets.rules || []), ...(assets.experiments || [])]) {
    for (const messageId of rule.message_ids || []) {
      links.push({
        rule_id: rule.id,
        rule_name: rule.name,
        message_id: messageId,
        message_name: messagesById.get(messageId)?.name || messageId,
        resolved: messagesById.has(messageId)
      });
    }
  }
  return links.slice(0, 50);
}

function campaignRuleConflicts(assets = {}) {
  const outcomes = [...(assets.rules || []), ...(assets.experiments || [])]
    .flatMap((rule) => rule.audience_outcomes || [])
    .filter((outcome) => outcome.surface && ["eligible", "ineligible"].includes(outcome.outcome));
  const conflicts = [];
  const seen = new Set();
  for (let leftIndex = 0; leftIndex < outcomes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < outcomes.length; rightIndex += 1) {
      const left = outcomes[leftIndex];
      const right = outcomes[rightIndex];
      if (left.condition_signature !== right.condition_signature) continue;
      if (left.surface === right.surface) continue;
      if (left.outcome === right.outcome) continue;
      const key = [
        left.condition_signature,
        [left.rule_id, left.branch_id, left.surface].join(":"),
        [right.rule_id, right.branch_id, right.surface].join(":")
      ].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      conflicts.push({
        id: `conflict_${conflicts.length + 1}`,
        level: "warning",
        type: "cross_surface_eligibility",
        summary: `${left.surface} is ${left.outcome}; ${right.surface} is ${right.outcome}`,
        audience: left.condition_label || "Same audience conditions",
        condition_signature: left.condition_signature,
        recommendation: conflictRecommendation(left, right),
        left,
        right
      });
    }
  }
  return conflicts.slice(0, 20);
}

function conflictRecommendation(left = {}, right = {}) {
  return [
    `Confirm whether ${left.surface || "one surface"} and ${right.surface || "the other surface"} should intentionally differ for this audience.`,
    "If the difference is intentional, add an explicit context/channel condition or campaign note so reviewers can distinguish it from an accidental contradiction.",
    "If it is not intentional, align one rule result or narrow the audience condition before publishing."
  ];
}

function campaignAudienceOutcomes(rule = {}) {
  const draft = rule.draft || {};
  if (!isPlainObject(draft) || draft.graph) return [];
  const outcomes = [];
  for (const branch of Array.isArray(draft.branches) ? draft.branches : []) {
    const outcome = normalizeEligibilityOutcome(branch.result);
    if (!outcome || !branch.when) continue;
    outcomes.push({
      rule_id: rule.decision_key,
      rule_name: rule.name || rule.decision_key,
      rule_type: rule.type || "decision",
      branch_id: branch.id || "branch",
      surface: rule.surface || "",
      result: branch.result || "",
      outcome,
      condition_label: conditionConflictLabel(branch.when),
      condition_signature: stableConditionSignature(branch.when)
    });
  }
  if ((!draft.branches || draft.branches.length === 0) && draft.fallback?.result) {
    const outcome = normalizeEligibilityOutcome(draft.fallback.result);
    if (outcome) {
      outcomes.push({
        rule_id: rule.decision_key,
        rule_name: rule.name || rule.decision_key,
        rule_type: rule.type || "decision",
        branch_id: "fallback",
        surface: rule.surface || "",
        result: draft.fallback.result || "",
        outcome,
        condition_label: "All profiles",
        condition_signature: "__all_profiles__"
      });
    }
  }
  return outcomes;
}

function referencedMessageIds(definition = {}) {
  const ids = new Set();
  const inspect = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(inspect);
      return;
    }
    if (typeof value.message_id === "string" && value.message_id) ids.add(value.message_id);
    if (value.outputs) inspect(value.outputs);
    if (value.branches) inspect(value.branches);
    if (value.fallback) inspect(value.fallback);
  };
  inspect(definition);
  return [...ids];
}

function normalizeEligibilityOutcome(result = "") {
  const value = String(result || "").trim().toLowerCase();
  if (["eligible", "allow", "allowed", "show", "include", "true"].includes(value)) return "eligible";
  if (["ineligible", "not_eligible", "not eligible", "suppress", "suppressed", "deny", "denied", "block", "blocked", "false"].includes(value)) return "ineligible";
  return "";
}

function stableConditionSignature(condition) {
  return JSON.stringify(normalizeConditionForSignature(condition));
}

function normalizeConditionForSignature(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeConditionForSignature(item))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }
  if (!isPlainObject(value)) return value;
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = normalizeConditionForSignature(value[key]);
  }
  return sorted;
}

function conditionConflictLabel(condition) {
  if (!isPlainObject(condition)) return "Same audience conditions";
  if (condition.all || condition.any) {
    const mode = condition.all ? "all" : "any";
    const children = Array.isArray(condition[mode]) ? condition[mode] : [];
    return children.map(conditionConflictLabel).filter(Boolean).join(mode === "all" ? " AND " : " OR ") || "Same audience conditions";
  }
  if (condition.not) return `NOT (${conditionConflictLabel(condition.not)})`;
  const source = condition.source || "field";
  const key = condition.key || "";
  const operator = condition.operator || "matches";
  const value = condition.value_source ? `${condition.value_source.source}.${condition.value_source.key}` : formatConflictValue(condition.value);
  return `${source}.${key} ${operator} ${value}`.trim();
}

function formatConflictValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value == null) return "";
  if (isPlainObject(value)) return JSON.stringify(value);
  return String(value);
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
    metadata: parse(row.metadata_json || "{}"),
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

function normalizeTokenMetadata(input = {}) {
  const allowedOrigins = normalizeStringList(input.allowed_origins || input.origins);
  const environment = String(input.environment || input.environment_label || "").trim();
  const appId = String(input.app_id || input.application_id || "").trim();
  const metadata = {};
  if (allowedOrigins.length) metadata.allowed_origins = allowedOrigins;
  if (environment) metadata.environment = environment;
  if (appId) metadata.app_id = appId;
  return metadata;
}

function normalizeStringList(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
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

function experimentGoalReport({ events = [], variants = [], goal = {} } = {}) {
  const goalEvent = String(goal.event || "conversion").trim() || "conversion";
  const attributionHours = Number(goal.attribution_window_hours || 0);
  const attributionMs = Number.isFinite(attributionHours) && attributionHours > 0 ? attributionHours * 60 * 60 * 1000 : 0;
  const valueField = String(goal.value_field || "").trim();
  const keys = new Set([
    ...variants.map((variant) => variant.key).filter(Boolean),
    ...events.map((event) => event.variant_key).filter(Boolean)
  ]);
  const byVariant = new Map([...keys].map((key) => [key, emptyGoalVariant(key)]));
  const ensureVariant = (key) => {
    const safeKey = key || "(empty)";
    if (!byVariant.has(safeKey)) byVariant.set(safeKey, emptyGoalVariant(safeKey));
    return byVariant.get(safeKey);
  };
  const exposures = events.filter((event) => event?.event_type === "exposure");
  for (const exposure of exposures) {
    ensureVariant(exposure.variant_key).exposures += 1;
  }
  const goalConversions = events.filter((event) => isGoalConversion(event, goalEvent));
  const attributedProfiles = new Set();
  for (const conversion of goalConversions) {
    const attributed = !attributionMs || exposures.some((exposure) => sameAttributionSubject(exposure, conversion) && withinAttributionWindow(exposure, conversion, attributionMs));
    if (!attributed) continue;
    const variant = ensureVariant(conversion.variant_key);
    variant.count += 1;
    if (conversion.profile_key) {
      variant.profiles.add(conversion.profile_key);
      attributedProfiles.add(conversion.profile_key);
    }
    variant.value_sum += numericPathValue(conversion, valueField);
    if (!variant.last_seen_at || String(conversion.occurred_at || "") > variant.last_seen_at) variant.last_seen_at = conversion.occurred_at || "";
  }
  const variantsReport = [...byVariant.values()].map((variant) => ({
    key: variant.key,
    exposures: variant.exposures,
    count: variant.count,
    unique_profiles: variant.profiles.size,
    value_sum: roundMetric(variant.value_sum),
    conversion_rate: variant.exposures > 0 ? variant.count / variant.exposures : 0,
    last_seen_at: variant.last_seen_at || null
  }));
  return {
    event: goalEvent,
    type: goal.type || "conversion",
    attribution_window_hours: attributionMs ? attributionHours : 0,
    value_field: valueField || null,
    count: variantsReport.reduce((sum, item) => sum + item.count, 0),
    unique_profiles: attributedProfiles.size,
    value_sum: roundMetric(variantsReport.reduce((sum, item) => sum + item.value_sum, 0)),
    by_variant: variantsReport
  };
}

function emptyGoalVariant(key) {
  return { key, exposures: 0, count: 0, profiles: new Set(), value_sum: 0, last_seen_at: "" };
}

function isGoalConversion(event = {}, goalEvent = "conversion") {
  if (event.event_type !== "conversion") return false;
  if (!goalEvent || goalEvent === "conversion") return true;
  const payload = isPlainObject(event.event) ? event.event : {};
  return [payload.name, payload.event_name, payload.type, payload.action, payload.goal, payload.conversion_name]
    .some((value) => String(value || "") === goalEvent);
}

function sameAttributionSubject(exposure = {}, conversion = {}) {
  return String(exposure.profile_key || "") === String(conversion.profile_key || "") &&
    String(exposure.variant_key || "") === String(conversion.variant_key || "");
}

function withinAttributionWindow(exposure = {}, conversion = {}, attributionMs = 0) {
  const exposureAt = Date.parse(exposure.occurred_at || "");
  const conversionAt = Date.parse(conversion.occurred_at || "");
  if (!Number.isFinite(exposureAt) || !Number.isFinite(conversionAt)) return false;
  const delta = conversionAt - exposureAt;
  return delta >= 0 && delta <= attributionMs;
}

function numericPathValue(source = {}, path = "") {
  if (!path) return 0;
  const value = String(path).split(".").filter(Boolean).reduce((current, key) => {
    if (!isPlainObject(current) && !Array.isArray(current)) return undefined;
    return current[key];
  }, source);
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundMetric(value) {
  return Math.round(Number(value || 0) * 1000000) / 1000000;
}

function precomputeMetrics(entries = [], runs = []) {
  const profiles = new Map();
  const bySurface = new Map();
  const bySync = new Map();
  const byResult = countBy(entries, (entry) => entry.result || "unknown");
  let lastSeenAt = "";
  for (const entry of entries) {
    const profileKey = entry.profile_key || "";
    if (!profileKey) continue;
    const inputs = entry.inputs || {};
    const surface = inputs.surface || entry.outputs?.surface || "";
    const syncId = inputs.sync_id || "";
    const current = profiles.get(profileKey) || {
      profile_key: profileKey,
      eligible: false,
      errors: 0,
      evaluations: 0,
      last_seen_at: "",
      error_messages: []
    };
    current.eligible = current.eligible || entry.result === "eligible";
    current.errors += Array.isArray(entry.errors) && entry.errors.length ? 1 : 0;
    current.error_messages = [...new Set([
      ...current.error_messages,
      ...(Array.isArray(entry.errors) ? entry.errors.map(precomputeErrorLabel).filter(Boolean) : [])
    ])].slice(0, 5);
    current.evaluations += 1;
    current.last_seen_at = maxIso(current.last_seen_at, entry.evaluated_at);
    profiles.set(profileKey, current);
    if (surface) incrementSimple(bySurface, surface);
    if (syncId) incrementSimple(bySync, syncId);
    lastSeenAt = maxIso(lastSeenAt, entry.evaluated_at);
  }
  const profileList = [...profiles.values()];
  const eligibleProfiles = profileList.filter((profile) => profile.eligible).length;
  const errorProfiles = profileList.filter((profile) => !profile.eligible && profile.errors > 0).length;
  const suppressedProfiles = profileList.filter((profile) => !profile.eligible && profile.errors === 0).length;
  for (const run of runs) {
    if (run.surface) incrementSimple(bySurface, run.surface, Number(run.profile_count || 0));
    if (run.sync_id) incrementSimple(bySync, run.sync_id, Number(run.profile_count || 0));
    lastSeenAt = maxIso(lastSeenAt, run.received_at);
  }
  const runProfiles = runs.reduce((sum, run) => sum + Number(run.profile_count || 0), 0);
  const runCandidateEvaluations = runs.reduce((sum, run) => sum + Number(run.candidate_evaluations || 0), 0);
  const runEligible = runs.reduce((sum, run) => sum + Number(run.eligible_count || 0), 0);
  const runNotSelected = runs.reduce((sum, run) => sum + Number(run.not_selected_count || 0), 0);
  const runErrors = runs.reduce((sum, run) => sum + Number(run.error_count || 0), 0);
  return {
    source: "meiro_pipes_inapp_precompute",
    run_count: runs.length,
    candidate_evaluations: Math.max(entries.length, runCandidateEvaluations),
    profile_count: Math.max(profileList.length, runProfiles),
    eligible_profiles: Math.max(eligibleProfiles, runEligible),
    suppressed_profiles: Math.max(suppressedProfiles, runNotSelected),
    error_profiles: Math.max(errorProfiles, runErrors),
    last_seen_at: lastSeenAt,
    by_result: Object.entries(byResult).map(([result, count]) => ({ result, count })).sort((left, right) => right.count - left.count || left.result.localeCompare(right.result)),
    by_surface: topSimple(bySurface),
    by_sync_id: topSimple(bySync),
    error_summary: precomputeErrorSummary(entries),
    recent_runs: runs.slice(0, 8),
    recent_profiles: profileList
      .sort((left, right) => String(right.last_seen_at).localeCompare(String(left.last_seen_at)))
      .slice(0, 8)
  };
}

function precomputeErrorSummary(entries = []) {
  const counts = new Map();
  for (const entry of entries) {
    for (const error of entry.errors || []) {
      const label = precomputeErrorLabel(error);
      if (label) incrementSimple(counts, label);
    }
  }
  return topSimple(counts).map((item) => ({
    ...item,
    category: precomputeErrorCategory(item.key)
  }));
}

function precomputeErrorLabel(error = "") {
  const text = String(error || "").trim();
  if (!text) return "";
  const missing = text.match(/^Missing attribute:\s*(.+)$/i)?.[1]?.trim();
  if (missing) return `Missing attribute: ${missing}`;
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function precomputeErrorCategory(label = "") {
  if (/^Missing attribute:/i.test(label)) return "missing_attribute";
  if (/message unavailable|message_not_found/i.test(label)) return "message";
  if (/lookup/i.test(label)) return "lookup";
  return "runtime";
}

function incrementSimple(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function topSimple(map) {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
    .slice(0, 8);
}

function maxIso(left = "", right = "") {
  return String(right || "").localeCompare(String(left || "")) > 0 ? right : left;
}

function rowToPrecomputeRun(row) {
  const payload = parse(row.run_json || "{}");
  return {
    id: row.id,
    received_at: row.received_at,
    source: row.source,
    surface: row.surface,
    sync_id: row.sync_id,
    profile_count: Number(row.profile_count || 0),
    candidate_evaluations: Number(row.candidate_evaluations || 0),
    eligible_count: Number(row.eligible_count || 0),
    not_selected_count: Number(row.not_selected_count || 0),
    error_count: Number(row.error_count || 0),
    diagnostics: payload.diagnostics || null,
    raw_sample: payload.raw_sample || null
  };
}

function rowToExperimentAssignment(row) {
  return {
    id: row.id,
    assigned_at: row.assigned_at,
    decision_key: row.decision_key,
    profile_key: row.profile_key,
    rule_version: Number(row.rule_version || 0),
    variant_key: row.variant_key,
    strategy: row.strategy,
    reason: row.reason,
    bucket: row.bucket == null ? null : Number(row.bucket),
    assignment: parse(row.assignment_json || "{}")
  };
}

function assignmentTrend(rows = [], start, windowHours) {
  const buckets = new Map();
  const startDate = floorToHour(start instanceof Date ? start : new Date(start));
  for (let index = 0; index < windowHours; index += 1) {
    const bucket = new Date(startDate.getTime() + index * 60 * 60 * 1000).toISOString();
    buckets.set(bucket, { bucket, total: 0, variants: [] });
  }
  for (const row of rows) {
    const bucket = row.bucket;
    if (!buckets.has(bucket)) buckets.set(bucket, { bucket, total: 0, variants: [] });
    const item = buckets.get(bucket);
    const count = Number(row.count || 0);
    item.total += count;
    item.variants.push({ key: row.variant_key || "(empty)", count });
  }
  return [...buckets.values()].map((item) => ({
    ...item,
    variants: item.variants
      .map((variant) => ({
        ...variant,
        share: item.total ? variant.count / item.total : 0
      }))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
  }));
}

function floorToHour(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  date.setUTCMinutes(0, 0, 0);
  return date;
}

function storeDeploymentReadiness(adapterInfo = {}, error = null) {
  const capabilities = adapterInfo?.capabilities || {};
  const checks = [
    {
      key: "database_connection",
      ok: !error,
      level: error ? "error" : "ok",
      label: "Database connection",
      detail: error ? error.message : "Store can run a lightweight database query."
    },
    {
      key: "persistent_storage",
      ok: capabilities.persistent === true,
      level: capabilities.persistent === true ? "ok" : "error",
      label: "Persistent storage",
      detail: capabilities.persistent === true ? "Data survives service restarts." : "Persistent storage is required before production use."
    },
    {
      key: "multi_instance",
      ok: capabilities.multi_instance === true,
      level: capabilities.multi_instance === true ? "ok" : "warn",
      label: "Multiple service replicas",
      detail: capabilities.multi_instance === true
        ? "Adapter supports multiple DEE service replicas."
        : "Run one DEE replica per database volume, or move to a managed database adapter."
    },
    {
      key: "online_migrations",
      ok: capabilities.online_migrations === true,
      level: capabilities.online_migrations === true ? "ok" : "warn",
      label: "Online migrations",
      detail: capabilities.online_migrations === true
        ? "Adapter is intended for online migration workflows."
        : "Schedule maintenance windows for schema changes."
    },
    {
      key: "managed_database",
      ok: capabilities.managed_database === true,
      level: capabilities.managed_database === true ? "ok" : "warn",
      label: "Managed database",
      detail: capabilities.managed_database === true
        ? "Database backups, failover, and storage growth can be handled by the database platform."
        : "Use file backups and avoid horizontally scaled writers."
    }
  ];
  const hasError = checks.some((check) => check.level === "error");
  const hasWarn = checks.some((check) => check.level === "warn");
  return {
    status: hasError ? "not_ready" : hasWarn ? "single_instance" : "production_ready",
    summary: hasError
      ? "Database is not ready."
      : hasWarn
        ? "Ready for local or single-instance deployments; managed database recommended for high traffic."
        : "Ready for multi-instance production deployment.",
    recommended_max_replicas: Number.isFinite(Number(capabilities.recommended_max_replicas)) ? Number(capabilities.recommended_max_replicas) : null,
    backup_mode: capabilities.backup_mode || "",
    checks
  };
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

function anomalySignal({ id, label, current, previous, unit, detail }) {
  const delta = Number(current || 0) - Number(previous || 0);
  const change = Number(previous || 0) > 0 ? delta / Number(previous || 0) : (Number(current || 0) > 0 ? 1 : 0);
  return {
    id,
    label,
    current: Number(current || 0),
    previous: Number(previous || 0),
    delta,
    change,
    unit,
    detail,
    level: anomalyLevel({ id, current: Number(current || 0), previous: Number(previous || 0), change })
  };
}

function anomalyLevel({ id, current, previous, change }) {
  if (id === "feedback_coverage") {
    if (current < 0.1 && previous >= 0.25) return "warn";
    if (current < 0.05 && previous >= 0.5) return "error";
    return "ok";
  }
  if (previous < 5 && current < 5) return "ok";
  if (previous >= 5 && change <= -0.75) return "error";
  if (previous >= 5 && change <= -0.5) return "warn";
  if (previous >= 10 && change >= 2) return "warn";
  return "ok";
}

function anomalyAlertFromSignal(signal) {
  if (!["warn", "error"].includes(signal.level)) return null;
  const direction = signal.delta >= 0 ? "up" : "down";
  const percent = Math.round(Math.abs(signal.change || 0) * 100);
  return {
    id: signal.id,
    level: signal.level,
    label: signal.label,
    title: `${signal.label} ${direction} ${percent}%`,
    detail: `${signal.current} now vs ${signal.previous} in the previous matching window.`
  };
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

function experimentWinnerRecommendation({ rule = {}, experiment = {}, variants = [], winner = null, significantWinner = null } = {}) {
  const baseline = baselineVariant(variants);
  const candidate = significantWinner || null;
  const candidateWeight = candidate ? Number(candidate.weight || 0) : 0;
  const checks = [
    {
      key: "published",
      passed: rule.status === "published",
      label: "Rule is published",
      detail: rule.status === "published" ? "Live traffic can use this experiment." : "Publish the experiment before winner automation."
    },
    {
      key: "running",
      passed: experiment.status === "running",
      label: "Experiment is running",
      detail: experiment.status === "running" ? "Assignments are active." : "Start the experiment before declaring a winner."
    },
    {
      key: "baseline",
      passed: Boolean(baseline),
      label: "Baseline exists",
      detail: baseline ? `Baseline is ${baseline.key}.` : "A baseline variant is required for significance comparison."
    },
    {
      key: "significance",
      passed: Boolean(candidate),
      label: "95% significant winner",
      detail: candidate
        ? `${candidate.key} is significant at ${Math.round(Number(candidate.significance?.confidence || 0) * 100)}% confidence.`
        : winner?.key
          ? `${winner.key} leads on conversion rate but is not yet a significant positive winner.`
          : "No winner candidate has exposure yet."
    },
    {
      key: "not_already_promoted",
      passed: !candidate || candidateWeight < 100,
      label: "Winner draft still needed",
      detail: candidate
        ? candidateWeight >= 100
          ? `${candidate.key} already has 100% allocation.`
          : "A winner draft can change allocation."
        : "Waiting for a significant winner before preparing a draft."
    }
  ];
  const eligible = checks.every((check) => check.passed);
  return {
    status: eligible ? "ready" : candidate && candidateWeight >= 100 ? "already_promoted" : "not_ready",
    action: eligible ? "prepare_winner_draft" : "monitor",
    eligible,
    variant_key: candidate?.key || "",
    observed_winner_variant: winner?.key || "",
    confidence: candidate?.significance?.confidence || 0,
    lift_vs_baseline: candidate?.lift_vs_baseline ?? null,
    checks,
    message: eligible
      ? `Prepare a guarded draft that shifts ${candidate.key} to 100% allocation.`
      : candidate && candidateWeight >= 100
        ? `${candidate.key} is already allocated at 100%.`
        : "Keep monitoring until the experiment has a significant positive winner."
  };
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
  if (!row?.sql || row.sql.includes("'skipped'")) return;
  db.exec(`
    ALTER TABLE client_events RENAME TO client_events_old;
    CREATE TABLE client_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'exposure', 'conversion', 'skipped')),
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

function imageBase64FromInput(input) {
  if (input.data_url) {
    const match = String(input.data_url).match(/^data:([^;,]+);base64,(.+)$/);
    if (!match) badRequest("data_url must be a base64 data URL");
    if (String(input.content_type || "").toLowerCase() !== match[1].toLowerCase()) badRequest("content_type must match the data URL media type");
    return match[2];
  }
  if (input.base64) return String(input.base64).replace(/\s+/g, "");
  badRequest("Message asset requires data_url or base64");
}

function collectAssetReferences(references, pattern, payload, reference) {
  const text = stringify(payload);
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

function assistantProviderPlanEvent(input = {}) {
  const plan = input.plan || {};
  const provider = plan.provider || {};
  const guardrails = plan.guardrails || {};
  const governance = plan.governance || {};
  const request = input.request || {};
  const prompt = String(request.prompt || "");
  const warnings = Array.isArray(guardrails.warnings) ? guardrails.warnings : [];
  const errors = Array.isArray(guardrails.errors) ? guardrails.errors : [];
  return {
    id: randomId(),
    planned_at: input.planned_at || createdAtNow(),
    planned_by: String(input.planned_by || "system"),
    mode: String(provider.mode || plan.mode || "deterministic"),
    status: String(provider.status || "unknown"),
    provider: String(provider.provider || ""),
    model: String(provider.model || ""),
    policy: String(provider.policy || governance.provider_policy || "balanced"),
    contract_version: String(provider.contract_version || governance.contract_version || "assistant-plan-v2"),
    governance_status: String(governance.status || "unknown"),
    prompt_hash: prompt ? createHash("sha256").update(prompt).digest("hex") : "",
    prompt_length: prompt.length,
    request_type: String(request.type || plan.mode || ""),
    decision_key: String(request.decision_key || ""),
    surface: String(request.surface || ""),
    action_count: Array.isArray(plan.actions) ? plan.actions.length : 0,
    warning_count: warnings.length,
    error_count: errors.length,
    duration_ms: Number(input.duration_ms || 0),
    fallback_reason: provider.status === "fallback" ? String(provider.message || "") : "",
    metadata: {
      has_history: Array.isArray(request.history) && request.history.length > 0,
      schema_available: Number(plan.schema?.available || 0),
      recommendation_count: Array.isArray(plan.recommendations) ? plan.recommendations.length : 0,
      clarification_count: Array.isArray(plan.clarifications) ? plan.clarifications.length : 0
    }
  };
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

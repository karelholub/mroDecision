import { randomBytes } from "node:crypto";
import { config } from "./config.js";
import { nativePostgresAdapterInfo, nativePostgresSchemaSql } from "./storePostgresNativeSchema.js";

const allowedSettingKeys = new Set([
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

  async queryAudit(params = {}) {
    const values = [];
    const where = [];
    for (const key of ["decision_key", "profile_key", "result"]) {
      if (params[key]) {
        values.push(String(params[key]));
        where.push(`${key} = $${values.length}`);
      }
    }
    if (params.from) {
      values.push(String(params.from));
      where.push(`evaluated_at >= $${values.length}`);
    }
    if (params.to) {
      values.push(String(params.to));
      where.push(`evaluated_at <= $${values.length}`);
    }
    if (params.matched_rule) {
      values.push(`%"${String(params.matched_rule)}"%`);
      where.push(`entry_json::text ILIKE $${values.length}`);
    }
    if (params.search) {
      values.push(`%${String(params.search)}%`);
      where.push(`entry_json::text ILIKE $${values.length}`);
    }
    const requestedLimit = Number(params.limit || 100);
    values.push(Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 100, 1000));
    const result = await this.client.query(
      `SELECT entry_json FROM audit_log ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY evaluated_at DESC LIMIT $${values.length}`,
      values
    );
    return result.rows.map((row) => parseJson(row.entry_json, {}));
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

  async addPrecomputeRun(input = {}) {
    const run = {
      id: input.id || `pre_${randomId(16)}`,
      received_at: input.received_at || new Date().toISOString(),
      source: input.source || "",
      surface: input.surface || "",
      sync_id: input.sync_id || "",
      profile_count: Number(input.profile_count || 0),
      candidate_evaluations: Number(input.candidate_evaluations || 0),
      eligible_count: Number(input.eligible_count || 0),
      not_selected_count: Number(input.not_selected_count || 0),
      error_count: Number(input.error_count || 0),
      metadata: isPlainObject(input.metadata) ? input.metadata : {}
    };
    await this.client.query(
      `INSERT INTO precompute_runs (
        id, received_at, source, surface, sync_id, profile_count, candidate_evaluations,
        eligible_count, not_selected_count, error_count, run_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
      [
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
        JSON.stringify(run.metadata)
      ]
    );
    return run;
  }

  async getMetrics(options = {}) {
    const now = Date.now();
    const windowHours = normalizeMetricsWindowHours(options.window_hours);
    const sinceWindow = new Date(now - windowHours * 60 * 60 * 1000).toISOString();
    const sincePreviousWindow = new Date(now - windowHours * 2 * 60 * 60 * 1000).toISOString();
    const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [rules, lookups, schemaItems, settings] = await Promise.all([
      this.listRuleSets(),
      this.listLookupTables(),
      this.listSchemaItems(),
      this.getSettings()
    ]);
    const auditSummary = await this.client.query(
      `SELECT
        COUNT(*) AS total_requests,
        SUM(CASE WHEN evaluated_at >= $1 THEN 1 ELSE 0 END) AS requests_window,
        SUM(CASE WHEN evaluated_at >= $2 THEN 1 ELSE 0 END) AS requests_24h,
        SUM(CASE WHEN evaluated_at >= $3 THEN 1 ELSE 0 END) AS requests_7d,
        COUNT(DISTINCT profile_key) AS unique_profiles,
        COUNT(DISTINCT CASE WHEN evaluated_at >= $1 THEN profile_key END) AS unique_profiles_window
       FROM audit_log`,
      [sinceWindow, since24h, since7d]
    );
    const resultDistribution = await this.client.query(
      "SELECT result, COUNT(*) AS count FROM audit_log WHERE evaluated_at >= $1 GROUP BY result ORDER BY count DESC, result ASC LIMIT 8",
      [sinceWindow]
    );
    const ruleUsage = await this.client.query(
      `SELECT
        decision_key,
        COUNT(*) AS requests,
        SUM(CASE WHEN evaluated_at >= $1 THEN 1 ELSE 0 END) AS requests_24h,
        MAX(evaluated_at) AS last_evaluated_at,
        COUNT(DISTINCT profile_key) AS unique_profiles
       FROM audit_log
       WHERE evaluated_at >= $2
       GROUP BY decision_key
       ORDER BY requests DESC, decision_key ASC
       LIMIT 10`,
      [since24h, sinceWindow]
    );
    const clientEventSummary = await this.client.query(
      `SELECT
        event_type,
        COUNT(*) AS count,
        SUM(CASE WHEN occurred_at >= $1 THEN 1 ELSE 0 END) AS count_window,
        SUM(CASE WHEN occurred_at >= $2 THEN 1 ELSE 0 END) AS count_24h,
        COUNT(DISTINCT profile_key) AS unique_profiles,
        COUNT(DISTINCT CASE WHEN occurred_at >= $1 THEN profile_key END) AS unique_profiles_window
       FROM client_events
       GROUP BY event_type
       ORDER BY event_type ASC`,
      [sinceWindow, since24h]
    );
    const precomputeRuns = await this.client.query(
      "SELECT * FROM precompute_runs WHERE received_at >= $1 ORDER BY received_at DESC LIMIT 100",
      [sinceWindow]
    );
    const auditRow = auditSummary.rows[0] || {};
    const eventRows = clientEventSummary.rows || [];
    return {
      generated_at: new Date().toISOString(),
      window: {
        hours: windowHours,
        from: sinceWindow,
        to: new Date(now).toISOString(),
        label: metricsWindowLabel(windowHours)
      },
      requests: {
        total: Number(auditRow.total_requests || 0),
        window: Number(auditRow.requests_window || 0),
        last_24h: Number(auditRow.requests_24h || 0),
        last_7d: Number(auditRow.requests_7d || 0),
        unique_profiles: Number(auditRow.unique_profiles || 0),
        unique_profiles_window: Number(auditRow.unique_profiles_window || 0)
      },
      rules: {
        total: rules.length,
        published: rules.filter((rule) => rule.status === "published").length,
        draft: rules.filter((rule) => rule.status === "draft").length,
        archived: rules.filter((rule) => rule.status === "archived").length
      },
      lookups: { total: lookups.length },
      schema: {
        total: schemaItems.length,
        attributes: schemaItems.filter((item) => item.kind === "attribute").length,
        segments: schemaItems.filter((item) => item.kind === "segment").length,
        context: schemaItems.filter((item) => item.kind === "context").length,
        last_sync_status: settings.schema_last_sync_status || "never",
        last_synced_at: settings.schema_last_synced_at || "",
        last_sync_count: Number(settings.schema_last_sync_count || 0)
      },
      client_events: {
        total: eventRows.reduce((sum, row) => sum + Number(row.count || 0), 0),
        last_24h: eventRows.reduce((sum, row) => sum + Number(row.count_24h || 0), 0),
        window: eventRows.reduce((sum, row) => sum + Number(row.count_window || 0), 0),
        by_type: eventRows.map((row) => ({
          event_type: row.event_type,
          count: Number(row.count_window || 0),
          total_count: Number(row.count || 0),
          count_24h: Number(row.count_24h || 0),
          unique_profiles: Number(row.unique_profiles_window || 0),
          total_unique_profiles: Number(row.unique_profiles || 0)
        }))
      },
      precompute: precomputeRunMetrics(precomputeRuns.rows.map(rowToPrecomputeRun)),
      result_distribution: resultDistribution.rows.map((row) => ({ result: row.result, count: Number(row.count || 0) })),
      rule_usage: ruleUsage.rows.map((row) => ({
        decision_key: row.decision_key,
        requests: Number(row.requests || 0),
        requests_window: Number(row.requests || 0),
        requests_24h: Number(row.requests_24h || 0),
        unique_profiles: Number(row.unique_profiles || 0),
        last_evaluated_at: row.last_evaluated_at ? isoValue(row.last_evaluated_at) : null
      })),
      anomaly_baseline: await this.getMetricsAnomalyBaseline({
        current_from: sinceWindow,
        previous_from: sincePreviousWindow,
        to: new Date(now).toISOString(),
        window_hours: windowHours
      })
    };
  }

  async getMetricsAnomalyBaseline({ current_from, previous_from, to, window_hours }) {
    const auditRows = await this.client.query(
      `SELECT
        SUM(CASE WHEN evaluated_at >= $1 AND evaluated_at <= $2 THEN 1 ELSE 0 END) AS current_requests,
        SUM(CASE WHEN evaluated_at >= $3 AND evaluated_at < $1 THEN 1 ELSE 0 END) AS previous_requests,
        COUNT(DISTINCT CASE WHEN evaluated_at >= $1 AND evaluated_at <= $2 THEN profile_key END) AS current_profiles,
        COUNT(DISTINCT CASE WHEN evaluated_at >= $3 AND evaluated_at < $1 THEN profile_key END) AS previous_profiles
       FROM audit_log`,
      [current_from, to, previous_from]
    );
    const eventRows = await this.client.query(
      `SELECT
        SUM(CASE WHEN occurred_at >= $1 AND occurred_at <= $2 THEN 1 ELSE 0 END) AS current_events,
        SUM(CASE WHEN occurred_at >= $3 AND occurred_at < $1 THEN 1 ELSE 0 END) AS previous_events
       FROM client_events`,
      [current_from, to, previous_from]
    );
    const audit = auditRows.rows[0] || {};
    const events = eventRows.rows[0] || {};
    const currentRequests = Number(audit.current_requests || 0);
    const previousRequests = Number(audit.previous_requests || 0);
    const currentProfiles = Number(audit.current_profiles || 0);
    const previousProfiles = Number(audit.previous_profiles || 0);
    const currentEvents = Number(events.current_events || 0);
    const previousEvents = Number(events.previous_events || 0);
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
    return {
      window_hours,
      current_from,
      previous_from,
      previous_to: current_from,
      generated_at: new Date().toISOString(),
      signals,
      alerts: signals.map((signal) => anomalyAlertFromSignal(signal)).filter(Boolean)
    };
  }

  async getExperimentOperations() {
    const rules = (await this.listRuleSets()).filter((rule) => rule.type === "experiment");
    const experiments = [];
    for (const rule of rules) {
      let publishedVersion = null;
      try {
        publishedVersion = rule.version ? await this.getVersion(rule.decision_key) : null;
      } catch {
        publishedVersion = null;
      }
      const draftExperiment = rule.metadata?.experiment || {};
      const publishedExperiment = publishedVersion?.metadata?.experiment || {};
      const activeExperiment = publishedVersion ? publishedExperiment : draftExperiment;
      const variants = Array.isArray(activeExperiment.variants) ? activeExperiment.variants : [];
      const eventRows = await this.client.query(
        `SELECT
          variant_key,
          event_type,
          COUNT(*) AS count,
          COUNT(DISTINCT profile_key) AS unique_profiles,
          MAX(occurred_at) AS last_seen_at
         FROM client_events
         WHERE decision_key = $1
         GROUP BY variant_key, event_type
         ORDER BY variant_key ASC, event_type ASC`,
        [rule.decision_key]
      );
      const eventTotals = await this.client.query(
        `SELECT
          event_type,
          COUNT(*) AS count,
          COUNT(DISTINCT profile_key) AS unique_profiles,
          MAX(occurred_at) AS last_seen_at
         FROM client_events
         WHERE decision_key = $1
         GROUP BY event_type
         ORDER BY event_type ASC`,
        [rule.decision_key]
      );
      const rawEventRows = await this.client.query(
        "SELECT event_json FROM client_events WHERE decision_key = $1 ORDER BY occurred_at ASC",
        [rule.decision_key]
      );
      const rawEvents = rawEventRows.rows.map((row) => parseJson(row.event_json, {}));
      const variantMetrics = variants.map((variant) => {
        const rows = eventRows.rows.filter((row) => (row.variant_key || "") === (variant.key || ""));
        const events = eventCounts(rows);
        return {
          key: variant.key,
          weight: Number(variant.weight || 0),
          outputs: isPlainObject(variant.outputs) ? variant.outputs : {},
          events,
          conversion_rate: conversionRate(events)
        };
      });
      const unconfiguredVariantRows = eventRows.rows
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
      const events = eventCounts(eventTotals.rows);
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
      const assignmentHistory = await this.getExperimentAssignmentHistory(rule.decision_key);
      const winnerRecommendation = experimentWinnerRecommendation({
        rule,
        experiment: activeExperiment,
        variants: variantMetrics,
        winner,
        significantWinner
      });
      experiments.push({
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
      });
    }
    return {
      generated_at: new Date().toISOString(),
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

  async getExperimentAssignmentHistory(decisionKey, options = {}) {
    const windowHours = Math.max(1, Math.min(Number(options.window_hours || 24), 168));
    const end = floorToHour(new Date(Date.now()));
    const start = options.since ? new Date(options.since) : new Date(end.getTime() - (windowHours - 1) * 60 * 60 * 1000);
    const since = start.toISOString();
    const total = await this.client.query(
      "SELECT COUNT(*) AS count FROM experiment_assignments WHERE decision_key = $1 AND assigned_at >= $2",
      [decisionKey, since]
    );
    const recent = await this.client.query(
      `SELECT *
       FROM experiment_assignments
       WHERE decision_key = $1 AND assigned_at >= $2
       ORDER BY assigned_at DESC
       LIMIT $3`,
      [decisionKey, since, Math.min(Number(options.limit || 100), 500)]
    );
    const trendRows = await this.client.query(
      `SELECT
        date_trunc('hour', assigned_at) AS bucket,
        COALESCE(NULLIF(variant_key, ''), '(empty)') AS variant_key,
        COUNT(*) AS count
       FROM experiment_assignments
       WHERE decision_key = $1 AND assigned_at >= $2
       GROUP BY bucket, variant_key
       ORDER BY bucket ASC, variant_key ASC`,
      [decisionKey, since]
    );
    return {
      window_hours: windowHours,
      total: Number(total.rows[0]?.count || 0),
      by_variant: await this.assignmentGroup(decisionKey, since, "variant_key"),
      by_strategy: await this.assignmentGroup(decisionKey, since, "strategy"),
      by_reason: await this.assignmentGroup(decisionKey, since, "reason"),
      trend: assignmentTrend(trendRows.rows, start, windowHours),
      recent: recent.rows.map(rowToExperimentAssignment).slice(0, 12)
    };
  }

  async assignmentGroup(decisionKey, since, column) {
    const allowed = new Set(["variant_key", "strategy", "reason"]);
    if (!allowed.has(column)) return [];
    const result = await this.client.query(
      `SELECT COALESCE(NULLIF(${column}, ''), '(empty)') AS key, COUNT(*) AS count
       FROM experiment_assignments
       WHERE decision_key = $1 AND assigned_at >= $2
       GROUP BY key
       ORDER BY count DESC, key ASC`,
      [decisionKey, since]
    );
    return result.rows.map((row) => ({ key: row.key, count: Number(row.count || 0) }));
  }

  async listCampaignOperations(params = {}) {
    const windowHours = normalizeMetricsWindowHours(params.window_hours);
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
    const campaigns = new Map();
    const decisionCampaigns = new Map();
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
    for (const rule of await this.listRuleSets()) {
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
      const hydratedRule = await this.getRuleSet(rule.decision_key);
      const summary = campaignRuleSummary({ ...rule, draft: hydratedRule?.draft || {} });
      if (rule.type === "experiment") campaign.assets.experiments.push(summary);
      else campaign.assets.rules.push(summary);
      touch(campaign, rule.updated_at);
    }
    for (const message of await this.listMessages()) {
      const campaign = ensure(campaignLabel(message.metadata) || "Unassigned");
      campaign.messages += 1;
      if (message.surface && !campaign.surfaces.includes(message.surface)) campaign.surfaces.push(message.surface);
      const summary = campaignMessageSummary(message);
      messageSummaries.set(message.id, summary);
      campaign.assets.messages.push(summary);
      touch(campaign, message.updated_at);
    }
    const requestRows = await this.client.query(
      `SELECT decision_key, COUNT(*) AS requests, COUNT(DISTINCT profile_key) AS unique_profiles, MAX(evaluated_at) AS last_seen_at
       FROM audit_log
       WHERE evaluated_at >= $1
       GROUP BY decision_key`,
      [since]
    );
    for (const row of requestRows.rows) {
      const campaign = ensure(decisionCampaigns.get(row.decision_key) || "Unassigned");
      campaign.requests += Number(row.requests || 0);
      campaign.unique_profiles += Number(row.unique_profiles || 0);
      if (!campaign.decision_keys.includes(row.decision_key)) campaign.decision_keys.push(row.decision_key);
      touch(campaign, row.last_seen_at);
    }
    const eventRows = await this.client.query(
      `SELECT decision_key, event_type, COUNT(*) AS count, MAX(occurred_at) AS last_seen_at
       FROM client_events
       WHERE occurred_at >= $1
       GROUP BY decision_key, event_type`,
      [since]
    );
    for (const row of eventRows.rows) {
      const campaign = ensure(decisionCampaigns.get(row.decision_key) || "Unassigned");
      if (campaign.client_events[row.event_type] !== undefined) campaign.client_events[row.event_type] += Number(row.count || 0);
      if (!campaign.decision_keys.includes(row.decision_key)) campaign.decision_keys.push(row.decision_key);
      touch(campaign, row.last_seen_at);
    }
    const recentRows = await this.client.query(
      `SELECT decision_key, event_json, occurred_at
       FROM client_events
       WHERE occurred_at >= $1
       ORDER BY occurred_at DESC
       LIMIT 200`,
      [since]
    );
    for (const row of recentRows.rows) {
      const campaign = campaigns.get(decisionCampaigns.get(row.decision_key) || "Unassigned");
      if (!campaign || campaign.recent_events.length >= 12) continue;
      const event = parseJson(row.event_json, {});
      campaign.recent_events.push({
        occurred_at: event.occurred_at || isoValue(row.occurred_at),
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

  async listRuleConflicts(params = {}) {
    const campaigns = await this.listCampaignOperations({ window_hours: params.window_hours, limit: params.limit || 50 });
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
      generated_at: new Date().toISOString(),
      count: conflicts.length,
      conflicts,
      by_rule: byRule
    };
  }

  async listCampaignAssets(campaignName = "Unassigned") {
    const target = campaignName || "Unassigned";
    const belongsToCampaign = (metadata = {}) => (campaignLabel(metadata) || "Unassigned") === target;
    const [rules, messages] = await Promise.all([this.listRuleSets(), this.listMessages()]);
    return {
      campaign: target,
      rules: rules.filter((rule) => belongsToCampaign(rule.metadata)),
      messages: messages.filter((message) => belongsToCampaign(message.metadata))
    };
  }

  async getClientEventMetrics(params = {}) {
    const values = [];
    const where = [];
    for (const key of ["decision_key", "profile_key", "event_type", "variant_key", "message_id", "surface"]) {
      if (params[key]) {
        values.push(String(params[key]));
        where.push(`${key} = $${values.length}`);
      }
    }
    if (params.event_object) {
      values.push(String(params.event_object), String(params.event_object));
      where.push(`(variant_key = $${values.length - 1} OR message_id = $${values.length})`);
    }
    if (params.from) {
      values.push(String(params.from));
      where.push(`occurred_at >= $${values.length}`);
    }
    if (params.to) {
      values.push(String(params.to));
      where.push(`occurred_at <= $${values.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const requestedLimit = Number(params.limit || 10);
    const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 10, 100);
    const group = async (column) => {
      const result = await this.client.query(
        `SELECT ${column} AS key, event_type, COUNT(*) AS count, COUNT(DISTINCT profile_key) AS unique_profiles, MAX(occurred_at) AS last_seen_at
         FROM client_events
         ${whereSql}
         GROUP BY ${column}, event_type
         ORDER BY count DESC, key ASC
         LIMIT $${values.length + 1}`,
        [...values, limit]
      );
      return result.rows.map(rowToClientEventMetric);
    };
    const recentLimit = Math.min(Number(params.recent_limit || 20) || 20, 100);
    const recent = await this.client.query(
      `SELECT event_json FROM client_events ${whereSql} ORDER BY occurred_at DESC LIMIT $${values.length + 1}`,
      [...values, recentLimit]
    );
    return {
      generated_at: new Date().toISOString(),
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
      by_rule: await group("decision_key"),
      by_variant: await group("variant_key"),
      by_message: await group("message_id"),
      by_surface: await group("surface"),
      by_profile: await group("profile_key"),
      recent_events: recent.rows.map((row) => parseJson(row.event_json, {}))
    };
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

  async setMessageCampaign(id, input = {}, author = "system") {
    const message = await this.getMessage(id);
    if (!message) throw new Error(`Message not found: ${id}`);
    return this.upsertMessage(id, {
      ...message,
      metadata: assignCampaignMetadata(message.metadata || {}, input.campaign || "", input.folder || "")
    }, author);
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

  async setRuleApproval(key, input = {}, author = "system") {
    const ruleSet = await this.getRuleSet(key);
    if (!ruleSet) throw new Error(`Rule set not found: ${key}`);
    if (ruleSet.status === "archived") throw new Error("Archived rule sets cannot be reviewed");
    const status = input.status;
    if (!["submitted", "approved"].includes(status)) throw new Error("Approval status must be submitted or approved");
    const now = new Date().toISOString();
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

  async setRuleCampaign(key, input = {}, author = "system") {
    const ruleSet = await this.getRuleSet(key);
    if (!ruleSet) throw new Error(`Rule set not found: ${key}`);
    const updated = {
      ...ruleSet,
      metadata: assignCampaignMetadata(ruleSet.metadata || {}, input.campaign || "", input.folder || ""),
      author,
      updated_at: new Date().toISOString()
    };
    await this.updateRuleSetRow(updated);
    return updated;
  }

  async duplicateRuleSet(key, input = {}, author = "system") {
    const ruleSet = await this.getRuleSet(key);
    if (!ruleSet) throw new Error(`Rule set not found: ${key}`);
    const newKey = normalizeKey(input.decision_key || `${key}_copy`);
    if (!newKey) throw new Error("decision_key is required");
    if (await this.getRuleSet(newKey)) throw new Error(`Rule set already exists: ${newKey}`);
    const now = new Date().toISOString();
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
    await this.insertRuleSet(duplicate);
    return duplicate;
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

export async function loadNativePostgresStore() {
  if (!config.databaseUrl) {
    throw new Error("DEE_STORE_ADAPTER=postgres_native requires DEE_DATABASE_URL.");
  }
  const { Pool } = await loadPg();
  const pool = new Pool({ connectionString: config.databaseUrl });
  try {
    await applyNativePostgresSchema(pool);
    const store = new PostgresNativeReadStore(pool);
    store.close = async () => {
      await pool.end();
    };
    return store;
  } catch (error) {
    await pool.end().catch(() => {});
    throw error;
  }
}

async function applyNativePostgresSchema(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const statement of nativePostgresSchemaSql()) {
      await client.query(statement);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function loadPg() {
  try {
    return await import("pg");
  } catch (error) {
    throw new Error(`DEE_STORE_ADAPTER=postgres_native requires the pg package. Run npm install before using this adapter. (${error.message})`);
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

function rowToPrecomputeRun(row) {
  const payload = parseJson(row.run_json, {});
  return {
    id: row.id,
    received_at: isoValue(row.received_at),
    source: row.source || "",
    surface: row.surface || "",
    sync_id: row.sync_id || "",
    profile_count: Number(row.profile_count || 0),
    candidate_evaluations: Number(row.candidate_evaluations || 0),
    eligible_count: Number(row.eligible_count || 0),
    not_selected_count: Number(row.not_selected_count || 0),
    error_count: Number(row.error_count || 0),
    diagnostics: payload.diagnostics || null
  };
}

function rowToExperimentAssignment(row) {
  return {
    id: row.id,
    assigned_at: isoValue(row.assigned_at),
    decision_key: row.decision_key,
    profile_key: row.profile_key,
    rule_version: Number(row.rule_version || 0),
    variant_key: row.variant_key,
    strategy: row.strategy,
    reason: row.reason,
    bucket: row.bucket == null ? null : Number(row.bucket),
    assignment: parseJson(row.assignment_json, {})
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
    const bucket = floorToHour(row.bucket).toISOString();
    if (!buckets.has(bucket)) buckets.set(bucket, { bucket, total: 0, variants: [] });
    const item = buckets.get(bucket);
    const count = Number(row.count || 0);
    item.total += count;
    item.variants.push({ key: row.variant_key || "(empty)", count });
  }
  return [...buckets.values()].map((item) => ({
    ...item,
    variants: item.variants
      .map((variant) => ({ ...variant, share: item.total ? variant.count / item.total : 0 }))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
  }));
}

function floorToHour(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  date.setUTCMinutes(0, 0, 0);
  return date;
}

function precomputeRunMetrics(runs = []) {
  const latest = runs[0] || null;
  const totals = runs.reduce(
    (acc, run) => {
      acc.runs += 1;
      acc.profiles += Number(run.profile_count || 0);
      acc.candidate_evaluations += Number(run.candidate_evaluations || 0);
      acc.eligible += Number(run.eligible_count || 0);
      acc.not_selected += Number(run.not_selected_count || 0);
      acc.errors += Number(run.error_count || 0);
      return acc;
    },
    { runs: 0, profiles: 0, candidate_evaluations: 0, eligible: 0, not_selected: 0, errors: 0 }
  );
  return {
    ...totals,
    eligibility_rate: totals.profiles ? totals.eligible / totals.profiles : 0,
    error_rate: totals.profiles ? totals.errors / totals.profiles : 0,
    latest_run: latest
  };
}

function eventCounts(rows = []) {
  const counts = {};
  for (const row of rows) {
    counts[row.event_type] = {
      count: Number(row.count || 0),
      unique_profiles: Number(row.unique_profiles || 0),
      last_seen_at: row.last_seen_at ? isoValue(row.last_seen_at) : null
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
    const occurredAt = isoValue(conversion.occurred_at || "");
    if (!variant.last_seen_at || occurredAt > variant.last_seen_at) variant.last_seen_at = occurredAt;
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
    return value.map((item) => normalizeConditionForSignature(item)).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }
  if (!isPlainObject(value)) return value;
  const sorted = {};
  for (const key of Object.keys(value).sort()) sorted[key] = normalizeConditionForSignature(value[key]);
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

function rowToClientEventMetric(row) {
  return {
    key: row.key || "(empty)",
    event_type: row.event_type,
    count: Number(row.count || 0),
    unique_profiles: Number(row.unique_profiles || 0),
    last_seen_at: row.last_seen_at ? isoValue(row.last_seen_at) : null
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
    message: `${signal.label} is ${direction} ${percent}% versus the previous window.`,
    detail: signal.detail,
    current: signal.current,
    previous: signal.previous,
    unit: signal.unit
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

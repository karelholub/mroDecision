import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("sqlite store persists rule versions, audits, lookups, and bundles", async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "dee-store-"));
  process.env.DEE_DATA_DIR = dataDir;
  process.env.DEE_DB_PATH = path.join(dataDir, "test.sqlite");

  const { Store } = await import(`../src/store.js?store-test=${Date.now()}`);
  const store = await Store.load();

  const ruleSet = store.createRuleSet(
    {
      name: "Campaign Suppression",
      decision_key: "campaign_suppression",
      type: "inapp_message",
      priority: 20,
      surface: "home_banner",
      cache_policy: { client_ttl: 60 },
      metadata: { owner: "growth" },
      draft: {
        fallback: { result: "eligible", outputs: {} },
        branches: [
          {
            id: "risk_segment",
            when: { source: "segment", key: "high_risk_segment", operator: "equals", value: true },
            result: "suppressed",
            outputs: { suppression_reason: "high_risk" }
          }
        ]
      }
    },
    "tester"
  );
  assert.equal(ruleSet.status, "draft");
  assert.equal(ruleSet.type, "inapp_message");
  assert.equal(ruleSet.priority, 20);

  const version = store.publish("campaign_suppression", "tester");
  assert.equal(version.version, 1);
  assert.equal(store.getVersion("campaign_suppression").definition.branches[0].id, "risk_segment");
  assert.equal(store.getVersion("campaign_suppression").metadata.owner, "growth");

  const submitted = store.setRuleApproval("campaign_suppression", { status: "submitted", draft_hash: "hash-1", note: "ready", assigned_to: "approver@example.test" }, "editor");
  assert.equal(submitted.metadata.approval.status, "submitted");
  assert.equal(submitted.metadata.approval.requested_by, "editor");
  assert.equal(submitted.metadata.approval.assigned_to, "approver@example.test");
  assert.equal(submitted.metadata.approval.history.at(-1).note, "ready");
  const approved = store.setRuleApproval("campaign_suppression", { status: "approved", draft_hash: "hash-1" }, "publisher");
  assert.equal(approved.metadata.approval.status, "approved");
  assert.equal(approved.metadata.approval.approved_by, "publisher");
  assert.equal(approved.metadata.approval.assigned_to, "approver@example.test");
  assert.equal(approved.metadata.approval.history.at(-1).status, "approved");

  store.updateDraft(
    "campaign_suppression",
    {
      metadata: { owner: "retention" },
      draft: {
        fallback: { result: "eligible", outputs: {} },
        branches: [
          {
            id: "new_risk_segment",
            when: { source: "segment", key: "high_risk_segment", operator: "equals", value: true },
            result: "suppressed",
            outputs: { suppression_reason: "new_high_risk" }
          }
        ]
      }
    },
    "tester"
  );
  assert.equal(store.getRuleSet("campaign_suppression").draft.branches[0].id, "new_risk_segment");
  assert.equal(store.getRuleSet("campaign_suppression").metadata.owner, "retention");
  assert.equal(store.getRuleSet("campaign_suppression").metadata.approval.status, "draft");
  const rolledBack = store.rollbackDraftToVersion("campaign_suppression", 1, "tester");
  assert.equal(rolledBack.status, "draft");
  assert.equal(rolledBack.draft.branches[0].id, "risk_segment");
  assert.equal(rolledBack.metadata.owner, "growth");

  const copy = store.duplicateRuleSet("campaign_suppression", { decision_key: "campaign_suppression_copy" }, "tester");
  assert.equal(copy.status, "draft");
  assert.equal(copy.type, "inapp_message");
  assert.equal(copy.versions.length, 0);

  const archived = store.archiveRuleSet("campaign_suppression_copy", "tester");
  assert.equal(archived.status, "archived");

  store.addAudit({
    decision_key: "campaign_suppression",
    profile_key: "p-1",
    evaluated_at: "2026-05-27T00:00:00.000Z",
    rule_version: 1,
    result: "suppressed",
    outputs: { suppression_reason: "high_risk" },
    matched_rules: ["risk_segment"],
    errors: []
  });
  assert.equal(store.queryAudit({ decision_key: "campaign_suppression" })[0].result, "suppressed");
  assert.equal(store.queryAudit({ matched_rule: "risk_segment" })[0].profile_key, "p-1");
  assert.equal(store.queryAudit({ search: "high_risk" })[0].matched_rules[0], "risk_segment");
  assert.equal(store.queryAudit({ from: "2026-05-28T00:00:00.000Z" }).length, 0);
  const originalDateNow = Date.now;
  Date.now = () => Date.parse("2026-05-28T00:00:00.000Z");
  try {
    const metrics = store.getMetrics({ window_hours: 72 });
    assert.equal(metrics.requests.total, 1);
    assert.equal(metrics.requests.window, 1);
    assert.equal(metrics.window.label, "Last 3 days");
    assert.equal(metrics.rules.total, 2);
    assert.equal(metrics.result_distribution[0].result, "suppressed");
    assert.equal(metrics.rule_usage[0].decision_key, "campaign_suppression");
    assert.ok(metrics.anomaly_baseline.signals.some((signal) => signal.id === "request_volume"));
    assert.ok(Array.isArray(metrics.anomaly_baseline.alerts));
    assert.equal(store.getMetrics({ window_hours: 1 }).requests.window, 0);
  } finally {
    Date.now = originalDateNow;
  }
  const ruleMetrics = store.getRuleMetrics("campaign_suppression");
  assert.equal(ruleMetrics.requests, 1);
  assert.equal(ruleMetrics.matched_branch_distribution[0].branch, "risk_segment");
  assert.equal(ruleMetrics.recent_decisions[0].profile_key, "p-1");
  const clientEvent = store.addClientEvent({
    event_id: "evt-test-1",
    event_type: "exposure",
    occurred_at: "2026-05-27T00:01:00.000Z",
    decision_key: "campaign_suppression",
    profile_key: "p-1",
    rule_version: 1,
    variant_key: "control",
    surface: "homepage",
    context: { channel: "web" }
  });
  assert.equal(clientEvent.event_id, "evt-test-1");
  assert.equal(clientEvent.accepted, true);
  assert.equal(clientEvent.duplicate, false);
  const duplicateClientEvent = store.addClientEvent({
    event_id: "evt-test-1",
    event_type: "exposure",
    occurred_at: "2026-05-27T00:02:00.000Z",
    decision_key: "campaign_suppression",
    profile_key: "p-1",
    rule_version: 1,
    variant_key: "control",
    surface: "homepage",
    context: { channel: "retry" }
  });
  assert.equal(duplicateClientEvent.accepted, false);
  assert.equal(duplicateClientEvent.duplicate, true);
  assert.equal(duplicateClientEvent.context.channel, "web");
  const originalEventMetricsDateNow = Date.now;
  Date.now = () => Date.parse("2026-05-28T00:00:00.000Z");
  try {
    const eventMetrics = store.getMetrics().client_events;
    assert.equal(eventMetrics.total, 1);
    assert.equal(eventMetrics.by_type[0].event_type, "exposure");
  } finally {
    Date.now = originalEventMetricsDateNow;
  }
  assert.equal(store.countClientEvents({ event_type: "exposure", decision_key: "campaign_suppression", profile_key: "p-1" }), 1);
  assert.equal(store.countClientEvents({ event_type: "impression", decision_key: "campaign_suppression", profile_key: "p-1" }), 0);
  const eventReport = store.getClientEventMetrics({ decision_key: "campaign_suppression" });
  assert.equal(eventReport.by_rule[0].key, "campaign_suppression");
  assert.equal(eventReport.by_variant[0].key, "control");
  assert.equal(eventReport.recent_events[0].event_id, "evt-test-1");
  assert.equal(store.getClientEventMetrics({ event_object: "control" }).recent_events[0].event_id, "evt-test-1");

  store.createRuleSet(
    {
      name: "Hero Experiment",
      decision_key: "hero_experiment",
      type: "experiment",
      metadata: {
        experiment: {
          status: "running",
          unit: "profile",
          variants: [
            { key: "control", weight: 50, outputs: { headline: "A" } },
            { key: "treatment", weight: 50, outputs: { headline: "B" } }
          ]
        }
      },
      draft: { fallback: { result: "eligible", outputs: {} }, branches: [] }
    },
    "tester"
  );
  store.publish("hero_experiment", "tester");
  store.addClientEvent({
    event_id: "evt-experiment-1",
    event_type: "exposure",
    occurred_at: "2026-05-27T00:02:00.000Z",
    decision_key: "hero_experiment",
    profile_key: "p-1",
    rule_version: 1,
    variant_key: "treatment",
    surface: "homepage"
  });
  store.addClientEvent({
    event_id: "evt-experiment-2",
    event_type: "conversion",
    occurred_at: "2026-05-27T00:03:00.000Z",
    decision_key: "hero_experiment",
    profile_key: "p-1",
    rule_version: 1,
    variant_key: "treatment",
    surface: "homepage",
    event: { name: "signup", value: 1 }
  });
  store.addClientEvent({
    event_id: "evt-experiment-3",
    event_type: "exposure",
    occurred_at: "2026-05-27T00:04:00.000Z",
    decision_key: "hero_experiment",
    profile_key: "p-2",
    rule_version: 1,
    variant_key: "control",
    surface: "homepage"
  });
  store.addClientEvent({
    event_id: "evt-experiment-4",
    event_type: "exposure",
    occurred_at: "2026-05-27T00:05:00.000Z",
    decision_key: "hero_experiment",
    profile_key: "p-3",
    rule_version: 1,
    variant_key: "control",
    surface: "homepage"
  });
  store.addClientEvent({
    event_id: "evt-experiment-5",
    event_type: "conversion",
    occurred_at: "2026-05-27T00:06:00.000Z",
    decision_key: "hero_experiment",
    profile_key: "p-2",
    rule_version: 1,
    variant_key: "control",
    surface: "homepage",
    event: { name: "signup", value: 1 }
  });
  const experimentOps = store.getExperimentOperations();
  assert.equal(experimentOps.summary.total, 1);
  assert.equal(experimentOps.summary.running, 1);
  assert.equal(experimentOps.summary.archived, 0);
  assert.equal(experimentOps.summary.exposures, 3);
  assert.equal(experimentOps.summary.conversions, 2);
  assert.equal(experimentOps.experiments[0].baseline_variant, "control");
  assert.equal(experimentOps.experiments[0].winner_variant, "treatment");
  const treatmentVariant = experimentOps.experiments[0].variants.find((variant) => variant.key === "treatment");
  assert.equal(treatmentVariant.events.exposure.count, 1);
  assert.equal(treatmentVariant.events.conversion.count, 1);
  assert.equal(treatmentVariant.conversion_rate, 1);
  assert.equal(treatmentVariant.lift_vs_baseline, 1);
  assert.equal(treatmentVariant.significance.status, "needs_sample");
  assert.equal(experimentOps.experiments[0].significant_winner_variant, "");

  for (let index = 0; index < 100; index += 1) {
    store.addClientEvent({
      event_id: `evt-control-exposure-${index}`,
      event_type: "exposure",
      occurred_at: "2026-05-27T01:00:00.000Z",
      decision_key: "hero_experiment",
      profile_key: `control-${index}`,
      rule_version: 1,
      variant_key: "control",
      surface: "homepage"
    });
    if (index < 10) {
      store.addClientEvent({
        event_id: `evt-control-conversion-${index}`,
        event_type: "conversion",
        occurred_at: "2026-05-27T01:01:00.000Z",
        decision_key: "hero_experiment",
        profile_key: `control-${index}`,
        rule_version: 1,
        variant_key: "control",
        surface: "homepage"
      });
    }
    store.addClientEvent({
      event_id: `evt-treatment-exposure-${index}`,
      event_type: "exposure",
      occurred_at: "2026-05-27T01:02:00.000Z",
      decision_key: "hero_experiment",
      profile_key: `treatment-${index}`,
      rule_version: 1,
      variant_key: "treatment",
      surface: "homepage"
    });
    if (index < 30) {
      store.addClientEvent({
        event_id: `evt-treatment-conversion-${index}`,
        event_type: "conversion",
        occurred_at: "2026-05-27T01:03:00.000Z",
        decision_key: "hero_experiment",
        profile_key: `treatment-${index}`,
        rule_version: 1,
        variant_key: "treatment",
        surface: "homepage"
      });
    }
  }
  const significantOps = store.getExperimentOperations();
  const significantTreatment = significantOps.experiments[0].variants.find((variant) => variant.key === "treatment");
  assert.equal(significantTreatment.significance.significant, true);
  assert.equal(significantTreatment.significance.status, "significant_95");
  assert.equal(significantOps.experiments[0].significant_winner_variant, "treatment");

  const table = store.replaceLookupTable("tiers", {
    key_column: "country",
    rows: [{ country: "CZ", tier: "A" }],
    metadata: { validation: { policy: "block", rules: [{ column: "country", required: true, unique: true, type: "text" }] } }
  }, "tester");
  assert.equal(table.version, 1);
  assert.equal(table.metadata.validation.policy, "block");
  assert.equal(store.listLookupTables()[0].rows[0].tier, "A");
  assert.equal(store.listLookupTableVersions("tiers").length, 1);
  assert.equal(store.getLookupTableVersion("tiers", 1).rows[0].tier, "A");
  assert.equal(store.getLookupTableVersion("tiers", 1).metadata.validation.rules[0].column, "country");
  const updatedTable = store.replaceLookupTable("tiers", { key_column: "country", rows: [{ country: "CZ", tier: "B" }] }, "tester");
  assert.equal(updatedTable.version, 2);
  assert.equal(store.listLookupTableVersions("tiers").length, 2);
  assert.equal(store.getLookupTableVersion("tiers", 1).rows[0].tier, "A");
  assert.equal(store.getLookupTableVersion("tiers", 2).rows[0].tier, "B");
  const message = store.upsertMessage(
    "hero_offer",
    {
      name: "Hero Offer",
      surface: "homepage",
      default_content: { title: "Hello", body: "Offer body" },
      content_schema: { title: "string", body: "string" }
    },
    "tester"
  );
  assert.equal(message.status, "active");
  assert.equal(store.getMessage("hero_offer").default_content.title, "Hello");
  assert.equal(store.listMessages({ surface: "homepage" })[0].id, "hero_offer");
  const asset = store.createMessageAsset(
    {
      filename: "hero.png",
      content_type: "image/png",
      data_url: "data:image/png;base64,iVBORw0KGgo="
    },
    "tester"
  );
  assert.equal(asset.content_url, `/v1/message-assets/${asset.id}/content`);
  store.upsertMessage(
    "hero_offer",
    {
      name: "Hero Offer",
      surface: "homepage",
      default_content: { title: "Hello", body: "Offer body", image_url: asset.content_url },
      content_schema: { title: "string", body: "string", image_url: "url" }
    },
    "tester"
  );
  assert.equal(store.listMessageAssets()[0].used_by[0].id, "hero_offer");
  assert.throws(() => store.deleteMessageAsset(asset.id), /still used/);
  assert.equal(store.cleanupMessageAssets().deleted, 0);
  store.upsertMessage(
    "hero_offer",
    {
      name: "Hero Offer",
      surface: "homepage",
      default_content: { title: "Hello", body: "Offer body", image_url: "" },
      content_schema: { title: "string", body: "string", image_url: "url" }
    },
    "tester"
  );
  assert.equal(store.cleanupMessageAssets().deleted, 1);
  assert.equal(store.listMessageAssets().length, 0);

  const savedProfile = store.upsertEvaluationProfile(
    "nbo_green_profile",
    {
      name: "NBO Green Profile",
      request: {
        decision_key: "next_best_offer",
        profile_key: "profile-1",
        identifiers: [{ typeId: "email", value: "user@example.com" }],
        attributes: { lead_score: [{ value: 90 }] },
        segments: {},
        context: { channel: "email" }
      }
    },
    "tester"
  );
  assert.equal(savedProfile.decision_key, "next_best_offer");
  assert.equal(store.listEvaluationProfiles({ decision_key: "next_best_offer" })[0].id, "nbo_green_profile");
  store.deleteEvaluationProfile("nbo_green_profile");
  assert.equal(store.listEvaluationProfiles().length, 0);

  const apiToken = store.createApiToken({ name: "Evaluate token", scopes: ["evaluate"] }, "tester");
  assert.match(apiToken.token, /^dee_/);
  const verified = store.verifyApiToken(apiToken.token);
  assert.equal(verified.name, "Evaluate token");
  assert.deepEqual(verified.scopes, ["evaluate"]);
  assert.deepEqual(verified.decision_keys, []);
  const clientToken = store.createApiToken({ name: "Client token", scopes: ["client"], decision_keys: ["homepage_offer"] }, "tester");
  const verifiedClient = store.verifyApiToken(clientToken.token);
  assert.deepEqual(verifiedClient.scopes, ["client"]);
  assert.deepEqual(verifiedClient.decision_keys, ["homepage_offer"]);
  assert.equal(store.listApiTokens().length, 2);
  store.revokeApiToken(apiToken.id, "tester");
  assert.equal(store.verifyApiToken(apiToken.token), null);

  const settings = store.updateSettings({ environment_label: "staging", audit_retention_days: 30, client_event_retention_days: 45 }, "tester");
  assert.equal(settings.environment_label, "staging");
  const integrationSettings = store.updateSettings({
    meiro_api_token: "mppak_secret",
    meiro_feedback_url: "https://example.test/collect/feedback",
    meiro_skill_url: "https://example.test/skill",
    meiro_cli_url: "https://example.test",
    meiro_cli_token: "mpat_test"
  }, "tester");
  assert.equal(integrationSettings.meiro_feedback_url, "https://example.test/collect/feedback");
  assert.equal(integrationSettings.meiro_skill_url, "https://example.test/skill");
  assert.equal(integrationSettings.meiro_cli_url, "https://example.test");
  assert.equal(integrationSettings.meiro_cli_token, "mpat_test");

  assert.ok(store.listConditionBlocks().some((block) => block.id === "high_intent"));
  const conditionBlock = store.upsertConditionBlock(
    "utility_safe_profile",
    {
      name: "Utility safe profile",
      description: "Reusable eligibility guard",
      conditions: [
        { source: "attribute", key: "late_payments_count_12m", operator: "less_than_or_equal", value: "1" }
      ]
    },
    "tester"
  );
  assert.equal(conditionBlock.id, "utility_safe_profile");
  assert.equal(store.getConditionBlock("utility_safe_profile").conditions[0].key, "late_payments_count_12m");
  store.deleteConditionBlock("utility_safe_profile");
  assert.equal(store.getConditionBlock("utility_safe_profile"), undefined);

  const delivery = store.recordMeiroDelivery({
    target: "feedback",
    endpoint: "https://example.test/collect/feedback",
    ok: true,
    status: 202,
    duration_ms: 42,
    response_preview: "accepted",
    payload: { decision_key: "next_best_offer" }
  });
  assert.equal(delivery.ok, true);
  assert.equal(store.listMeiroDeliveries()[0].target, "feedback");
  store.recordMeiroDelivery({
    target: "collector",
    endpoint: "https://example.test/collect/source",
    ok: false,
    status: 400,
    duration_ms: 8,
    error: "bad request",
    payload: { profile_key: "profile-1" }
  });
  assert.equal(store.listMeiroDeliveries({ target: "feedback" }).length, 1);
  assert.equal(store.listMeiroDeliveries({ ok: "false" })[0].status, 400);
  assert.equal(store.listMeiroDeliveries({ search: "profile-1" })[0].target, "collector");
  const deliverySummary = store.getMeiroDeliverySummary();
  assert.equal(deliverySummary.total, 2);
  assert.equal(deliverySummary.failed, 1);
  assert.equal(deliverySummary.targets.feedback, 1);
  assert.equal(store.getAuditRetentionDays(), 30);
  assert.equal(store.getClientEventRetentionDays(), 45);
  assert.equal(store.health().ok, true);
  assert.equal(store.bootstrapTokensEnabled(), true);
  assert.equal(store.hasActiveAdminToken(), false);
  assert.throws(
    () => store.updateSettings({ bootstrap_tokens_enabled: false }, "tester"),
    /Create an active DB admin token/
  );
  const adminToken = store.createApiToken({ name: "Admin token", scopes: ["admin"] }, "tester");
  assert.match(adminToken.token, /^dee_/);
  assert.equal(store.hasActiveAdminToken(), true);
  const hardenedSettings = store.updateSettings({ bootstrap_tokens_enabled: false }, "tester");
  assert.equal(hardenedSettings.bootstrap_tokens_enabled, false);
  assert.equal(store.bootstrapTokensEnabled(), false);

  const schema = store.replaceSchemaItems("attribute", [{ name: "lead_score", type: "number", dimension: "profile" }], "tester");
  assert.equal(schema[0].name, "lead_score");
  assert.equal(store.listSchemaItems({ kind: "attribute" })[0].type, "number");

  const bundle = store.exportBundle();
  assert.equal(bundle.kind, "meiro-dee-config-bundle");
  assert.equal(bundle.rule_sets.length, 3);
  assert.equal(bundle.rule_sets.find((item) => item.decision_key === "campaign_suppression").type, "inapp_message");
  assert.equal(bundle.lookup_tables.length, 1);
  assert.equal(bundle.messages.length, 1);
  assert.ok(bundle.condition_blocks.some((block) => block.id === "high_intent"));
  assert.equal(bundle.settings.environment_label, "staging");
  assert.equal(bundle.settings.meiro_feedback_url, "https://example.test/collect/feedback");
  assert.equal(bundle.settings.meiro_api_token, undefined);
  assert.equal(bundle.settings.meiro_cli_token, undefined);
  assert.deepEqual(bundle.settings_secrets_redacted, ["meiro_api_token", "meiro_cli_token"]);

  const imported = store.importBundle(
    {
      ...bundle,
      condition_blocks: [
        ...bundle.condition_blocks,
        {
          id: "imported_guard",
          name: "Imported guard",
          conditions: [{ source: "attribute", key: "lead_score", operator: "greater_than", value: "10" }]
        }
      ],
      settings: { ...bundle.settings, environment_label: "production", meiro_cli_token: "must_not_import" }
    },
    "tester"
  );
  assert.equal(imported.condition_blocks, bundle.condition_blocks.length + 1);
  assert.equal(imported.settings, Object.keys(bundle.settings).length);
  assert.equal(store.getConditionBlock("imported_guard").conditions[0].key, "lead_score");
  assert.equal(store.getSettings().environment_label, "production");
  assert.equal(store.getSettings().meiro_cli_token, "mpat_test");

  store.close();
  const reopened = await Store.load();
  assert.equal(reopened.getVersion("campaign_suppression").version, 1);
  assert.equal(reopened.queryAudit({ profile_key: "p-1" })[0].result, "suppressed");
  reopened.close();

  await rm(dataDir, { recursive: true, force: true });
});

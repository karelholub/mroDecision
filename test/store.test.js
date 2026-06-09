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
          goal: {
            event: "signup",
            type: "revenue",
            attribution_window_hours: 1,
            value_field: "event.value"
          },
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
  assert.equal(experimentOps.experiments[0].goal_report.event, "signup");
  assert.equal(experimentOps.experiments[0].goal_report.count, 2);
  assert.equal(experimentOps.experiments[0].goal_report.value_sum, 2);
  assert.equal(experimentOps.experiments[0].goal_report.by_variant.find((variant) => variant.key === "treatment").conversion_rate, 1);
  assert.equal(experimentOps.experiments[0].baseline_variant, "control");
  assert.equal(experimentOps.experiments[0].winner_variant, "treatment");
  const treatmentVariant = experimentOps.experiments[0].variants.find((variant) => variant.key === "treatment");
  assert.equal(treatmentVariant.events.exposure.count, 1);
  assert.equal(treatmentVariant.events.conversion.count, 1);
  assert.equal(treatmentVariant.conversion_rate, 1);
  assert.equal(treatmentVariant.lift_vs_baseline, 1);
  assert.equal(treatmentVariant.significance.status, "needs_sample");
  assert.equal(experimentOps.experiments[0].significant_winner_variant, "");
  assert.equal(experimentOps.experiments[0].winner_recommendation.status, "not_ready");
  assert.equal(experimentOps.experiments[0].winner_recommendation.eligible, false);

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
  assert.equal(significantOps.experiments[0].winner_recommendation.status, "ready");
  assert.equal(significantOps.experiments[0].winner_recommendation.action, "prepare_winner_draft");
  assert.equal(significantOps.experiments[0].winner_recommendation.variant_key, "treatment");
  assert.equal(significantOps.experiments[0].winner_recommendation.checks.every((check) => check.passed), true);
  store.addExperimentAssignment({
    assigned_at: "2026-05-27T02:00:00.000Z",
    decision_key: "hero_experiment",
    profile_key: "bandit-profile-1",
    rule_version: 1,
    variant_key: "treatment",
    strategy: "bandit",
    reason: "exploitation",
    assignment: { bandit: { exploration_rate: 10 } }
  });
  store.addExperimentAssignment({
    assigned_at: "2026-05-27T02:01:00.000Z",
    decision_key: "hero_experiment",
    profile_key: "bandit-profile-2",
    rule_version: 1,
    variant_key: "control",
    strategy: "bandit",
    reason: "exploration"
  });
  const originalDateNowForAssignments = Date.now;
  Date.now = () => Date.parse("2026-05-27T03:00:00.000Z");
  try {
    const assignmentOps = store.getExperimentOperations();
    const history = assignmentOps.experiments[0].assignment_history;
    assert.equal(history.total, 2);
    assert.equal(history.by_strategy[0].key, "bandit");
    assert.equal(history.by_reason.find((item) => item.key === "exploitation").count, 1);
    assert.equal(history.by_variant.find((item) => item.key === "treatment").count, 1);
    assert.equal(history.trend.length, 24);
    const activeBucket = history.trend.find((item) => item.bucket === "2026-05-27T02:00:00.000Z");
    assert.equal(activeBucket.total, 2);
    assert.equal(activeBucket.variants.find((item) => item.key === "treatment").share, 0.5);
    assert.equal(history.recent[0].profile_key, "bandit-profile-2");
  } finally {
    Date.now = originalDateNowForAssignments;
  }

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
  store.createRuleSet(
    {
      name: "Hero Asset Rule",
      decision_key: "hero_asset_rule",
      type: "inapp_message",
      surface: "homepage",
      draft: {
        fallback: {
          result: "eligible",
          outputs: {
            message_content: { image_url: asset.content_url }
          }
        },
        branches: []
      }
    },
    "tester"
  );
  const assetUsageTypes = store.listMessageAssets()[0].used_by.map((item) => item.object_type).sort();
  assert.deepEqual(assetUsageTypes, ["message", "rule"]);
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
  assert.equal(store.cleanupMessageAssets().deleted, 0);
  store.archiveRuleSet("hero_asset_rule", "tester");
  assert.throws(() => store.deleteMessageAsset(asset.id), /still used/);
  assert.equal(store.deleteMessageAsset(asset.id, { force: true }).deleted, true);
  assert.equal(store.listMessageAssets().length, 0);

  store.upsertMessage(
    "campaign_message",
    {
      name: "Campaign Message",
      surface: "homepage",
      default_content: { title: "Campaign", body: "Launch copy" },
      metadata: { campaign: { name: "Spring Launch", folder: "Web" }, template_type: "banner" }
    },
    "tester"
  );
  store.createRuleSet(
    {
      name: "Campaign Experiment",
      decision_key: "campaign_experiment",
      type: "experiment",
      surface: "homepage",
      metadata: {
        campaign: { name: "Spring Launch", folder: "Web" },
        experiment: {
          status: "running",
          variants: [
            { key: "control", weight: 50 },
            { key: "message", weight: 50 }
          ]
        }
      },
      draft: {
        fallback: { result: "eligible", outputs: { message_id: "campaign_message" } },
        branches: []
      }
    },
    "tester"
  );
  store.addClientEvent({
    event_id: "evt-campaign-detail-1",
    event_type: "impression",
    occurred_at: new Date().toISOString(),
    decision_key: "campaign_experiment",
    profile_key: "p-campaign",
    rule_version: 0,
    message_id: "campaign_message",
    surface: "homepage"
  });
  const campaignDetail = store.listCampaignOperations({ window_hours: 300 }).find((item) => item.campaign === "Spring Launch / Web");
  assert.equal(campaignDetail.experiments, 1);
  assert.equal(campaignDetail.messages, 1);
  assert.equal(campaignDetail.assets.experiments[0].id, "campaign_experiment");
  assert.deepEqual(campaignDetail.assets.experiments[0].message_ids, ["campaign_message"]);
  assert.equal(campaignDetail.assets.messages[0].id, "campaign_message");
  assert.equal(campaignDetail.dependencies[0].resolved, true);
  assert.equal(campaignDetail.recent_events[0].message_id, "campaign_message");
  store.setRuleCampaign("campaign_experiment", { campaign: "Spring Refresh", folder: "App" }, "tester");
  store.setMessageCampaign("campaign_message", { campaign: "Spring Refresh", folder: "App" }, "tester");
  const movedCampaignDetail = store.listCampaignOperations({ window_hours: 300 }).find((item) => item.campaign === "Spring Refresh / App");
  assert.equal(movedCampaignDetail.experiments, 1);
  assert.equal(movedCampaignDetail.messages, 1);
  assert.equal(movedCampaignDetail.assets.experiments[0].message_ids[0], "campaign_message");
  assert.equal(store.getRuleSet("campaign_experiment").metadata.campaign.folder, "App");
  assert.equal(store.getMessage("campaign_message").metadata.campaign.name, "Spring Refresh");

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
  const clientToken = store.createApiToken({
    name: "Client token",
    scopes: ["client"],
    decision_keys: ["homepage_offer"],
    metadata: {
      allowed_origins: ["https://www.example.com"],
      environment: "production",
      app_id: "storefront"
    }
  }, "tester");
  const verifiedClient = store.verifyApiToken(clientToken.token);
  assert.deepEqual(verifiedClient.scopes, ["client"]);
  assert.deepEqual(verifiedClient.decision_keys, ["homepage_offer"]);
  assert.deepEqual(verifiedClient.metadata, {
    allowed_origins: ["https://www.example.com"],
    environment: "production",
    app_id: "storefront"
  });
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
  assert.equal(store.listAssistantProviderConfigEvents().length, 0);
  store.updateSettings({
    assistant_llm_enabled: true,
    assistant_llm_provider: "openai",
    assistant_llm_model: "gpt-4.1-mini",
    assistant_llm_api_key: "sk-secret",
    assistant_llm_policy: "conservative",
    assistant_llm_timeout_ms: 12000
  }, "tester");
  const providerEvents = store.listAssistantProviderConfigEvents();
  assert.equal(providerEvents.length, 1);
  assert.equal(providerEvents[0].changed_by, "tester");
  assert.equal(providerEvents[0].changes.assistant_llm_api_key.to, "configured");
  assert.equal(providerEvents[0].changes.assistant_llm_api_key.from, "not_configured");
  assert.equal(providerEvents[0].changes.assistant_llm_policy.to, "conservative");
  assert.equal(providerEvents[0].snapshot.api_key, "configured");
  assert.equal(providerEvents[0].snapshot.policy, "conservative");
  assert.equal(JSON.stringify(providerEvents[0]).includes("sk-secret"), false);

  const planEvent = store.recordAssistantProviderPlanEvent({
    planned_by: "tester",
    duration_ms: 321,
    request: {
      prompt: "Create a secret retention rule",
      type: "decision",
      decision_key: "retention_rule",
      surface: "homepage"
    },
    plan: {
      mode: "draft_only",
      provider: {
        mode: "llm",
        status: "used",
        provider: "openai",
        model: "gpt-4.1-mini",
        policy: "conservative",
        contract_version: "assistant-plan-v2"
      },
      governance: { status: "review" },
      guardrails: { warnings: ["Review assumptions."], errors: [] },
      actions: [{ action: "create_rule_draft", id: "retention_rule", object: {} }]
    }
  });
  assert.equal(planEvent.planned_by, "tester");
  assert.equal(planEvent.prompt_length, "Create a secret retention rule".length);
  assert.notEqual(planEvent.prompt_hash, "");
  assert.equal(JSON.stringify(planEvent).includes("Create a secret retention rule"), false);
  const planEvents = store.listAssistantProviderPlanEvents();
  assert.equal(planEvents.length, 1);
  assert.equal(planEvents[0].decision_key, "retention_rule");
  assert.equal(planEvents[0].prompt_hash, planEvent.prompt_hash);
  assert.equal(JSON.stringify(planEvents[0]).includes("Create a secret retention rule"), false);

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
  assert.equal(store.health().deployment.status, "single_instance");
  assert.equal(store.health().deployment.checks.find((check) => check.key === "multi_instance").ok, false);
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
  assert.equal(bundle.rule_sets.length, 5);
  assert.equal(bundle.rule_sets.find((item) => item.decision_key === "campaign_suppression").type, "inapp_message");
  assert.equal(bundle.rule_sets.find((item) => item.decision_key === "hero_asset_rule").type, "inapp_message");
  assert.equal(bundle.lookup_tables.length, 1);
  assert.equal(bundle.messages.length, 2);
  assert.ok(bundle.condition_blocks.some((block) => block.id === "high_intent"));
  assert.equal(bundle.settings.environment_label, "staging");
  assert.equal(bundle.settings.meiro_feedback_url, "https://example.test/collect/feedback");
  assert.equal(bundle.settings.meiro_api_token, undefined);
  assert.equal(bundle.settings.meiro_cli_token, undefined);
  assert.deepEqual(bundle.settings_secrets_redacted, ["meiro_api_token", "meiro_cli_token", "assistant_llm_api_key"]);

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
  const conflictCondition = { source: "attribute", key: "lead_score", operator: "greater_than_or_equal", value: "70" };
  store.createRuleSet(
    {
      name: "Mobile eligibility",
      decision_key: "mobile_eligibility_conflict",
      type: "inapp_message",
      surface: "mobile_app",
      metadata: { campaign: { name: "Conflict Smoke", folder: "QA" } },
      draft: {
        branches: [{ id: "high_intent", when: conflictCondition, result: "eligible", outputs: {} }],
        fallback: { result: "ineligible", outputs: {} }
      }
    },
    "tester"
  );
  store.createRuleSet(
    {
      name: "Web ineligibility",
      decision_key: "web_ineligibility_conflict",
      type: "inapp_message",
      surface: "web_homepage",
      metadata: { campaign: { name: "Conflict Smoke", folder: "QA" } },
      draft: {
        branches: [{ id: "high_intent", when: { ...conflictCondition }, result: "ineligible", outputs: {} }],
        fallback: { result: "ineligible", outputs: {} }
      }
    },
    "tester"
  );
  const conflictCampaign = store.listCampaignOperations({ window_hours: 300 }).find((item) => item.campaign === "Conflict Smoke / QA");
  assert.equal(conflictCampaign.conflict_count, 1);
  assert.equal(conflictCampaign.conflicts[0].type, "cross_surface_eligibility");
  assert.ok(conflictCampaign.conflicts[0].recommendation.some((item) => item.includes("context/channel")));
  assert.equal(conflictCampaign.conflicts[0].left.condition_signature, conflictCampaign.conflicts[0].right.condition_signature);
  assert.deepEqual(
    new Set([conflictCampaign.conflicts[0].left.outcome, conflictCampaign.conflicts[0].right.outcome]),
    new Set(["eligible", "ineligible"])
  );
  const ruleConflictReport = store.listRuleConflicts({ window_hours: 300 });
  assert.equal(ruleConflictReport.count >= 1, true);
  assert.equal(ruleConflictReport.by_rule.mobile_eligibility_conflict.length, 1);
  assert.equal(ruleConflictReport.by_rule.web_ineligibility_conflict[0].campaign, "Conflict Smoke / QA");

  store.close();
  const reopened = await Store.load();
  assert.equal(reopened.getVersion("campaign_suppression").version, 1);
  assert.equal(reopened.queryAudit({ profile_key: "p-1" })[0].result, "suppressed");
  reopened.close();

  await rm(dataDir, { recursive: true, force: true });
});

test("metrics expose Meiro Pipes in-app precompute profile rollups", async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "dee-precompute-metrics-"));
  process.env.DEE_DATA_DIR = dataDir;
  process.env.DEE_DB_PATH = path.join(dataDir, "test.sqlite");

  const { Store } = await import(`../src/store.js?precompute-metrics-test=${Date.now()}`);
  const store = await Store.load();
  const evaluatedAt = "2026-06-05T10:00:00.000Z";
  store.addAudit({
    evaluated_at: evaluatedAt,
    decision_key: "homepage_alert",
    profile_key: "profile-1",
    rule_version: 1,
    result: "eligible",
    outputs: { message_id: "alert-a" },
    matched_rules: ["branch_1"],
    errors: [],
    inputs: {
      request_source: "meiro_pipes_inapp_precompute",
      surface: "homepage_hero",
      sync_id: "sync-123"
    }
  });
  store.addPrecomputeRun({
    received_at: evaluatedAt,
    surface: "homepage_hero",
    sync_id: "sync-123",
    profile_count: 2,
    candidate_evaluations: 3,
    eligible_count: 1,
    not_selected_count: 1,
    error_count: 0
  });
  store.addPrecomputeRun({
    received_at: evaluatedAt,
    surface: "homepage_footer",
    sync_id: "sync-empty",
    profile_count: 60,
    candidate_evaluations: 0,
    eligible_count: 0,
    not_selected_count: 60,
    error_count: 0,
    metadata: {
      diagnostics: {
        requested_surface: "homepage_footer",
        no_candidate_reason: "no_published_inapp_rules_for_surface"
      }
    }
  });
  store.addAudit({
    evaluated_at: evaluatedAt,
    decision_key: "homepage_banner",
    profile_key: "profile-1",
    rule_version: 1,
    result: "suppressed",
    outputs: {},
    matched_rules: ["branch_1"],
    errors: [],
    inputs: {
      request_source: "meiro_pipes_inapp_precompute",
      surface: "homepage_hero",
      sync_id: "sync-123"
    }
  });
  store.addAudit({
    evaluated_at: evaluatedAt,
    decision_key: "homepage_alert",
    profile_key: "profile-2",
    rule_version: 1,
    result: "suppressed",
    outputs: {},
    matched_rules: ["branch_1"],
    errors: [],
    inputs: {
      request_source: "meiro_pipes_inapp_precompute",
      surface: "homepage_hero",
      sync_id: "sync-123"
    }
  });
  store.addAudit({
    evaluated_at: evaluatedAt,
    decision_key: "homepage_alert",
    profile_key: "profile-3",
    rule_version: 1,
    result: "deferred",
    outputs: {},
    matched_rules: ["fallback"],
    errors: ["Missing attribute: lead_score", "Missing attribute: customer_lifetime_value"],
    inputs: {
      request_source: "meiro_pipes_inapp_precompute",
      surface: "homepage_hero",
      sync_id: "sync-123"
    }
  });
  store.addAudit({
    evaluated_at: evaluatedAt,
    decision_key: "homepage_banner",
    profile_key: "profile-4",
    rule_version: 1,
    result: "deferred",
    outputs: {},
    matched_rules: ["fallback"],
    errors: ["Missing attribute: lead_score"],
    inputs: {
      request_source: "meiro_pipes_inapp_precompute",
      surface: "homepage_hero",
      sync_id: "sync-123"
    }
  });

  const originalDateNow = Date.now;
  Date.now = () => Date.parse("2026-06-05T11:00:00.000Z");
  try {
    const metrics = store.getMetrics({ window_hours: 24 });
    assert.equal(metrics.precompute.run_count, 2);
    assert.equal(metrics.precompute.profile_count, 62);
    assert.equal(metrics.precompute.candidate_evaluations, 5);
    assert.equal(metrics.precompute.eligible_profiles, 1);
    assert.equal(metrics.precompute.suppressed_profiles, 61);
    assert.equal(metrics.precompute.error_profiles, 2);
    assert.equal(metrics.precompute.by_surface[0].key, "homepage_footer");
    assert.equal(metrics.precompute.by_sync_id[0].key, "sync-empty");
    assert.deepEqual(metrics.precompute.error_summary.slice(0, 2), [
      { key: "Missing attribute: lead_score", count: 2, category: "missing_attribute" },
      { key: "Missing attribute: customer_lifetime_value", count: 1, category: "missing_attribute" }
    ]);
    assert.deepEqual(
      metrics.precompute.recent_profiles.find((profile) => profile.profile_key === "profile-3").error_messages,
      ["Missing attribute: lead_score", "Missing attribute: customer_lifetime_value"]
    );
    const emptyRun = metrics.precompute.recent_runs.find((run) => run.sync_id === "sync-empty");
    assert.equal(emptyRun.diagnostics.no_candidate_reason, "no_published_inapp_rules_for_surface");
  } finally {
    Date.now = originalDateNow;
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("store snapshots round-trip operational tables", async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "dee-store-snapshot-"));
  process.env.DEE_DATA_DIR = dataDir;
  process.env.DEE_DB_PATH = path.join(dataDir, "snapshot.sqlite");

  const { Store } = await import(`../src/store.js?snapshot-test=${Date.now()}`);
  const store = await Store.load();
  store.createRuleSet(
    {
      name: "Snapshot Rule",
      decision_key: "snapshot_rule",
      draft: {
        fallback: { result: "eligible", outputs: { offer_id: "snapshot" } },
        branches: []
      }
    },
    "tester"
  );
  store.addClientEvent({
    event_id: "snapshot-event",
    event_type: "impression",
    occurred_at: "2026-06-05T10:00:00.000Z",
    decision_key: "snapshot_rule",
    profile_key: "profile-1",
    rule_version: 1,
    variant_key: "control",
    message_id: "",
    surface: "homepage",
    context: {},
    event: {}
  });

  const snapshot = store.exportSnapshot();
  const restored = await Store.loadInMemory();
  restored.importSnapshot(snapshot);

  assert.equal(restored.getRuleSet("snapshot_rule").name, "Snapshot Rule");
  assert.equal(restored.countClientEvents({ decision_key: "snapshot_rule" }), 1);
  assert.equal(restored.exportSnapshot().tables.rule_sets.length, snapshot.tables.rule_sets.length);

  await rm(dataDir, { recursive: true, force: true });
});

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

  store.updateDraft(
    "campaign_suppression",
    {
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
  const rolledBack = store.rollbackDraftToVersion("campaign_suppression", 1, "tester");
  assert.equal(rolledBack.status, "draft");
  assert.equal(rolledBack.draft.branches[0].id, "risk_segment");

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
  assert.equal(store.queryAudit({ from: "2026-05-28T00:00:00.000Z" }).length, 0);
  const metrics = store.getMetrics();
  assert.equal(metrics.requests.total, 1);
  assert.equal(metrics.rules.total, 2);
  assert.equal(metrics.result_distribution[0].result, "suppressed");
  assert.equal(metrics.rule_usage[0].decision_key, "campaign_suppression");
  const ruleMetrics = store.getRuleMetrics("campaign_suppression");
  assert.equal(ruleMetrics.requests, 1);
  assert.equal(ruleMetrics.matched_branch_distribution[0].branch, "risk_segment");
  assert.equal(ruleMetrics.recent_decisions[0].profile_key, "p-1");

  const table = store.replaceLookupTable("tiers", { key_column: "country", rows: [{ country: "CZ", tier: "A" }] }, "tester");
  assert.equal(table.version, 1);
  assert.equal(store.listLookupTables()[0].rows[0].tier, "A");
  assert.equal(store.listLookupTableVersions("tiers").length, 1);
  assert.equal(store.getLookupTableVersion("tiers", 1).rows[0].tier, "A");
  const updatedTable = store.replaceLookupTable("tiers", { key_column: "country", rows: [{ country: "CZ", tier: "B" }] }, "tester");
  assert.equal(updatedTable.version, 2);
  assert.equal(store.listLookupTableVersions("tiers").length, 2);
  assert.equal(store.getLookupTableVersion("tiers", 1).rows[0].tier, "A");
  assert.equal(store.getLookupTableVersion("tiers", 2).rows[0].tier, "B");

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

  const settings = store.updateSettings({ environment_label: "staging", audit_retention_days: 30 }, "tester");
  assert.equal(settings.environment_label, "staging");
  assert.equal(store.getAuditRetentionDays(), 30);

  const schema = store.replaceSchemaItems("attribute", [{ name: "lead_score", type: "number", dimension: "profile" }], "tester");
  assert.equal(schema[0].name, "lead_score");
  assert.equal(store.listSchemaItems({ kind: "attribute" })[0].type, "number");

  const bundle = store.exportBundle();
  assert.equal(bundle.kind, "meiro-dee-config-bundle");
  assert.equal(bundle.rule_sets.length, 2);
  assert.equal(bundle.rule_sets.find((item) => item.decision_key === "campaign_suppression").type, "inapp_message");
  assert.equal(bundle.lookup_tables.length, 1);

  store.close();
  const reopened = await Store.load();
  assert.equal(reopened.getVersion("campaign_suppression").version, 1);
  assert.equal(reopened.queryAudit({ profile_key: "p-1" })[0].result, "suppressed");
  reopened.close();

  await rm(dataDir, { recursive: true, force: true });
});

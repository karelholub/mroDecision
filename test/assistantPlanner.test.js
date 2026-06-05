import assert from "node:assert/strict";
import test from "node:test";
import { applyAssistantPlan, createAssistantPlan, rollbackAssistantPlan } from "../src/assistantPlanner.js";

test("assistant planner creates guarded experiment draft plan", () => {
  const plan = createAssistantPlan({
    prompt: "Create an experiment for homepage solar banner with 80/20 split for high sustainability users",
    type: "experiment",
    decision_key: "homepage_solar_test"
  });

  assert.equal(plan.mode, "draft_only");
  assert.equal(plan.guardrails.status, "review");
  const ruleAction = plan.actions.find((item) => item.action === "create_rule_draft");
  assert.equal(ruleAction.object.type, "experiment");
  assert.equal(ruleAction.object.metadata.experiment.variants[0].weight, 80);
  assert.equal(ruleAction.object.metadata.experiment.variants[1].weight, 20);
  assert.equal(ruleAction.object.draft.branches[0].when.key, "sustainability_score");
  assert.equal(plan.preview.draft_evaluation.result, "eligible");
  assert.ok(plan.clarifications.some((item) => item.id === "surface_inferred"));
  assert.ok(plan.clarifications.some((item) => item.id === "message_content" && item.priority === "high"));
});

test("assistant planner uses cached schema for condition fields", () => {
  const plan = createAssistantPlan(
    {
      prompt: "Create premium offer for high value customers",
      type: "decision",
      decision_key: "premium_offer"
    },
    {
      schemaItems: [
        { kind: "attribute", name: "monetary_rfm", type: "number" },
        { kind: "attribute", name: "lead_score", type: "number" }
      ]
    }
  );

  const ruleAction = plan.actions.find((item) => item.action === "create_rule_draft");
  assert.equal(ruleAction.object.draft.branches[0].when.key, "monetary_rfm");
  assert.equal(plan.schema.matched_fields[0].key, "monetary_rfm");
  assert.equal(plan.schema.missing_fields.length, 0);
  assert.equal(plan.preview.sample_request.attributes.monetary_rfm, 5000);
});

test("assistant planner flags broad ambiguous audience assumptions", () => {
  const plan = createAssistantPlan({
    prompt: "Create a new offer decision",
    type: "decision",
    decision_key: "ambiguous_offer"
  });

  const audience = plan.clarifications.find((item) => item.id === "audience");
  assert.equal(audience.priority, "high");
  assert.match(audience.assumed, /channel/);
  assert.ok(plan.guardrails.warnings.some((item) => item.includes("assistant assumption")));
});

test("assistant apply only uses draft-safe store methods", () => {
  const calls = [];
  const fakeStore = {
    getMessage() {
      return null;
    },
    getRuleSet() {
      return null;
    },
    upsertMessage(id) {
      calls.push(["upsertMessage", id]);
      return { id };
    },
    createRuleSet(input) {
      calls.push(["createRuleSet", input.decision_key]);
      return { decision_key: input.decision_key };
    },
    updateDraft(key) {
      calls.push(["updateDraft", key]);
      return { decision_key: key };
    }
  };
  const plan = createAssistantPlan({
    prompt: "Create in-app banner message for homepage high lead score users",
    type: "inapp_message",
    decision_key: "homepage_banner_message"
  });

  const result = applyAssistantPlan(plan, fakeStore, "tester");
  assert.deepEqual(calls.map((item) => item[0]), ["upsertMessage", "createRuleSet"]);
  assert.equal(result.applied.length, 2);
  assert.equal(result.applied.at(-1).status, "draft_created");
  assert.equal(result.rollback.length, 2);
});

test("assistant apply respects approved action ids", () => {
  const calls = [];
  const fakeStore = {
    getRuleSet(key) {
      return { decision_key: key, draft: { fallback: { result: "old", outputs: {} }, branches: [] } };
    },
    updateDraft(key) {
      calls.push(["updateDraft", key]);
      return { decision_key: key };
    },
    upsertMessage(id) {
      calls.push(["upsertMessage", id]);
      return { id };
    }
  };
  const plan = {
    mode: "draft_only",
    actions: [
      { action: "upsert_message", id: "message_a", object: { id: "message_a" } },
      { action: "update_rule_draft", id: "rule_a", object: { decision_key: "rule_a", draft: { fallback: { result: "ok", outputs: {} }, branches: [] } } }
    ]
  };

  const result = applyAssistantPlan(plan, fakeStore, "tester", {
    approved_action_ids: ["update_rule_draft:rule_a"]
  });

  assert.deepEqual(calls, [["updateDraft", "rule_a"]]);
  assert.equal(result.applied.length, 1);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.rollback[0].action, "restore_rule_draft");
});

test("assistant rollback restores automated rollback actions", () => {
  const calls = [];
  const fakeStore = {
    upsertMessage(id) {
      calls.push(["upsertMessage", id]);
      return { id };
    },
    updateDraft(key) {
      calls.push(["updateDraft", key]);
      return { decision_key: key };
    },
    archiveRuleSet(key) {
      calls.push(["archiveRuleSet", key]);
      return { decision_key: key };
    }
  };
  const result = rollbackAssistantPlan([
    { action: "restore_message", id: "message_a", object: { id: "message_a" } },
    { action: "restore_rule_draft", id: "rule_a", object: { decision_key: "rule_a" } },
    { action: "archive_rule_draft", id: "rule_b" },
    { action: "manual_review", id: "message_b", reason: "Created message cannot be deleted." }
  ], fakeStore, "tester");

  assert.deepEqual(calls.map((item) => item[0]), ["upsertMessage", "updateDraft", "archiveRuleSet"]);
  assert.equal(result.restored.length, 3);
  assert.equal(result.skipped.length, 1);
});

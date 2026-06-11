import assert from "node:assert/strict";
import test from "node:test";
import { evaluateDecisionStack, normalizeDecisionStack } from "../src/decisionStacks.js";

const versions = {
  eligibility_check: {
    version: 1,
    definition: {
      fallback: { result: "ineligible", outputs: { reason: "low_score" } },
      branches: [
        {
          id: "high_score",
          when: { source: "attribute", key: "lead_score", operator: "greater_than_or_equal", value: 70 },
          result: "eligible",
          outputs: { audience: "high_intent" }
        }
      ]
    }
  },
  offer_selection: {
    version: 3,
    definition: {
      fallback: { result: "deferred", outputs: {} },
      branches: [
        {
          id: "premium_offer",
          when: { source: "attribute", key: "customer_lifetime_value", operator: "greater_than_or_equal", value: 10000 },
          result: "eligible",
          outputs: { offer_id: "premium_upgrade", priority: 90 }
        }
      ]
    }
  }
};

test("decision stacks evaluate coordinated rule sets in sequence", async () => {
  const stack = normalizeDecisionStack(
    {
      id: "journey_orchestration",
      name: "Journey orchestration",
      status: "active",
      steps: [
        { id: "eligibility", decision_key: "eligibility_check", output_namespace: "eligibility" },
        { id: "offer", decision_key: "offer_selection", mode: "on_result", required_result: "eligible", output_namespace: "offer" }
      ]
    },
    "tester"
  );
  const result = await evaluateDecisionStack({
    stack,
    lookupTables: [],
    store: { getVersion: async (key) => versions[key] },
    now: new Date("2026-06-11T10:00:00.000Z"),
    request: {
      profile_key: "profile-1",
      attributes: {
        lead_score: [{ value: 92 }],
        customer_lifetime_value: [{ value: 18000 }]
      }
    }
  });

  assert.equal(result.result, "eligible");
  assert.equal(result.outputs.audience, "high_intent");
  assert.equal(result.outputs.offer_id, "premium_upgrade");
  assert.deepEqual(result.outputs.by_step.offer, { offer_id: "premium_upgrade", priority: 90 });
  assert.deepEqual(result.steps.map((step) => step.status), ["evaluated", "evaluated"]);
  assert.deepEqual(result.matched_rules, ["eligibility_check:high_score", "offer_selection:premium_offer"]);
});

test("decision stacks skip dependent steps and stop on terminal results", async () => {
  const stack = normalizeDecisionStack(
    {
      id: "journey_orchestration",
      steps: [
        { id: "eligibility", decision_key: "eligibility_check", stop_on_results: ["ineligible"] },
        { id: "offer", decision_key: "offer_selection", mode: "on_result", required_result: "eligible" }
      ]
    },
    "tester"
  );
  const result = await evaluateDecisionStack({
    stack,
    lookupTables: [],
    store: { getVersion: async (key) => versions[key] },
    now: new Date("2026-06-11T10:00:00.000Z"),
    request: {
      profile_key: "profile-2",
      attributes: {
        lead_score: [{ value: 20 }],
        customer_lifetime_value: [{ value: 18000 }]
      }
    }
  });

  assert.equal(result.result, "ineligible");
  assert.equal(result.stopped, true);
  assert.deepEqual(result.steps.map((step) => step.status), ["evaluated", "skipped"]);
  assert.equal(result.steps[1].reason, "previous_step_stopped");
  assert.deepEqual(result.outputs.by_step.eligibility_check, { reason: "low_score" });
});

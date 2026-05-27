import assert from "node:assert/strict";
import test from "node:test";
import { evaluateDecision } from "../src/evaluator.js";

test("evaluates basic branch rule sets", () => {
  const result = evaluateDecision({
    now: new Date("2026-01-15T14:23:01.000Z"),
    lookupTables: [],
    request: {
      decision_key: "loan_eligibility",
      profile_key: "abc-123",
      identifiers: [{ typeId: "email", value: "user@example.com" }],
      attributes: {
        lifetime_revenue: [{ value: 8400 }]
      },
      segments: { vip_customers: true },
      context: {}
    },
    version: {
      version: 7,
      definition: {
        fallback: { result: "ineligible", outputs: { reason: "criteria_not_met" } },
        branches: [
          {
            id: "vip_check",
            when: {
              all: [
                { source: "segment", key: "vip_customers", operator: "equals", value: true },
                { source: "attribute", key: "lifetime_revenue", operator: "greater_than_or_equal", value: 5000 }
              ]
            },
            result: "eligible",
            outputs: { offer_tier: "premium", max_loan_amount: 25000 }
          }
        ]
      }
    }
  });

  assert.equal(result.result, "eligible");
  assert.deepEqual(result.outputs, { offer_tier: "premium", max_loan_amount: 25000 });
  assert.deepEqual(result.matched_rules, ["vip_check"]);
});

test("evaluates graph score and output nodes", () => {
  const result = evaluateDecision({
    now: new Date("2026-01-15T14:23:01.000Z"),
    lookupTables: [],
    request: {
      decision_key: "credit_tier",
      profile_key: "abc-123",
      identifiers: [{ typeId: "email", value: "user@example.com" }],
      attributes: {
        account_age_days: [{ value: 400 }]
      },
      segments: {},
      context: {}
    },
    version: {
      version: 1,
      definition: {
        graph: {
          entry: "input",
          nodes: [
            { id: "input", type: "input", next: "score_age" },
            {
              id: "score_age",
              type: "score",
              label: "credit_score",
              rules: [{ when: 'attribute("account_age_days") >= 365', points: 20 }],
              next: "condition"
            },
            {
              id: "condition",
              type: "condition",
              expression: 'score("credit_score") >= 20',
              true: "eligible",
              false: "fallback"
            },
            { id: "eligible", type: "output", result: "eligible", outputs: { tier: "A", score: '=score("credit_score")' } },
            { id: "fallback", type: "output", result: "deferred", outputs: {} }
          ]
        }
      }
    }
  });

  assert.equal(result.result, "eligible");
  assert.deepEqual(result.outputs, { tier: "A", score: 20 });
});

test("evaluates date and list operators with deterministic clock", () => {
  const result = evaluateDecision({
    now: new Date("2026-01-15T00:00:00.000Z"),
    lookupTables: [],
    request: {
      decision_key: "recent_buyer",
      profile_key: "abc-123",
      identifiers: [{ typeId: "email", value: "user@example.com" }],
      attributes: {
        last_purchase_date: [{ value: "2026-01-10T00:00:00.000Z" }],
        country: [{ value: "CZ" }]
      },
      segments: {},
      context: {}
    },
    version: {
      version: 2,
      definition: {
        fallback: { result: "deferred", outputs: {} },
        branches: [
          {
            id: "recent_supported_country",
            when: {
              all: [
                { source: "attribute", key: "last_purchase_date", operator: "within_last_days", value: 10 },
                { source: "attribute", key: "country", operator: "in", value: ["CZ", "SK"] }
              ]
            },
            result: "eligible",
            outputs: {}
          }
        ]
      }
    }
  });

  assert.equal(result.result, "eligible");
});

test("evaluates contains operators for promotion history arrays", () => {
  const result = evaluateDecision({
    now: new Date("2026-05-27T00:00:00.000Z"),
    lookupTables: [],
    request: {
      decision_key: "next_best_offer",
      profile_key: "abc-123",
      identifiers: [{ typeId: "email", value: "user@example.com" }],
      attributes: {
        interacted_promotions: [{ value: ["retention_discount"] }],
        sustainability_score: [{ value: 91 }]
      },
      segments: {},
      context: {}
    },
    version: {
      version: 1,
      definition: {
        fallback: { result: "deferred", outputs: {} },
        branches: [
          {
            id: "green_offer_not_seen",
            when: {
              all: [
                { source: "attribute", key: "sustainability_score", operator: "greater_than_or_equal", value: 80 },
                { source: "attribute", key: "interacted_promotions", operator: "not_contains", value: "solar_green_energy" }
              ]
            },
            result: "eligible",
            outputs: { offer_id: "solar_green_energy" }
          }
        ]
      }
    }
  });

  assert.equal(result.result, "eligible");
  assert.equal(result.outputs.offer_id, "solar_green_energy");
});

import assert from "node:assert/strict";
import test from "node:test";
import { validateBundle, validateEvaluateRequest, validateRuleDefinition } from "../src/validation.js";

test("validates evaluate request shape", () => {
  assert.doesNotThrow(() =>
    validateEvaluateRequest({
      decision_key: "loan_eligibility",
      profile_key: "abc-123",
      identifiers: [{ typeId: "email", value: "user@example.com" }],
      attributes: {},
      segments: {},
      context: {}
    })
  );
  assert.throws(() => validateEvaluateRequest({ decision_key: "x", profile_key: "p", identifiers: [] }), /identifiers/);
});

test("validates basic rule definition conditions", () => {
  assert.doesNotThrow(() =>
    validateRuleDefinition({
      fallback: { result: "ineligible", outputs: {} },
      branches: [
        {
          id: "country_check",
          result: "eligible",
          when: {
            source: "attribute",
            key: "country",
            operator: "in",
            value: ["CZ", "SK"]
          },
          outputs: {}
        }
      ]
    })
  );
  assert.throws(
    () =>
      validateRuleDefinition({
        branches: [{ id: "bad", result: "eligible", when: { source: "cookie", key: "x", operator: "equals", value: true } }]
      }),
    /unsupported source/
  );
});

test("blocks undeclared input references when an input schema is provided", () => {
  assert.throws(
    () =>
      validateRuleDefinition(
        {
          branches: [
            {
              id: "typo",
              result: "eligible",
              when: { source: "attribute", key: "leadscore", operator: "greater_than", value: 10 }
            }
          ]
        },
        { attributes: { lead_score: "number" } }
      ),
    /undeclared inputs/
  );
});

test("validates import bundles", () => {
  assert.doesNotThrow(() =>
    validateBundle({
      kind: "meiro-dee-config-bundle",
      rule_sets: [
        {
          name: "Suppression",
          decision_key: "campaign_suppression",
          draft: { fallback: { result: "eligible" }, branches: [] },
          versions: []
        }
      ],
      lookup_tables: []
    })
  );
  assert.throws(() => validateBundle({ kind: "other", rule_sets: [] }), /Unsupported bundle/);
});

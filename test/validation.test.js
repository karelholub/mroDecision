import assert from "node:assert/strict";
import test from "node:test";
import {
  validateBundle,
  validateClientEventRequest,
  validateEvaluateRequest,
  validateRuleDefinition,
  validateRuleSetPayload,
  validateClientSurfaceRequest
} from "../src/validation.js";

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

test("validates experiment variant allocation", () => {
  assert.doesNotThrow(() =>
    validateRuleSetPayload({
      name: "Hero Experiment",
      decision_key: "hero_experiment",
      type: "experiment",
      metadata: {
        experiment: {
          unit: "profile",
          variants: [
            { key: "control", weight: 50, outputs: { banner: "A" } },
            { key: "treatment", weight: 50, outputs: { banner: "B" } }
          ]
        }
      },
      draft: { fallback: { result: "eligible", outputs: {} }, branches: [] }
    })
  );
  assert.throws(
    () =>
      validateRuleSetPayload({
        name: "Bad Experiment",
        decision_key: "bad_experiment",
        type: "experiment",
        metadata: { experiment: { variants: [{ key: "a", weight: 80 }] } },
        draft: { fallback: { result: "eligible", outputs: {} }, branches: [] }
      }),
    /weights must sum to 100/
  );
});

test("validates client event requests", () => {
  assert.doesNotThrow(() =>
    validateClientEventRequest({
      decision_key: "hero",
      profile_key: "p1",
      rule_version: 1,
      variant_key: "control",
      occurred_at: "2026-05-27T00:00:00.000Z",
      context: { channel: "web" }
    })
  );
  assert.throws(
    () => validateClientEventRequest({ decision_key: "hero", profile_key: "p1", occurred_at: "not-a-date" }),
    /occurred_at/
  );
});

test("validates client surface requests", () => {
  assert.doesNotThrow(() =>
    validateClientSurfaceRequest({
      surface: "homepage_hero",
      profile_key: "p1",
      attributes: {},
      segments: {},
      context: {},
      limit: 5
    })
  );
  assert.throws(() => validateClientSurfaceRequest({ profile_key: "p1" }), /surface/);
  assert.throws(() => validateClientSurfaceRequest({ surface: "homepage", profile_key: "p1", limit: 1.5 }), /limit/);
});

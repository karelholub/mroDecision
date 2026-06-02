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

test("blocks undeclared value-source references", () => {
  assert.throws(
    () =>
      validateRuleDefinition(
        {
          branches: [
            {
              id: "limit_check",
              result: "eligible",
              when: {
                source: "attribute",
                key: "requested_amount",
                operator: "less_than_or_equal",
                value_source: { source: "attribute", key: "approvedlimit" }
              }
            }
          ]
        },
        { attributes: { requested_amount: "number", approved_limit: "number" } }
      ),
    /undeclared inputs/
  );
});

test("validates graph routes and reachability", () => {
  assert.doesNotThrow(() =>
    validateRuleDefinition({
      graph: {
        entry: "input",
        nodes: [
          { id: "input", type: "input", next: "condition" },
          { id: "condition", type: "condition", expression: "attribute(\"lead_score\") >= 50", true: "eligible", false: "fallback" },
          { id: "eligible", type: "output", result: "eligible" },
          { id: "fallback", type: "output", result: "deferred" }
        ]
      }
    })
  );
  assert.throws(
    () =>
      validateRuleDefinition({
        graph: {
          entry: "input",
          nodes: [
            { id: "input", type: "input", next: "missing" },
            { id: "fallback", type: "output", result: "deferred" }
          ]
        }
      }),
    /missing node/
  );
  assert.throws(
    () =>
      validateRuleDefinition({
        graph: {
          entry: "input",
          nodes: [
            { id: "input", type: "input", next: "fallback" },
            { id: "fallback", type: "output", result: "deferred" },
            { id: "unused", type: "output", result: "eligible" }
          ]
        }
      }),
    /unreachable/
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
          status: "running",
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
  assert.throws(
    () =>
      validateRuleSetPayload({
        name: "Bad Experiment Status",
        decision_key: "bad_experiment_status",
        type: "experiment",
        metadata: { experiment: { status: "launched", variants: [{ key: "a", weight: 100 }] } },
        draft: { fallback: { result: "eligible", outputs: {} }, branches: [] }
      }),
    /status/
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

import assert from "node:assert/strict";
import test from "node:test";
import {
  validateBundle,
  validateClientEventRequest,
  validateDecisionStackEvaluateRequest,
  validateDecisionStackPayload,
  validateEvaluateRequest,
  validateRuleDefinition,
  validateRuleSetPayload,
  validateClientSurfaceBatchRequest,
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
      lookup_tables: [],
      condition_blocks: [
        {
          id: "high_intent",
          name: "High intent",
          conditions: [{ source: "attribute", key: "lead_score", operator: "greater_than", value: "70" }]
        }
      ],
      settings: { environment_label: "staging" }
    })
  );
  assert.throws(() => validateBundle({ kind: "other", rule_sets: [] }), /Unsupported bundle/);
  assert.throws(
    () =>
      validateBundle({
        kind: "meiro-dee-config-bundle",
        rule_sets: [],
        condition_blocks: [{ id: "broken", name: "Broken", conditions: [] }]
      }),
    /conditions must be a non-empty array/
  );
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
          mode: "bandit",
          unit: "profile",
          bandit: {
            exploration_rate: 15,
            min_exposures_per_variant: 50,
            window_days: 14
          },
          goal: {
            event: "purchase",
            type: "revenue",
            attribution_window_hours: 168,
            value_field: "event.revenue",
            secondary_events: ["add_to_cart"]
          },
          display: { mode: "once_per_session", reset_on_version_change: true },
          consent: { required: true, category: "marketing", missing_result: "suppressed" },
          schedule: { starts_at: "2026-06-01T00:00:00.000Z", ends_at: "2026-06-30T23:59:59.000Z" },
          targeting: {
            devices: ["desktop", "mobile"],
            url_rules: [{ mode: "include", operator: "contains", value: "/offers" }],
            sdk_conditions: ["cart_ready"]
          },
          trigger: { type: "data_layer_event", event: "cart_view", filters: [{ key: "cart.total", operator: "greater_than", value: 0 }] },
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
  assert.throws(
    () =>
      validateRuleSetPayload({
        name: "Bad Experiment Mode",
        decision_key: "bad_experiment_mode",
        type: "experiment",
        metadata: { experiment: { mode: "roulette", variants: [{ key: "a", weight: 100 }] } },
        draft: { fallback: { result: "eligible", outputs: {} }, branches: [] }
      }),
    /mode/
  );
  assert.throws(
    () =>
      validateRuleSetPayload({
        name: "Bad Bandit",
        decision_key: "bad_bandit",
        type: "experiment",
        metadata: { experiment: { mode: "bandit", bandit: { exploration_rate: 120 }, variants: [{ key: "a", weight: 100 }] } },
        draft: { fallback: { result: "eligible", outputs: {} }, branches: [] }
      }),
    /exploration_rate/
  );
  assert.throws(
    () =>
      validateRuleSetPayload({
        name: "Bad Display",
        decision_key: "bad_display",
        type: "experiment",
        metadata: { experiment: { display: { mode: "hourly" }, variants: [{ key: "a", weight: 100 }] } },
        draft: { fallback: { result: "eligible", outputs: {} }, branches: [] }
      }),
    /display.mode/
  );
  assert.throws(
    () =>
      validateRuleSetPayload({
        name: "Bad Url Rule",
        decision_key: "bad_url_rule",
        type: "experiment",
        metadata: { experiment: { targeting: { url_rules: [{ mode: "include", operator: "regex", value: "[" }] }, variants: [{ key: "a", weight: 100 }] } },
        draft: { fallback: { result: "eligible", outputs: {} }, branches: [] }
      }),
    /regex/
  );
  assert.throws(
    () =>
      validateRuleSetPayload({
        name: "Bad Trigger",
        decision_key: "bad_trigger",
        type: "experiment",
        metadata: { experiment: { trigger: { type: "hover" }, variants: [{ key: "a", weight: 100 }] } },
        draft: { fallback: { result: "eligible", outputs: {} }, branches: [] }
      }),
    /trigger.type/
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
      context: { channel: "web" },
      event: { name: "signup", value: 1 }
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

test("validates client surface batch requests", () => {
  assert.doesNotThrow(() =>
    validateClientSurfaceBatchRequest({
      surface: "homepage_hero",
      context: { channel: "web" },
      limit: 10,
      profiles: [
        {
          profile_key: "p1",
          identifiers: [{ typeId: "email", value: "user@example.com" }],
          attributes: {},
          segments: {},
          context: {}
        }
      ]
    })
  );
  assert.throws(() => validateClientSurfaceBatchRequest({ surface: "homepage_hero", profiles: [] }), /at least one profile/);
  assert.throws(() => validateClientSurfaceBatchRequest({ surface: "homepage_hero", profiles: [{}] }), /profile_key/);
  assert.throws(
    () => validateClientSurfaceBatchRequest({ surface: "homepage_hero", profiles: [{ profile_key: "p1", identifiers: {} }] }),
    /identifiers/
  );
  assert.throws(
    () => validateClientSurfaceBatchRequest({ surface: "homepage_hero", profiles: [{ profile_key: "p1", limit: 1.5 }] }),
    /profile limit/
  );
});

test("validates decision stack payloads", () => {
  assert.doesNotThrow(() =>
    validateDecisionStackPayload({
      id: "web_journey",
      name: "Web journey",
      status: "active",
      steps: [
        { id: "eligibility", decision_key: "eligibility_check" },
        { id: "offer", decision_key: "offer_selection", mode: "on_result", required_result: "eligible" }
      ]
    })
  );
  assert.throws(
    () => validateDecisionStackPayload({ id: "bad-key", steps: [{ id: "step_1", decision_key: "offer_selection" }] }),
    /Decision stack id/
  );
  assert.throws(
    () => validateDecisionStackPayload({ id: "stack", steps: [{ id: "one", decision_key: "OfferSelection" }] }),
    /decision_key/
  );
  assert.doesNotThrow(() => validateDecisionStackEvaluateRequest({ profile_key: "profile-1", attributes: {} }));
});

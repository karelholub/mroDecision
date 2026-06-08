import assert from "node:assert/strict";
import test from "node:test";
import { buildDecisionFeedbackPayload, meiroFeedbackEndpoint } from "../src/meiroFeedback.js";

test("Meiro feedback endpoint prefers explicit setting and falls back to base URL", () => {
  assert.equal(
    meiroFeedbackEndpoint({
      meiro_url: "https://sse-demo.eu1.pipes.meiro.io",
      meiro_feedback_url: "https://example.test/collect/feedback"
    }),
    "https://example.test/collect/feedback"
  );
  assert.equal(
    meiroFeedbackEndpoint({ meiro_url: "https://sse-demo.eu1.pipes.meiro.io" }),
    "https://sse-demo.eu1.pipes.meiro.io/collect/decision-engine-feedback"
  );
  assert.equal(meiroFeedbackEndpoint({}), "");
});

test("decision feedback payload includes decision, request, and surface metadata", () => {
  const payload = buildDecisionFeedbackPayload(
    {
      decision_key: "hero_offer",
      profile_key: "profile-1",
      result: "eligible",
      outputs: { offer_id: "dubai" },
      rule_version: 3,
      ttl_seconds: 120,
      cache: { hit: false },
      profile_cache: { status: "miss", hit: false },
      experiment: { key: "homepage_hero", variant_key: "destination_focus" },
      matched_rules: ["branch_1"],
      errors: [],
      evaluated_at: "2026-06-08T10:00:00.000Z"
    },
    {
      identifiers: [{ typeId: "email", value: "karel.holub@meiro.io" }],
      context: { request_source: "client", surface: "homepage_hero", sync_id: "sync-1" }
    },
    {
      endpoint: "https://example.test/collect/decision-engine-feedback",
      request_id: "req-1",
      source: "client_surface",
      surface_result: { surface: "homepage_hero", selected_decision_key: "hero_offer", candidate_count: 2 }
    }
  );

  assert.equal(payload.decision_key, "hero_offer");
  assert.equal(payload.result, "eligible");
  assert.deepEqual(payload.outputs, { offer_id: "dubai" });
  assert.equal(payload.identifiers[0].value, "karel.holub@meiro.io");
  assert.equal(payload.delivery.source, "client_surface");
  assert.equal(payload.delivery.endpoint, "https://example.test/collect/decision-engine-feedback");
  assert.equal(payload.delivery.request_id, "req-1");
  assert.equal(payload.delivery.surface, "homepage_hero");
  assert.equal(payload.delivery.sync_id, "sync-1");
  assert.equal(payload.surface_result.candidate_count, 2);
});

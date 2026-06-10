import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClientEventCollectorPayload,
  buildDecisionCollectorEventPayload,
  buildDecisionFeedbackPayload,
  meiroCollectorEndpoint,
  meiroFeedbackEndpoint
} from "../src/meiroFeedback.js";

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
  assert.equal(
    meiroCollectorEndpoint({ meiro_url: "https://sse-demo.eu1.pipes.meiro.io", meiro_source_slug: "decision-engine-feedback" }),
    "https://sse-demo.eu1.pipes.meiro.io/collect/decision-engine-feedback"
  );
  assert.equal(meiroCollectorEndpoint({ meiro_url: "https://sse-demo.eu1.pipes.meiro.io" }), "");
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

test("decision collector payload wraps decisions as Meiro event envelopes", () => {
  const payload = buildDecisionCollectorEventPayload(
    {
      decision_key: "next_best_offer",
      profile_key: "profile-1",
      result: "eligible",
      outputs: { offer_id: "solar" },
      rule_version: 1,
      matched_rules: ["solar_branch"],
      errors: [],
      evaluated_at: "2026-06-08T10:00:00.000Z"
    },
    {
      identifiers: [{ typeId: "email", value: "karel.holub@meiro.io" }],
      context: { request_source: "client_evaluate", surface: "homepage" }
    },
    {
      endpoint: "https://example.test/collect/decision-engine-feedback",
      source: "client_evaluate"
    }
  );

  assert.equal(payload.event_type, "decision_result");
  assert.equal(payload.event_time, "2026-06-08T10:00:00.000Z");
  assert.equal(payload.identifiers[0].value, "karel.holub@meiro.io");
  assert.equal(payload.event_payload.decision_key, "next_best_offer");
  assert.equal(payload.event_payload.outputs.offer_id, "solar");
  assert.equal(payload.event_payload.context.surface, "homepage");
  assert.equal(payload.event_payload.delivery.endpoint, "https://example.test/collect/decision-engine-feedback");
});

test("client survey response payload is profile-friendly for Meiro collector", () => {
  const payload = buildClientEventCollectorPayload(
    {
      event_id: "evt-survey-1",
      event_type: "conversion",
      occurred_at: "2026-06-10T10:00:00.000Z",
      decision_key: "homepage_survey",
      profile_key: "profile-1",
      rule_version: 4,
      variant_key: "treatment",
      message_id: "survey_message",
      surface: "homepage_hero",
      context: { page_url: "https://example.test", request_source: "dee_web_sdk" },
      event: {
        type: "survey_response",
        name: "survey_usefulness",
        survey_question: "q1",
        survey_question_label: "How useful is this offer?",
        survey_value: "high",
        label: "High"
      }
    },
    {
      endpoint: "https://example.test/collect/decision-engine-feedback",
      source: "client_event",
      request_id: "req-2",
      identifiers: [{ typeId: "email", value: "karel.holub@meiro.io" }]
    }
  );

  assert.equal(payload.event_type, "inapp_survey_response");
  assert.equal(payload.event_time, "2026-06-10T10:00:00.000Z");
  assert.equal(payload.identifiers[0].value, "karel.holub@meiro.io");
  assert.equal(payload.event_payload.message_id, "survey_message");
  assert.equal(payload.event_payload.survey.question, "q1");
  assert.equal(payload.event_payload.survey.question_label, "How useful is this offer?");
  assert.equal(payload.event_payload.survey.value, "high");
  assert.equal(payload.event_payload.delivery.source, "client_event");
  assert.equal(payload.event_payload.delivery.endpoint, "https://example.test/collect/decision-engine-feedback");
  assert.equal(payload.event_payload.delivery.request_id, "req-2");
});

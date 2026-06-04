import assert from "node:assert/strict";
import test from "node:test";
import { profileCacheWithDiagnostics } from "../src/profileDiagnostics.js";

test("profile diagnostics describe local payload and missing attributes", () => {
  const result = profileCacheWithDiagnostics(
    { status: "local_payload", hit: false },
    {
      attributes: { lead_score: [80] },
      segments: { vip: true },
      context: { channel: "web" }
    },
    {
      attributes: { lead_score: [80] },
      segments: { vip: true },
      context: { channel: "web" }
    },
    [{ kind: "attribute", name: "lead_score" }],
    ["Missing attribute: outstanding_balance_tier", "Missing attribute: outstanding_balance_tier"]
  );

  assert.equal(result.diagnostics.source, "Local payload used; Profile API lookup skipped");
  assert.equal(result.diagnostics.enriched, false);
  assert.deepEqual(result.diagnostics.fields_sent_locally.attributes, ["lead_score"]);
  assert.deepEqual(result.diagnostics.fields_added.attributes, []);
  assert.deepEqual(result.diagnostics.missing_required_attributes, ["outstanding_balance_tier"]);
});

test("profile diagnostics expose fetched fields, cache freshness, and schema drift", () => {
  const result = profileCacheWithDiagnostics(
    {
      status: "miss",
      hit: false,
      ttl_seconds: 300,
      expires_at: "2026-06-04T12:00:00.000Z",
      identifier_type: "email"
    },
    {
      attributes: { lead_score: [80] },
      segments: {},
      context: { channel: "web" }
    },
    {
      attributes: { lead_score: [80], churn_risk_score: [0.8], unknown_profile_field: ["x"] },
      segments: { high_value: true },
      context: { channel: "web", country: "CZ" }
    },
    [
      { kind: "attribute", name: "lead_score" },
      { kind: "attribute", name: "customer_lifetime_value" },
      { kind: "segment", name: "premium_segment" }
    ],
    []
  );

  assert.equal(result.diagnostics.source, "Fetched from Meiro Profile API");
  assert.equal(result.diagnostics.enriched, true);
  assert.equal(result.diagnostics.identifier_type, "email");
  assert.deepEqual(result.diagnostics.fields_added.attributes, ["churn_risk_score", "unknown_profile_field"]);
  assert.deepEqual(result.diagnostics.fields_added.segments, ["high_value"]);
  assert.deepEqual(result.diagnostics.fields_added.context, ["country"]);
  assert.deepEqual(result.diagnostics.schema_drift.profile_attributes_not_in_schema, ["churn_risk_score", "unknown_profile_field"]);
  assert.deepEqual(result.diagnostics.schema_drift.schema_attributes_missing_from_profile, ["customer_lifetime_value"]);
  assert.deepEqual(result.diagnostics.schema_drift.profile_segments_not_in_schema, ["high_value"]);
  assert.deepEqual(result.diagnostics.schema_drift.schema_segments_missing_from_profile, ["premium_segment"]);
  assert.deepEqual(result.diagnostics.cache_freshness, {
    ttl_seconds: 300,
    expires_at: "2026-06-04T12:00:00.000Z",
    hit: false
  });
});

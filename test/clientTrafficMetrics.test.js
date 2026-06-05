import assert from "node:assert/strict";
import test from "node:test";
import { createClientTrafficMetrics } from "../src/clientTrafficMetrics.js";

test("client traffic metrics groups browser API calls", () => {
  const metrics = createClientTrafficMetrics({ maxRecent: 2, maxSamples: 3 });
  metrics.record({
    action: "evaluate",
    token: "Website client",
    origin: "https://www.example.com",
    environment: "production",
    app_id: "storefront",
    status: 200,
    duration_ms: 20
  });
  metrics.record({
    action: "evaluate",
    token: "Website client",
    origin: "https://www.example.com",
    environment: "production",
    app_id: "storefront",
    status: 403,
    duration_ms: 40
  });
  metrics.record({
    action: "impression",
    token: "Website client",
    origin: "https://shop.example.com",
    environment: "staging",
    app_id: "storefront",
    status: 202,
    duration_ms: 60
  });

  const summary = metrics.metrics();
  assert.equal(summary.total, 3);
  assert.equal(summary.errors, 1);
  assert.equal(summary.error_rate, 1 / 3);
  assert.equal(summary.p95_ms, 60);
  assert.equal(summary.recent.length, 2);
  assert.equal(summary.by_action.find((item) => item.key === "evaluate").requests, 2);
  assert.equal(summary.by_token[0].key, "Website client");
  assert.equal(summary.by_origin.find((item) => item.key === "https://www.example.com").errors, 1);
  assert.equal(summary.by_environment.find((item) => item.key === "production").requests, 2);
  assert.equal(summary.by_app[0].key, "storefront");
});

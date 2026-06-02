import assert from "node:assert/strict";
import test from "node:test";
import { createRequestMetrics } from "../src/requestMetrics.js";

test("request metrics records latency, statuses, and normalized slow routes", () => {
  const metrics = createRequestMetrics({ maxSamples: 3 });
  metrics.record({ method: "GET", path: "/v1/rule-sets/next_best_offer", status: 200, duration_ms: 10 });
  metrics.record({ method: "GET", path: "/v1/rule-sets/loan_eligibility", status: 500, duration_ms: 30 });
  metrics.record({ method: "POST", path: "/v1/client/evaluate", status: 200, duration_ms: 20 });
  metrics.record({ method: "GET", path: "/v1/metrics/rule/next_best_offer", status: 200, duration_ms: 40 });

  const summary = metrics.metrics();
  assert.equal(summary.total, 4);
  assert.equal(summary.errors, 1);
  assert.equal(summary.error_rate, 0.25);
  assert.equal(summary.sample_size, 3);
  assert.equal(summary.p50_ms, 30);
  assert.equal(summary.p95_ms, 40);
  assert.equal(summary.statuses["200"], 3);
  assert.equal(summary.statuses["500"], 1);

  const ruleRoute = summary.slow_routes.find((route) => route.route === "GET /v1/rule-sets/:key");
  assert.equal(ruleRoute.requests, 2);
  assert.equal(ruleRoute.errors, 1);
  assert.equal(ruleRoute.avg_ms, 20);
});

test("request metrics can be cleared", () => {
  const metrics = createRequestMetrics();
  metrics.record({ method: "GET", path: "/v1/ready", status: 200, duration_ms: 5 });
  assert.equal(metrics.metrics().total, 1);

  metrics.clear();
  const summary = metrics.metrics();
  assert.equal(summary.total, 0);
  assert.equal(summary.sample_size, 0);
  assert.deepEqual(summary.statuses, {});
});

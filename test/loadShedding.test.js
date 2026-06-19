import assert from "node:assert/strict";
import test from "node:test";
import { createLoadShedding, pressureDecision } from "../src/loadShedding.js";

test("pressure decision stays inactive when metrics are healthy", () => {
  const decision = pressureDecision({
    runtime: { sample_size: 200, p95_ms: 120 },
    clientTraffic: { total: 200, error_rate: 0.01 },
    profileCache: { errors: 0 },
    database: { ok: true }
  }, {
    mode: "monitor",
    minSamples: 100,
    runtimeP95Ms: 500,
    clientErrorRate: 0.1,
    profileErrorThreshold: 10
  });

  assert.equal(decision.active, false);
  assert.equal(decision.reason, "healthy");
});

test("load shedding monitors pressure without rejecting in monitor mode", () => {
  const shedding = createLoadShedding({
    mode: "monitor",
    minSamples: 2,
    runtimeP95Ms: 100,
    now: () => Date.parse("2026-06-13T10:00:00.000Z")
  });

  const decision = shedding.check({
    runtime: { sample_size: 3, p95_ms: 250 },
    database: { ok: true }
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.active, true);
  assert.equal(decision.enforced, false);
  assert.equal(shedding.metrics().decisions.monitored, 1);
});

test("load shedding rejects under pressure in shed mode", () => {
  const shedding = createLoadShedding({
    mode: "shed",
    minSamples: 2,
    clientErrorRate: 0.1,
    retryAfterSeconds: 15
  });

  const decision = shedding.check({
    clientTraffic: { total: 10, error_rate: 0.2 },
    database: { ok: true }
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "client_error_rate");
  assert.equal(decision.retry_after_seconds, 15);
  assert.equal(shedding.metrics().decisions.shed, 1);
});

test("database failure activates pressure signal", () => {
  const decision = pressureDecision({ database: { ok: false, error: "connection refused" } }, { mode: "shed" });

  assert.equal(decision.active, true);
  assert.equal(decision.reason, "database_not_ready");
  assert.match(decision.reason_detail, /connection refused/);
});

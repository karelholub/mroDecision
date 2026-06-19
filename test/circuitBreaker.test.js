import assert from "node:assert/strict";
import test from "node:test";
import { createCircuitBreaker } from "../src/circuitBreaker.js";

test("circuit breaker opens after threshold and recovers after cooldown", () => {
  let current = Date.parse("2026-06-11T10:00:00.000Z");
  const breaker = createCircuitBreaker("profile", {
    failureThreshold: 2,
    cooldownMs: 1000,
    now: () => current
  });

  assert.equal(breaker.canRequest().allowed, true);
  breaker.recordFailure(new Error("timeout"));
  assert.equal(breaker.metrics().status, "closed");
  breaker.recordFailure(new Error("timeout"));
  assert.equal(breaker.metrics().status, "open");
  assert.equal(breaker.canRequest().allowed, false);

  current += 1001;
  assert.equal(breaker.canRequest().allowed, true);
  assert.equal(breaker.metrics().status, "half_open");
  breaker.recordSuccess();
  assert.equal(breaker.metrics().status, "closed");
  assert.equal(breaker.metrics().failures, 0);
});

test("circuit breaker reopens on failed half-open probe", () => {
  let current = Date.parse("2026-06-11T10:00:00.000Z");
  const breaker = createCircuitBreaker("collector", {
    failureThreshold: 1,
    cooldownMs: 500,
    now: () => current
  });

  breaker.recordFailure("bad gateway");
  current += 600;
  assert.equal(breaker.canRequest().status, "half_open");
  breaker.recordFailure("still bad");
  assert.equal(breaker.metrics().status, "open");
  assert.match(breaker.metrics().last_error, /still bad/);
});

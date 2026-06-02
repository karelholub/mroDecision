import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimiter } from "../src/rateLimiter.js";

test("rate limiter allows configured quota and blocks overflow", () => {
  let current = Date.parse("2026-06-02T00:00:00.000Z");
  const limiter = createRateLimiter({ windowMs: 1000, max: 2, now: () => current });

  assert.equal(limiter.check("client-a").allowed, true);
  const second = limiter.check("client-a");
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);

  const third = limiter.check("client-a");
  assert.equal(third.allowed, false);
  assert.equal(third.retry_after_seconds, 1);
  assert.equal(limiter.metrics().blocked, 1);

  current += 1000;
  assert.equal(limiter.check("client-a").allowed, true);
});

test("rate limiter isolates keys and can be disabled", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => 0 });

  assert.equal(limiter.check("client-a").allowed, true);
  assert.equal(limiter.check("client-b").allowed, true);
  assert.equal(limiter.check("client-a").allowed, false);

  const disabled = createRateLimiter({ max: 0 });
  assert.equal(disabled.check("client-a").allowed, true);
  assert.equal(disabled.check("client-a").disabled, true);
  assert.equal(disabled.metrics().enabled, false);
});

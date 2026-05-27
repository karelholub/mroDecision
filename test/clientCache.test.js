import assert from "node:assert/strict";
import test from "node:test";
import { createClientResultCache, keyFor } from "../src/clientCache.js";

test("client result cache respects TTL and profile scope", () => {
  let current = 1000;
  const cache = createClientResultCache({ now: () => current });
  const ruleSet = { decision_key: "hero", cache_policy: { client_ttl: 10, scope: "profile" } };
  const version = { version: 2 };
  const request = { profile_key: "p1", context: {}, attributes: {} };

  const miss = cache.get(request, ruleSet, version);
  assert.equal(miss.hit, false);
  cache.set(miss.cache_key, { result: "eligible" }, ruleSet);
  assert.equal(cache.get(request, ruleSet, version).hit, true);

  current += 10001;
  assert.equal(cache.get(request, ruleSet, version).hit, false);
  assert.equal(cache.metrics().evictions, 1);
});

test("client result cache keys honor scope", () => {
  const version = { version: 1 };
  const requestA = { profile_key: "p1", context: { session_id: "s1" }, attributes: { score: [{ value: 1 }] } };
  const requestB = { profile_key: "p1", context: { session_id: "s2" }, attributes: { score: [{ value: 2 }] } };

  assert.equal(
    keyFor(requestA, { decision_key: "hero", cache_policy: { scope: "profile" } }, version),
    keyFor(requestB, { decision_key: "hero", cache_policy: { scope: "profile" } }, version)
  );
  assert.notEqual(
    keyFor(requestA, { decision_key: "hero", cache_policy: { scope: "session" } }, version),
    keyFor(requestB, { decision_key: "hero", cache_policy: { scope: "session" } }, version)
  );
  assert.notEqual(
    keyFor(requestA, { decision_key: "hero", cache_policy: { scope: "request" } }, version),
    keyFor(requestB, { decision_key: "hero", cache_policy: { scope: "request" } }, version)
  );
});

test("client result cache skips disabled TTL without lowering hit rate", () => {
  const cache = createClientResultCache();
  const result = cache.get(
    { profile_key: "p1", context: {} },
    { decision_key: "hero", cache_policy: { client_ttl: 0, scope: "profile" } },
    { version: 1 }
  );
  assert.equal(result.skipped, true);
  assert.equal(cache.metrics().skipped, 1);
  assert.equal(cache.metrics().hit_rate, 0);
});

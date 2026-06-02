import test from "node:test";
import assert from "node:assert/strict";
import { createProfileCache, profileCacheKey } from "../src/profileCache.js";

test("profile cache respects TTL and exposes metrics", () => {
  let current = 1000;
  const cache = createProfileCache({ now: () => current });
  const key = profileCacheKey({
    profile_key: "profile-1",
    identifiers: [{ typeId: "email", value: "person@example.test" }]
  });

  const miss = cache.get(key, 10);
  assert.equal(miss.hit, false);
  cache.set(key, { attributes: { lead_score: [{ value: 90 }] } }, 10);
  assert.equal(cache.get(key, 10).hit, true);

  current += 10_500;
  assert.equal(cache.get(key, 10).hit, false);
  assert.equal(cache.metrics().evictions, 1);
});

test("profile cache skips disabled TTL without lowering hit rate", () => {
  const cache = createProfileCache();
  const result = cache.get("abc", 0);

  assert.equal(result.skipped, true);
  assert.equal(cache.metrics().hit_rate, 0);
  assert.equal(cache.metrics().skipped, 1);
});

test("profile cache key normalizes identifier formats", () => {
  assert.equal(
    profileCacheKey({ profile_key: "p1", identifiers: [{ typeId: "email", value: "a@example.test" }] }),
    profileCacheKey({ profile_key: "p1", identifiers: [{ identifierTypeId: "email", identifierValue: "a@example.test" }] })
  );
});

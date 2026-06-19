import assert from "node:assert/strict";
import test from "node:test";
import {
  createPostgresClientResultCache,
  createPostgresProfileCache,
  createPostgresRateLimiter
} from "../src/runtimeState.js";

test("postgres client result cache stores and reads TTL entries", async () => {
  let current = Date.parse("2026-06-13T10:00:00.000Z");
  const client = createFakeRuntimeClient(() => current);
  const cache = createPostgresClientResultCache(client, { now: () => current });
  const ruleSet = { decision_key: "hero", cache_policy: { client_ttl: 10, scope: "profile" } };
  const version = { version: 1 };
  const request = { profile_key: "p1", context: {}, attributes: {} };

  const miss = await cache.get(request, ruleSet, version);
  assert.equal(miss.hit, false);
  await cache.set(miss.cache_key, { result: "eligible" }, ruleSet);
  const hit = await cache.get(request, ruleSet, version);
  assert.equal(hit.hit, true);
  assert.equal(hit.value.result, "eligible");

  current += 10001;
  const expired = await cache.get(request, ruleSet, version);
  assert.equal(expired.hit, false);
  assert.equal((await cache.metrics()).evictions, 1);
});

test("postgres profile cache tracks not found and errors", async () => {
  const now = () => Date.parse("2026-06-13T10:00:00.000Z");
  const client = createFakeRuntimeClient(now);
  const cache = createPostgresProfileCache(client, { now });

  await cache.set("profile-a", { attributes: { lead_score: [{ value: 90 }] } }, 30);
  assert.equal((await cache.get("profile-a", 30)).hit, true);
  cache.recordNotFound();
  cache.recordError();

  const metrics = await cache.metrics();
  assert.equal(metrics.entries, 1);
  assert.equal(metrics.not_found, 1);
  assert.equal(metrics.errors, 1);
});

test("postgres rate limiter shares buckets through query client", async () => {
  const client = createFakeRuntimeClient(() => Date.parse("2026-06-13T10:00:00.000Z"));
  const limiter = createPostgresRateLimiter(client, { windowMs: 1000, max: 2 });

  assert.equal((await limiter.check("client-a")).allowed, true);
  assert.equal((await limiter.check("client-a")).allowed, true);
  const blocked = await limiter.check("client-a");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal((await limiter.metrics()).blocked, 1);
});

function createFakeRuntimeClient(now) {
  const runtimeState = new Map();
  const rateLimits = new Map();
  return {
    async query(sql, params = []) {
      if (sql.includes("SELECT to_regclass")) {
        return { rows: [{ runtime_state: "runtime_state", runtime_rate_limits: "runtime_rate_limits" }] };
      }
      if (sql.startsWith("SELECT value_json, expires_at FROM runtime_state")) {
        const key = `${params[0]}:${params[1]}`;
        const entry = runtimeState.get(key);
        return { rows: entry ? [entry] : [] };
      }
      if (sql.startsWith("DELETE FROM runtime_state WHERE namespace = $1 AND cache_key = $2")) {
        runtimeState.delete(`${params[0]}:${params[1]}`);
        return { rows: [] };
      }
      if (sql.startsWith("DELETE FROM runtime_state WHERE namespace = $1")) {
        for (const key of [...runtimeState.keys()]) {
          if (key.startsWith(`${params[0]}:`)) runtimeState.delete(key);
        }
        return { rows: [] };
      }
      if (sql.startsWith("INSERT INTO runtime_state")) {
        runtimeState.set(`${params[0]}:${params[1]}`, {
          value_json: JSON.parse(params[2]),
          expires_at: new Date(params[3])
        });
        return { rows: [] };
      }
      if (sql.startsWith("SELECT COUNT(*)::int AS count FROM runtime_state")) {
        const namespace = params[0];
        const count = [...runtimeState.entries()].filter(([key, entry]) => key.startsWith(`${namespace}:`) && entry.expires_at > new Date(now())).length;
        return { rows: [{ count }] };
      }
      if (sql.startsWith("DELETE FROM runtime_rate_limits")) {
        for (const [key, bucket] of [...rateLimits.entries()]) {
          if (bucket.reset_at <= new Date(now() - 300000)) rateLimits.delete(key);
        }
        return { rows: [] };
      }
      if (sql.startsWith("INSERT INTO runtime_rate_limits")) {
        const [bucketKey, increment, windowMs] = params;
        const current = new Date(now());
        let bucket = rateLimits.get(bucketKey);
        if (!bucket || bucket.reset_at <= current) {
          bucket = { count: 0, reset_at: new Date(now() + Number(windowMs)) };
        }
        bucket.count += Number(increment);
        rateLimits.set(bucketKey, bucket);
        return { rows: [bucket] };
      }
      if (sql.startsWith("SELECT COUNT(*)::int AS count FROM runtime_rate_limits")) {
        const count = [...rateLimits.values()].filter((bucket) => bucket.reset_at > new Date(now())).length;
        return { rows: [{ count }] };
      }
      throw new Error(`Unhandled fake query: ${sql}`);
    }
  };
}

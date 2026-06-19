import { createClientResultCache, keyFor } from "./clientCache.js";
import { createProfileCache } from "./profileCache.js";
import { createRateLimiter } from "./rateLimiter.js";

export async function createRuntimeState({ config, store }) {
  const adapter = String(config.runtimeStateAdapter || "memory").trim().toLowerCase();
  if (adapter === "memory") {
    return {
      adapter,
      clientResultCache: createClientResultCache(),
      profileCache: createProfileCache(),
      rateLimiter: createRateLimiter({
        windowMs: config.clientRateLimitWindowMs,
        max: config.clientRateLimitMax
      }),
      metrics: () => ({ adapter })
    };
  }

  if (adapter !== "postgres") {
    throw new Error(`Unsupported DEE_RUNTIME_STATE_ADAPTER: ${config.runtimeStateAdapter}. Supported adapters: memory, postgres.`);
  }
  if (!store?.client || typeof store.client.query !== "function") {
    throw new Error("DEE_RUNTIME_STATE_ADAPTER=postgres requires a store adapter with a Postgres query client, such as DEE_STORE_ADAPTER=postgres_native.");
  }
  await verifyPostgresRuntimeState(store.client);
  return {
    adapter,
    clientResultCache: createPostgresClientResultCache(store.client),
    profileCache: createPostgresProfileCache(store.client),
    rateLimiter: createPostgresRateLimiter(store.client, {
      windowMs: config.clientRateLimitWindowMs,
      max: config.clientRateLimitMax
    }),
    metrics: () => ({ adapter })
  };
}

export function createPostgresClientResultCache(client, { now = () => Date.now() } = {}) {
  const stats = createStats(["hits", "misses", "skipped", "writes", "evictions", "errors"]);
  return {
    async get(request, ruleSet, version) {
      const ttl = clientTtlSeconds(ruleSet);
      if (ttl <= 0) {
        stats.skipped += 1;
        return { hit: false, skipped: true, ttl_seconds: 0, cache_key: null, expires_at: null };
      }
      const cacheKey = keyFor(request, ruleSet, version);
      return getRuntimeState(client, "client_result", cacheKey, ttl, stats, now);
    },
    async set(cacheKey, value, ruleSet) {
      const ttl = clientTtlSeconds(ruleSet);
      if (!cacheKey || ttl <= 0) return null;
      return setRuntimeState(client, "client_result", cacheKey, value, ttl, stats, now);
    },
    async metrics() {
      return cacheMetrics(client, "client_result", stats);
    },
    async clear() {
      await client.query("DELETE FROM runtime_state WHERE namespace = $1", ["client_result"]);
      resetStats(stats);
    }
  };
}

export function createPostgresProfileCache(client, { now = () => Date.now() } = {}) {
  const stats = createStats(["hits", "misses", "skipped", "writes", "evictions", "not_found", "errors"]);
  return {
    async get(cacheKey, ttlSeconds) {
      const ttl = normalizedTtl(ttlSeconds);
      if (!cacheKey || ttl <= 0) {
        stats.skipped += 1;
        return { hit: false, skipped: true, cache_key: cacheKey || null, ttl_seconds: 0, expires_at: null };
      }
      return getRuntimeState(client, "profile", cacheKey, ttl, stats, now);
    },
    async set(cacheKey, value, ttlSeconds) {
      const ttl = normalizedTtl(ttlSeconds);
      if (!cacheKey || ttl <= 0) return null;
      return setRuntimeState(client, "profile", cacheKey, value, ttl, stats, now);
    },
    recordError() {
      stats.errors += 1;
    },
    recordNotFound() {
      stats.not_found += 1;
    },
    async metrics() {
      return cacheMetrics(client, "profile", stats);
    },
    async clear() {
      await client.query("DELETE FROM runtime_state WHERE namespace = $1", ["profile"]);
      resetStats(stats);
    }
  };
}

export function createPostgresRateLimiter(client, options = {}) {
  const windowMs = Math.max(1, Number(options.windowMs || 60000));
  const max = Math.max(0, Number(options.max || 0));
  const stats = createStats(["allowed", "blocked", "errors"]);
  return {
    async check(key, cost = 1) {
      if (!max) {
        stats.allowed += 1;
        return { allowed: true, disabled: true, limit: 0, remaining: null, reset_at: null };
      }
      const normalizedKey = key || "anonymous";
      const increment = Math.max(1, Number(cost || 1));
      try {
        await client.query("DELETE FROM runtime_rate_limits WHERE reset_at <= now() - interval '5 minutes'");
        const result = await client.query(
          `INSERT INTO runtime_rate_limits (bucket_key, count, reset_at, updated_at)
           VALUES ($1, $2, now() + ($3::text || ' milliseconds')::interval, now())
           ON CONFLICT (bucket_key) DO UPDATE SET
             count = CASE
               WHEN runtime_rate_limits.reset_at <= now() THEN $2
               ELSE runtime_rate_limits.count + $2
             END,
             reset_at = CASE
               WHEN runtime_rate_limits.reset_at <= now() THEN now() + ($3::text || ' milliseconds')::interval
               ELSE runtime_rate_limits.reset_at
             END,
             updated_at = now()
           RETURNING count, reset_at`,
          [normalizedKey, increment, windowMs]
        );
        const row = result.rows[0] || {};
        const count = Number(row.count || 0);
        const resetAt = dateFromPg(row.reset_at);
        const allowed = count <= max;
        const output = {
          allowed,
          limit: max,
          remaining: Math.max(0, max - count),
          reset_at: resetAt.toISOString(),
          retry_after_seconds: Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
        };
        if (allowed) stats.allowed += 1;
        else stats.blocked += 1;
        return output;
      } catch (error) {
        stats.errors += 1;
        throw error;
      }
    },
    async metrics() {
      const result = await client.query("SELECT COUNT(*)::int AS count FROM runtime_rate_limits WHERE reset_at > now()");
      const total = stats.allowed + stats.blocked;
      return {
        enabled: max > 0,
        adapter: "postgres",
        window_ms: windowMs,
        limit: max,
        active_buckets: Number(result.rows[0]?.count || 0),
        allowed: stats.allowed,
        blocked: stats.blocked,
        errors: stats.errors,
        block_rate: total ? stats.blocked / total : 0
      };
    },
    async clear() {
      await client.query("DELETE FROM runtime_rate_limits");
      resetStats(stats);
    }
  };
}

async function verifyPostgresRuntimeState(client) {
  const result = await client.query(
    "SELECT to_regclass('public.runtime_state') AS runtime_state, to_regclass('public.runtime_rate_limits') AS runtime_rate_limits"
  );
  if (!result.rows[0]?.runtime_state || !result.rows[0]?.runtime_rate_limits) {
    throw new Error("Postgres runtime state tables are missing. Apply the native Postgres schema migration before setting DEE_RUNTIME_STATE_ADAPTER=postgres.");
  }
}

async function getRuntimeState(client, namespace, cacheKey, ttl, stats, now) {
  try {
    const result = await client.query(
      "SELECT value_json, expires_at FROM runtime_state WHERE namespace = $1 AND cache_key = $2",
      [namespace, cacheKey]
    );
    const row = result.rows[0];
    if (!row) {
      stats.misses += 1;
      return { hit: false, cache_key: cacheKey, ttl_seconds: ttl, expires_at: null };
    }
    const expiresAt = dateFromPg(row.expires_at);
    if (expiresAt.getTime() <= now()) {
      await client.query("DELETE FROM runtime_state WHERE namespace = $1 AND cache_key = $2", [namespace, cacheKey]);
      stats.evictions += 1;
      stats.misses += 1;
      return { hit: false, cache_key: cacheKey, ttl_seconds: ttl, expires_at: null };
    }
    stats.hits += 1;
    return {
      hit: true,
      cache_key: cacheKey,
      ttl_seconds: Math.max(0, Math.ceil((expiresAt.getTime() - now()) / 1000)),
      expires_at: expiresAt.toISOString(),
      value: clone(row.value_json)
    };
  } catch (error) {
    stats.errors += 1;
    throw error;
  }
}

async function setRuntimeState(client, namespace, cacheKey, value, ttl, stats, now) {
  const expiresAt = new Date(now() + ttl * 1000);
  try {
    await client.query(
      `INSERT INTO runtime_state (namespace, cache_key, value_json, expires_at, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, now())
       ON CONFLICT (namespace, cache_key) DO UPDATE SET
         value_json = EXCLUDED.value_json,
         expires_at = EXCLUDED.expires_at,
         updated_at = now()`,
      [namespace, cacheKey, JSON.stringify(value), expiresAt.toISOString()]
    );
    stats.writes += 1;
    return expiresAt.toISOString();
  } catch (error) {
    stats.errors += 1;
    throw error;
  }
}

async function cacheMetrics(client, namespace, stats) {
  const result = await client.query(
    "SELECT COUNT(*)::int AS count FROM runtime_state WHERE namespace = $1 AND expires_at > now()",
    [namespace]
  );
  const total = stats.hits + stats.misses;
  return {
    adapter: "postgres",
    entries: Number(result.rows[0]?.count || 0),
    hits: stats.hits,
    misses: stats.misses,
    skipped: stats.skipped,
    writes: stats.writes,
    evictions: stats.evictions,
    not_found: stats.not_found || 0,
    errors: stats.errors || 0,
    hit_rate: total ? stats.hits / total : 0
  };
}

function clientTtlSeconds(ruleSet) {
  return normalizedTtl(ruleSet?.cache_policy?.client_ttl);
}

function normalizedTtl(value) {
  const ttl = Number(value || 0);
  return Number.isFinite(ttl) && ttl > 0 ? Math.floor(ttl) : 0;
}

function dateFromPg(value) {
  return value instanceof Date ? value : new Date(value);
}

function createStats(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function resetStats(stats) {
  for (const key of Object.keys(stats)) stats[key] = 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

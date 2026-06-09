import { createHash } from "node:crypto";

export function createProfileCache({ now = () => Date.now() } = {}) {
  const entries = new Map();
  const stats = {
    hits: 0,
    misses: 0,
    skipped: 0,
    writes: 0,
    evictions: 0,
    not_found: 0,
    errors: 0
  };

  function get(cacheKey, ttlSeconds) {
    const ttl = normalizedTtl(ttlSeconds);
    if (!cacheKey || ttl <= 0) {
      stats.skipped += 1;
      return { hit: false, skipped: true, cache_key: cacheKey || null, ttl_seconds: 0, expires_at: null };
    }
    sweep();
    const entry = entries.get(cacheKey);
    if (!entry || entry.expires_at_ms <= now()) {
      if (entry) {
        entries.delete(cacheKey);
        stats.evictions += 1;
      }
      stats.misses += 1;
      return { hit: false, cache_key: cacheKey, ttl_seconds: ttl, expires_at: null };
    }
    stats.hits += 1;
    return {
      hit: true,
      cache_key: cacheKey,
      ttl_seconds: Math.max(0, Math.ceil((entry.expires_at_ms - now()) / 1000)),
      expires_at: new Date(entry.expires_at_ms).toISOString(),
      value: clone(entry.value)
    };
  }

  function set(cacheKey, value, ttlSeconds) {
    const ttl = normalizedTtl(ttlSeconds);
    if (!cacheKey || ttl <= 0) return null;
    const expiresAtMs = now() + ttl * 1000;
    entries.set(cacheKey, {
      value: clone(value),
      expires_at_ms: expiresAtMs
    });
    stats.writes += 1;
    return new Date(expiresAtMs).toISOString();
  }

  function recordError() {
    stats.errors += 1;
  }

  function recordNotFound() {
    stats.not_found += 1;
  }

  function metrics() {
    sweep();
    const total = stats.hits + stats.misses;
    return {
      entries: entries.size,
      hits: stats.hits,
      misses: stats.misses,
      skipped: stats.skipped,
      writes: stats.writes,
      evictions: stats.evictions,
      not_found: stats.not_found,
      errors: stats.errors,
      hit_rate: total ? stats.hits / total : 0
    };
  }

  function clear() {
    entries.clear();
    stats.hits = 0;
    stats.misses = 0;
    stats.skipped = 0;
    stats.writes = 0;
    stats.evictions = 0;
    stats.not_found = 0;
    stats.errors = 0;
  }

  function sweep() {
    const current = now();
    for (const [key, entry] of entries) {
      if (entry.expires_at_ms <= current) {
        entries.delete(key);
        stats.evictions += 1;
      }
    }
  }

  return { get, set, recordError, recordNotFound, metrics, clear };
}

export function profileCacheKey(input = {}) {
  const identifiers = Array.isArray(input.identifiers)
    ? input.identifiers
        .map((identifier) => ({
          type: String(identifier.typeId || identifier.type || identifier.identifierTypeId || identifier.id || "").trim(),
          value: String(identifier.value || identifier.identifierValue || "").trim()
        }))
        .filter((identifier) => identifier.type && identifier.value)
    : [];
  return digest({
    profile_key: input.profile_key || "",
    identifiers
  });
}

function normalizedTtl(ttlSeconds) {
  const ttl = Number(ttlSeconds || 0);
  return Number.isFinite(ttl) && ttl > 0 ? Math.floor(ttl) : 0;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

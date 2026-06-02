import { createHash } from "node:crypto";

export function createClientResultCache({ now = () => Date.now() } = {}) {
  const entries = new Map();
  const stats = {
    hits: 0,
    misses: 0,
    skipped: 0,
    writes: 0,
    evictions: 0
  };

  function get(request, ruleSet, version) {
    const ttl = ttlSeconds(ruleSet);
    if (ttl <= 0) {
      stats.skipped += 1;
      return { hit: false, skipped: true, ttl_seconds: 0, cache_key: null, expires_at: null };
    }
    sweep();
    const cacheKey = keyFor(request, ruleSet, version);
    const entry = entries.get(cacheKey);
    if (!entry || entry.expires_at_ms <= now()) {
      if (entry) {
        entries.delete(cacheKey);
        stats.evictions += 1;
      }
      stats.misses += 1;
      return { hit: false, ttl_seconds: ttl, cache_key: cacheKey, expires_at: null };
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

  function set(cacheKey, value, ruleSet) {
    if (!cacheKey) return null;
    const ttl = ttlSeconds(ruleSet);
    if (ttl <= 0) return null;
    const expiresAtMs = now() + ttl * 1000;
    entries.set(cacheKey, {
      value: clone(value),
      expires_at_ms: expiresAtMs
    });
    stats.writes += 1;
    return new Date(expiresAtMs).toISOString();
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

  return { get, set, metrics, clear };
}

export function keyFor(request, ruleSet, version) {
  const scope = ruleSet.cache_policy?.scope || "profile";
  const base = {
    decision_key: ruleSet.decision_key,
    rule_version: version.version,
    scope,
    experiment_override: experimentOverrideFor(request, ruleSet.decision_key)
  };
  if (scope === "global") return digest(base);
  if (scope === "session") {
    return digest({
      ...base,
      session_id: request.context?.session_id || request.context?.sessionId || request.profile_key
    });
  }
  if (scope === "request") {
    return digest({ ...base, request });
  }
  return digest({ ...base, profile_key: request.profile_key });
}

function experimentOverrideFor(request, decisionKey) {
  const context = request.context || {};
  const override = {
    force_variant: context.force_variant || context.forced_variants?.[decisionKey] || null,
    force_holdout: context.force_holdout ?? context.holdout ?? context.forced_holdouts?.[decisionKey] ?? null
  };
  return override.force_variant || override.force_holdout != null ? override : null;
}

function ttlSeconds(ruleSet) {
  const ttl = Number(ruleSet.cache_policy?.client_ttl || 0);
  return Number.isFinite(ttl) && ttl > 0 ? Math.floor(ttl) : 0;
}

function digest(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

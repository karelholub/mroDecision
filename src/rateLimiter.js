export function createRateLimiter(options = {}) {
  const windowMs = Math.max(1, Number(options.windowMs || 60000));
  const max = Math.max(0, Number(options.max || 0));
  const now = options.now || (() => Date.now());
  const buckets = new Map();
  const stats = {
    allowed: 0,
    blocked: 0
  };

  function check(key, cost = 1) {
    if (!max) {
      stats.allowed += 1;
      return { allowed: true, disabled: true, limit: 0, remaining: null, reset_at: null };
    }

    const current = now();
    prune(current);
    const normalizedKey = key || "anonymous";
    let bucket = buckets.get(normalizedKey);
    if (!bucket || bucket.resetAt <= current) {
      bucket = { count: 0, resetAt: current + windowMs };
      buckets.set(normalizedKey, bucket);
    }

    const nextCount = bucket.count + Math.max(1, Number(cost || 1));
    const remaining = Math.max(0, max - nextCount);
    const result = {
      allowed: nextCount <= max,
      limit: max,
      remaining,
      reset_at: new Date(bucket.resetAt).toISOString(),
      retry_after_seconds: Math.max(1, Math.ceil((bucket.resetAt - current) / 1000))
    };

    if (!result.allowed) {
      stats.blocked += 1;
      return result;
    }

    bucket.count = nextCount;
    stats.allowed += 1;
    return result;
  }

  function metrics() {
    const total = stats.allowed + stats.blocked;
    return {
      enabled: max > 0,
      window_ms: windowMs,
      limit: max,
      active_buckets: buckets.size,
      allowed: stats.allowed,
      blocked: stats.blocked,
      block_rate: total ? stats.blocked / total : 0
    };
  }

  function clear() {
    buckets.clear();
    stats.allowed = 0;
    stats.blocked = 0;
  }

  function prune(current = now()) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= current) buckets.delete(key);
    }
  }

  return { check, metrics, clear };
}

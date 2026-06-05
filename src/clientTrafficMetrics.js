export function createClientTrafficMetrics(options = {}) {
  const maxRecent = Math.max(1, Number(options.maxRecent || 50));
  const maxSamples = Math.max(1, Number(options.maxSamples || 1000));
  const recent = [];
  const latencySamples = [];
  const byAction = new Map();
  const byToken = new Map();
  const byOrigin = new Map();
  const byEnvironment = new Map();
  const byApp = new Map();
  const statuses = new Map();
  let total = 0;
  let errors = 0;
  let startedAt = new Date().toISOString();

  function record(input = {}) {
    const status = Number(input.status || 0);
    const durationMs = Math.max(0, Number(input.duration_ms || 0));
    const failed = status >= 400 || status === 0;
    const item = {
      at: input.at || new Date().toISOString(),
      action: clean(input.action) || "unknown",
      route: clean(input.route) || "",
      token: clean(input.token) || "unknown",
      token_id: clean(input.token_id) || "",
      origin: clean(input.origin) || "server",
      environment: clean(input.environment) || "unspecified",
      app_id: clean(input.app_id) || "unspecified",
      status,
      duration_ms: Math.round(durationMs)
    };

    total += 1;
    if (failed) errors += 1;
    statuses.set(status, (statuses.get(status) || 0) + 1);
    latencySamples.push(durationMs);
    if (latencySamples.length > maxSamples) latencySamples.shift();
    recent.unshift(item);
    if (recent.length > maxRecent) recent.pop();

    increment(byAction, item.action, item);
    increment(byToken, item.token, item);
    increment(byOrigin, item.origin, item);
    increment(byEnvironment, item.environment, item);
    increment(byApp, item.app_id, item);
  }

  function metrics() {
    const sorted = [...latencySamples].sort((left, right) => left - right);
    return {
      started_at: startedAt,
      total,
      errors,
      error_rate: total ? errors / total : 0,
      p95_ms: percentile(sorted, 95),
      statuses: Object.fromEntries([...statuses.entries()].sort(([left], [right]) => Number(left) - Number(right))),
      by_action: top(byAction),
      by_token: top(byToken),
      by_origin: top(byOrigin),
      by_environment: top(byEnvironment),
      by_app: top(byApp),
      recent: [...recent]
    };
  }

  function clear() {
    recent.length = 0;
    latencySamples.length = 0;
    byAction.clear();
    byToken.clear();
    byOrigin.clear();
    byEnvironment.clear();
    byApp.clear();
    statuses.clear();
    total = 0;
    errors = 0;
    startedAt = new Date().toISOString();
  }

  return { record, metrics, clear };
}

function increment(map, key, item) {
  const current = map.get(key) || {
    key,
    requests: 0,
    errors: 0,
    total_ms: 0,
    last_seen_at: ""
  };
  current.requests += 1;
  if (item.status >= 400 || item.status === 0) current.errors += 1;
  current.total_ms += item.duration_ms;
  current.last_seen_at = item.at;
  map.set(key, current);
}

function top(map) {
  return [...map.values()]
    .map((item) => ({
      key: item.key,
      requests: item.requests,
      errors: item.errors,
      error_rate: item.requests ? item.errors / item.requests : 0,
      avg_ms: item.requests ? Math.round(item.total_ms / item.requests) : 0,
      last_seen_at: item.last_seen_at
    }))
    .sort((left, right) => right.requests - left.requests || left.key.localeCompare(right.key))
    .slice(0, 10);
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]);
}

function clean(value) {
  return String(value || "").trim();
}

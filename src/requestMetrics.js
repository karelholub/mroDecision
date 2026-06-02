export function createRequestMetrics(options = {}) {
  const maxSamples = Math.max(1, Number(options.maxSamples || 1000));
  const samples = [];
  const routes = new Map();
  const statuses = new Map();
  let total = 0;
  let errors = 0;
  let startedAt = new Date().toISOString();

  function record(input = {}) {
    const durationMs = Math.max(0, Number(input.duration_ms || 0));
    const status = Number(input.status || 0);
    const route = normalizeRoute(input.method || "GET", input.path || "");
    total += 1;
    if (status >= 500 || status === 0) errors += 1;
    samples.push(durationMs);
    if (samples.length > maxSamples) samples.shift();
    statuses.set(status, (statuses.get(status) || 0) + 1);
    const routeStats = routes.get(route) || {
      route,
      requests: 0,
      errors: 0,
      total_ms: 0,
      max_ms: 0
    };
    routeStats.requests += 1;
    routeStats.total_ms += durationMs;
    routeStats.max_ms = Math.max(routeStats.max_ms, durationMs);
    if (status >= 500 || status === 0) routeStats.errors += 1;
    routes.set(route, routeStats);
  }

  function metrics() {
    const sorted = [...samples].sort((left, right) => left - right);
    return {
      started_at: startedAt,
      sample_size: samples.length,
      total,
      errors,
      error_rate: total ? errors / total : 0,
      p50_ms: percentile(sorted, 50),
      p95_ms: percentile(sorted, 95),
      p99_ms: percentile(sorted, 99),
      max_ms: sorted.at(-1) || 0,
      statuses: Object.fromEntries([...statuses.entries()].sort(([left], [right]) => Number(left) - Number(right))),
      slow_routes: [...routes.values()]
        .map((route) => ({
          ...route,
          avg_ms: route.requests ? route.total_ms / route.requests : 0
        }))
        .sort((left, right) => right.avg_ms - left.avg_ms || right.requests - left.requests)
        .slice(0, 10)
        .map((route) => ({
          route: route.route,
          requests: route.requests,
          errors: route.errors,
          avg_ms: Math.round(route.avg_ms),
          max_ms: Math.round(route.max_ms)
        }))
    };
  }

  function clear() {
    samples.length = 0;
    routes.clear();
    statuses.clear();
    total = 0;
    errors = 0;
    startedAt = new Date().toISOString();
  }

  return { record, metrics, clear };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]);
}

function normalizeRoute(method, path) {
  const cleanPath = String(path || "/").split("?")[0] || "/";
  const normalized = cleanPath
    .replace(/^\/v1\/rule-sets\/[^/]+/, "/v1/rule-sets/:key")
    .replace(/^\/v1\/lookup-tables\/[^/]+/, "/v1/lookup-tables/:id")
    .replace(/^\/v1\/messages\/[^/]+/, "/v1/messages/:id")
    .replace(/^\/v1\/tokens\/[^/]+/, "/v1/tokens/:id")
    .replace(/^\/v1\/condition-blocks\/[^/]+/, "/v1/condition-blocks/:id")
    .replace(/^\/v1\/evaluation-profiles\/[^/]+/, "/v1/evaluation-profiles/:id")
    .replace(/^\/v1\/metrics\/rule\/[^/]+/, "/v1/metrics/rule/:key");
  return `${String(method || "GET").toUpperCase()} ${normalized}`;
}

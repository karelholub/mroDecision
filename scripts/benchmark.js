const benchmarkProfiles = {
  smoke: {
    requests: 100,
    concurrency: 10,
    warmupRequests: 0,
    minRps: null,
    maxP95Ms: null,
    maxP99Ms: null,
    maxErrorRate: 0
  },
  "100rps": {
    requests: 3000,
    concurrency: 50,
    warmupRequests: 300,
    minRps: 100,
    maxP95Ms: 150,
    maxP99Ms: 300,
    maxErrorRate: 0.001
  },
  "500rps": {
    requests: 10000,
    concurrency: 250,
    warmupRequests: 1000,
    minRps: 500,
    maxP95Ms: 200,
    maxP99Ms: 500,
    maxErrorRate: 0.001
  },
  "1000rps": {
    requests: 20000,
    concurrency: 500,
    warmupRequests: 2000,
    minRps: 1000,
    maxP95Ms: 250,
    maxP99Ms: 750,
    maxErrorRate: 0.002
  }
};

const profileName = String(process.env.DEE_BENCH_PROFILE || "smoke").trim().toLowerCase();
const profile = benchmarkProfiles[profileName] || {};
const baseUrl = process.env.DEE_BENCH_URL || "http://127.0.0.1:8090";
const token = process.env.DEE_BENCH_TOKEN || "dev-admin-token";
const count = numberEnv("DEE_BENCH_REQUESTS", profile.requests || 100);
const concurrency = numberEnv("DEE_BENCH_CONCURRENCY", profile.concurrency || 10);
const endpoint = process.env.DEE_BENCH_ENDPOINT || "/v1/evaluate";
const warmupRequests = numberEnv("DEE_BENCH_WARMUP_REQUESTS", profile.warmupRequests || 0);
const maxP95Ms = optionalNumber(process.env.DEE_BENCH_MAX_P95_MS, profile.maxP95Ms ?? null);
const maxP99Ms = optionalNumber(process.env.DEE_BENCH_MAX_P99_MS, profile.maxP99Ms ?? null);
const maxErrorRate = optionalNumber(process.env.DEE_BENCH_MAX_ERROR_RATE, profile.maxErrorRate ?? 0);
const minRps = optionalNumber(process.env.DEE_BENCH_MIN_RPS, profile.minRps ?? null);

const payload = {
  decision_key: process.env.DEE_BENCH_DECISION_KEY || "next_best_offer",
  profile_key: "bench-profile",
  identifiers: [{ typeId: "email", value: "bench@example.com" }],
  attributes: {
    lead_score: [{ value: 82 }],
    web_engagement_score: [{ value: 71 }],
    interacted_promotions: [{ value: [] }],
    customer_lifetime_value: [{ value: 12400 }],
    monetary_rfm: [{ value: 5 }],
    churn_risk_score: [{ value: 0.2 }],
    outstanding_balance_tier: [{ value: "low" }],
    late_payments_count_12m: [{ value: 0 }],
    survey_nps_latest: [{ value: 8 }],
    sustainability_score: [{ value: 91 }]
  },
  segments: {},
  context: { channel: "benchmark" }
};

if (!Number.isInteger(count) || count < 1) throw new Error("DEE_BENCH_REQUESTS must be a positive integer");
if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("DEE_BENCH_CONCURRENCY must be a positive integer");

if (warmupRequests > 0) {
  await runBatch({ requests: warmupRequests, concurrency: Math.min(concurrency, warmupRequests), warmup: true });
}

const startedAt = performance.now();
const timings = await runBatch({ requests: count, concurrency, warmup: false });
const durationMs = performance.now() - startedAt;
timings.sort((a, b) => a.ms - b.ms);

const percentile = (p) => timings[Math.min(timings.length - 1, Math.ceil((p / 100) * timings.length) - 1)]?.ms || 0;
const ok = timings.filter((item) => item.ok).length;
const failed = timings.length - ok;
const errorRate = timings.length ? failed / timings.length : 0;
const rps = timings.length ? timings.length / (durationMs / 1000) : 0;
const summary = {
  profile: benchmarkProfiles[profileName] ? profileName : "custom",
  url: baseUrl,
  endpoint,
  decision_key: payload.decision_key,
  requests: count,
  concurrency,
  warmup_requests: warmupRequests,
  ok,
  failed,
  error_rate: round(errorRate, 4),
  rps: round(rps, 2),
  duration_ms: Math.round(durationMs),
  avg_ms: Math.round(timings.reduce((sum, item) => sum + item.ms, 0) / Math.max(1, timings.length)),
  p50_ms: Math.round(percentile(50)),
  p95_ms: Math.round(percentile(95)),
  p99_ms: Math.round(percentile(99)),
  max_ms: Math.round(timings.at(-1)?.ms || 0),
  statuses: statusCounts(timings),
  errors: errorCounts(timings),
  thresholds: {
    max_p95_ms: maxP95Ms,
    max_p99_ms: maxP99Ms,
    max_error_rate: maxErrorRate,
    min_rps: minRps
  }
};
summary.passed = benchmarkPassed(summary);

console.log(JSON.stringify(summary, null, 2));
if (!summary.passed) process.exitCode = 1;

async function runBatch({ requests, concurrency: workerCount, warmup }) {
  const timings = [];
  let next = 0;
  async function worker() {
    while (next < requests) {
      const index = next;
      next += 1;
      const started = performance.now();
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
            "x-request-id": `${warmup ? "bench-warmup" : "bench"}-${index}`
          },
          body: JSON.stringify({ ...payload, profile_key: `${payload.profile_key}-${warmup ? "warmup-" : ""}${index}` })
        });
        await response.text();
        timings.push({ ms: performance.now() - started, ok: response.ok, status: response.status });
      } catch (error) {
        timings.push({ ms: performance.now() - started, ok: false, status: 0, error: error.message });
      }
    }
  }
  await Promise.all(Array.from({ length: workerCount }, worker));
  return timings;
}

function statusCounts(timings) {
  return timings.reduce((counts, item) => {
    const key = String(item.status || 0);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function errorCounts(timings) {
  return timings
    .filter((item) => item.error)
    .reduce((counts, item) => {
      counts[item.error] = (counts[item.error] || 0) + 1;
      return counts;
    }, {});
}

function benchmarkPassed(summary) {
  const checks = [
    maxP95Ms == null || summary.p95_ms <= maxP95Ms,
    maxP99Ms == null || summary.p99_ms <= maxP99Ms,
    maxErrorRate == null || summary.error_rate <= maxErrorRate,
    minRps == null || summary.rps >= minRps
  ];
  return checks.every(Boolean);
}

function optionalNumber(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid numeric benchmark threshold: ${value}`);
  return parsed;
}

function numberEnv(name, fallback) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid numeric benchmark value for ${name}: ${value}`);
  return parsed;
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

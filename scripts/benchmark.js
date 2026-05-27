const baseUrl = process.env.DEE_BENCH_URL || "http://localhost:8090";
const token = process.env.DEE_BENCH_TOKEN || "dev-admin-token";
const count = Number(process.env.DEE_BENCH_REQUESTS || 100);
const concurrency = Number(process.env.DEE_BENCH_CONCURRENCY || 10);

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

const timings = [];
let next = 0;

async function worker() {
  while (next < count) {
    const index = next;
    next += 1;
    const started = performance.now();
    const response = await fetch(`${baseUrl}/v1/evaluate`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-request-id": `bench-${index}`
      },
      body: JSON.stringify({ ...payload, profile_key: `${payload.profile_key}-${index}` })
    });
    await response.text();
    timings.push({ ms: performance.now() - started, ok: response.ok });
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
timings.sort((a, b) => a.ms - b.ms);

const percentile = (p) => timings[Math.min(timings.length - 1, Math.floor((p / 100) * timings.length))]?.ms || 0;
const ok = timings.filter((item) => item.ok).length;

console.log(JSON.stringify({
  url: baseUrl,
  decision_key: payload.decision_key,
  requests: count,
  concurrency,
  ok,
  failed: timings.length - ok,
  p50_ms: Math.round(percentile(50)),
  p95_ms: Math.round(percentile(95)),
  p99_ms: Math.round(percentile(99)),
  max_ms: Math.round(timings.at(-1)?.ms || 0)
}, null, 2));

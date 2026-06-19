# Observability Runbook

Use this runbook when DEE is deployed for public website or app traffic.

## Metrics Endpoints

- `/v1/metrics`: JSON metrics for the DEE admin UI and ad-hoc debugging.
- `/v1/metrics/prometheus`: Prometheus text exposition for scraping.
- `/v1/metrics/client-events`: detailed client event reporting for impressions, exposures, conversions, messages, surfaces, and recent events.
- `/v1/meiro-deliveries`: feedback and collector delivery diagnostics.
- `/v1/ready`: readiness, active store adapter, database deployment status, and Postgres pool metadata.

Metrics endpoints require a token with the `viewer` or `admin` scope. For Prometheus, create a scoped service token and configure the scrape job with an `Authorization: Bearer ...` header.

For Kubernetes clusters with Prometheus Operator, optional `ServiceMonitor` and `PrometheusRule` examples live in `deploy/kubernetes/observability.yaml`. They are intentionally not part of the default Kustomize apply because the monitoring CRDs are cluster-specific. Alert response guidance lives in `docs/alert-response-runbook.md`.

Run `npm run launch:preflight` before applying monitoring changes. The preflight checks the dashboard JSON, alert/runbook linkage, core Kubernetes settings, and, when `DEE_PREFLIGHT_URL` is set, the live `/v1/ready` and `/v1/metrics/prometheus` responses.

Example scrape target:

```yaml
scrape_configs:
  - job_name: meiro-dee
    metrics_path: /v1/metrics/prometheus
    scheme: https
    bearer_token_file: /etc/prometheus/secrets/dee-viewer-token
    static_configs:
      - targets:
          - dee.example.com
```

## Core SLOs

Initial production SLOs for high-traffic websites:

- Availability: 99.9% successful `/v1/client/*` requests over 30 days.
- Latency: p95 under 150ms and p99 under 300ms for `/v1/client/evaluate` in-region.
- Error rate: under 0.1% 5xx responses over 15 minutes.
- Rate-limit block rate: under 1% after excluding known load tests.
- Load shedding: `dee_load_shedding_active == 0` during normal traffic; use `monitor` mode before enabling enforcement.
- Runtime state: high-traffic multi-replica deployments should expose `dee_runtime_state_postgres == 1`.
- Meiro profile enrichment: under 1% profile API lookup errors over 15 minutes.
- Feedback delivery: under 1% failed collector/feedback attempts over 15 minutes.
- In-app precompute: non-zero recent runs and expected eligible/suppressed distribution during scheduled Pipes exports.

Tune SLOs per deployment after a week of real traffic. Do not relax thresholds before checking Postgres saturation, Meiro dependency latency, CORS errors, token scoping, and rule complexity.

## Alert Recommendations

Page immediately:

- `dee_database_ready == 0` for 2 minutes.
- `dee_runtime_error_rate > 0.02` for 5 minutes.
- `dee_client_error_rate > 0.02` for 5 minutes.
- `dee_runtime_latency_p99_ms > 1000` for 5 minutes.
- `dee_profile_cache_errors_total` increases rapidly while client traffic is non-zero.
- `dee_meiro_circuit_open{dependency="profile"} == 1` for 5 minutes while client traffic is non-zero.

Warn during business hours:

- `dee_client_rate_limit_block_rate > 0.01` for 15 minutes.
- `dee_load_shedding_active == 1` for 5 minutes while `mode="monitor"`; verify thresholds before switching to `shed`.
- `dee_load_shedding_shed_total` increases outside a planned load test.
- `dee_client_cache_hit_rate` drops sharply after a deploy.
- `dee_profile_cache_hit_rate` drops sharply while Meiro enrichment is enabled.
- `dee_meiro_circuit_open{dependency="feedback"} == 1` or `dee_meiro_circuit_open{dependency="collector"} == 1` for 15 minutes.
- `dee_precompute_runs_total == 0` during an expected Pipes export window.
- Draft rules exceed published rules for more than one release cycle.

## Dashboard Panels

An importable Grafana dashboard lives at `deploy/grafana/dee-overview-dashboard.json`. Import it after Prometheus is scraping `/v1/metrics/prometheus`, then select the Prometheus datasource when prompted.

Customer overlays may add namespace, cluster, pod, or environment template variables when their Prometheus labels expose those dimensions. Keep the base dashboard in source control and promote changes through the same review path as Kubernetes alert rules.

The dashboard should include panels for:

- Client request rate, error rate, p95, and p99.
- Runtime state adapter and active rate-limit buckets.
- Load shedding active/enforced state, reason, and shed count.
- Runtime request rate, status codes, slow routes.
- Database readiness and Postgres pool size by replica.
- Decision outcomes: eligible, deferred, suppressed, ineligible.
- Rule traffic share and top rules by requests.
- Experiment exposures, impressions, conversions, and winner status.
- Client event flow by event type and surface.
- Meiro profile cache hit rate, not found, and errors.
- Meiro circuit state by dependency.
- Feedback and collector delivery success/failure.
- In-app precompute runs, profiles, eligible profiles, suppressed profiles, and errors.

## Alert Response

Use `docs/alert-response-runbook.md` for first-response steps for the default alerts:

- `DeeDatabaseNotReady`
- `DeeRuntimeErrorRateHigh`
- `DeeClientErrorRateHigh`
- `DeeRuntimeP99High`
- `DeeLoadSheddingActive`
- `DeeLoadSheddingEnforced`
- `DeeRuntimeStateNotShared`
- `DeeProfileCircuitOpen`
- `DeeFeedbackCircuitOpen`
- `DeeClientRateLimitPressure`

## Staging Load Gate

Before production traffic, run:

```bash
DEE_BENCH_URL=https://staging-dee.example.com \
DEE_BENCH_TOKEN=replace-with-client-or-evaluate-token \
DEE_BENCH_ENDPOINT=/v1/client/evaluate \
DEE_BENCH_REQUESTS=5000 \
DEE_BENCH_CONCURRENCY=100 \
DEE_BENCH_WARMUP_REQUESTS=500 \
DEE_BENCH_MAX_P95_MS=150 \
DEE_BENCH_MAX_P99_MS=300 \
DEE_BENCH_MAX_ERROR_RATE=0.001 \
npm run bench
```

For launch readiness, repeat at expected peak traffic and at 2x expected peak. Watch Postgres CPU, connection count, lock waits, DEE pod CPU/memory, `dee_runtime_latency_p99_ms`, `dee_client_error_rate`, and Meiro profile API latency.

For the full production gate, use `docs/production-launch-checklist.md`.

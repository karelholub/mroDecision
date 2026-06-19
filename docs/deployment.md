# Deployment Guide

DEE is intended to run as a self-contained container application. For demos and local development, SQLite is still available. For production and high-volume websites, run DEE with the native row-level Postgres adapter and multiple stateless web replicas.

DEE does not try to replace Meiro's identity-resolution layer. In production, browser or server integrations should send stable profile identifiers and request context to DEE; DEE can enrich sparse requests through the configured Meiro Profile API, and Pipes/Meiro remain responsible for profile identity, segment membership, event collection, and downstream profile updates.

Recommended production shape:

- Kubernetes Deployment with 3+ DEE replicas.
- Native Postgres adapter: `DEE_STORE_ADAPTER=postgres_native`.
- Postgres provided by either a managed database or the bundled Kubernetes StatefulSet template.
- Meiro/Pipes for identity resolution, profile attributes, segment export, and collector feedback.
- CDN/load balancer/Ingress in front of `/v1/client/*`.
- Strict CORS allow-list and scoped client tokens.
- `/v1/ready` readiness probes and `/v1/health` liveness probes.

## Container Deployment

Build an image:

```bash
docker build -t meiro-decision-engine:latest .
```

Create an environment file from `deploy/.env.example`, then start the production template:

```bash
cp deploy/.env.example deploy/.env
docker compose --env-file deploy/.env -f deploy/docker-compose.production.yml up -d
```

The template runs:

- `postgres`: a local Postgres service for self-contained production-like deployments
- `dee`: the Node decision service
- `nginx`: a reverse proxy that forwards `X-Request-ID`
- `dee-postgres`: a named volume for Postgres data
- `dee-data`: a named volume retained for local files and backwards-compatible SQLite demos

In a real HTTPS deployment, terminate TLS at your platform load balancer, ingress controller, Caddy, Traefik, or cert-manager-backed nginx. The bundled nginx example is intentionally HTTP-only so certificate management stays platform-specific.

## First Admin Token

Do not leave the development token active in production.

1. Start once with a short-lived bootstrap token in `DEE_TOKENS`.
2. Open Settings and create a database-backed token with the `admin` scope.
3. Store the generated token in your secret manager.
4. Set `DEE_BOOTSTRAP_TOKENS_ENABLED=false`.
5. Restart and verify the bootstrap token no longer works.

The app also prevents disabling bootstrap tokens from Settings until at least one active DB admin token exists.

## Kubernetes Deployment

The repository includes a plain Kubernetes package under `deploy/kubernetes`. It is intentionally not Helm yet; teams can apply it directly, patch it with Kustomize overlays, or wrap it into an internal chart.

Files:

- `namespace.yaml`: default `meiro-dee` namespace.
- `configmap.yaml`: non-secret runtime settings.
- `secret.example.yaml`: template for `DEE_DATABASE_URL` and bootstrap tokens. Replace or manage through External Secrets / Sealed Secrets.
- `postgres.yaml`: self-contained Postgres StatefulSet for pilot or private-cluster deployments.
- `migration-job.yaml`: applies the native Postgres schema before rollout.
- `dee.yaml`: DEE Deployment, Service, HPA, probes, and example Ingress.
- `benchmark-job.yaml`: optional on-demand benchmark Job for staging load gates. It is not included in `kustomization.yaml`.
- `README.md`: Kubernetes-specific rollout, scaling, pool sizing, and benchmark instructions.
- `kustomization.yaml`: applies the package.

Example:

```bash
kubectl apply -k deploy/kubernetes
kubectl -n meiro-dee wait --for=condition=complete job/dee-postgres-migrate --timeout=120s
kubectl -n meiro-dee rollout status deployment/dee
kubectl -n meiro-dee get pods,svc,ingress
```

Before production rollout:

1. Replace `dee.example.com`, image names, CORS origins, and all secrets.
2. Prefer a managed Postgres service for large public websites. Use the bundled StatefulSet only when the platform team accepts StatefulSet backup, restore, and failover ownership.
3. Run `npm run postgres:migrate -- --print` in release review.
4. Run the migration Job or an equivalent CI/CD migration step before deploying new app replicas.
5. Verify `/v1/ready` reports `postgres_native` and `production_ready`.
6. Create DB-backed admin/service/client tokens and keep `DEE_BOOTSTRAP_TOKENS_ENABLED=false`.
7. Keep `DEE_RUNTIME_STATE_ADAPTER=postgres` for multi-replica deployments so decision cache, profile cache, and rate-limit buckets are shared.
8. Configure Ingress/CDN rate limits in addition to DEE application rate limits.
9. Run the optional benchmark Job from `deploy/kubernetes/benchmark-job.yaml` in staging before raising HPA limits.

Use `docs/postgres-operations-runbook.md` for the full release, rollback, restore, and backup-validation procedure.

For high-traffic websites, do not send full profile snapshots from the browser. Send identifiers and context, and let DEE use Meiro Profile API enrichment when needed. This keeps request payloads small and lets Meiro/Pipes continue to own identity resolution and profile state.

For website SDK rollout, use `docs/dee-web-sdk/README.md` for GTM/CDN snippets, consent wiring, bot/debug controls, timeout defaults, and SPA reinitialization guidance.

For token rotation, CORS review, decision-asset release checks, and SDK/app rollback, use `docs/security-change-safety-runbook.md`.

For the end-to-end go-live gate, use `docs/production-launch-checklist.md`.

The Kubernetes template is configured for safe rolling updates:

- `maxUnavailable: 0` and `maxSurge: 1` keep serving capacity during deploys.
- `topologySpreadConstraints` try to spread DEE pods across nodes and zones.
- `PodDisruptionBudget` keeps at least two replicas available during voluntary node maintenance.
- `preStop` plus the process SIGTERM handler give load balancers time to observe `not_ready` before the pod exits.
- `DEE_SHUTDOWN_GRACE_MS` should stay below `terminationGracePeriodSeconds`; the template uses 25s inside a 30s termination window.
- HPA scale-up/down behavior is dampened so traffic spikes can add capacity quickly while scale-down waits for a stable five-minute window.

## Postgres Pool Sizing

Each DEE replica owns its own Postgres connection pool. Size the database for the total possible connection count, not just the steady-state replica count:

```text
maximum app connections = max DEE replicas * DEE_POSTGRES_POOL_MAX
```

Keep enough database headroom for migrations, admin sessions, backups, monitoring, and failover. For example, the bundled Kubernetes template allows up to 12 replicas and defaults to `DEE_POSTGRES_POOL_MAX=10`, which can use up to 120 application connections before reserved database connections.

Native Postgres pool knobs:

- `DEE_POSTGRES_POOL_MAX`: maximum Postgres connections per DEE replica. Start with `10` and raise only after measuring p95/p99 latency, database CPU, and lock waits.
- `DEE_POSTGRES_IDLE_TIMEOUT_MS`: idle connection lifetime before the pool closes it. Default `30000`.
- `DEE_POSTGRES_CONNECTION_TIMEOUT_MS`: how long a request waits for a new database connection before failing readiness/request work. Default `5000`.
- `DEE_POSTGRES_STATEMENT_TIMEOUT_MS`: per-statement timeout sent to Postgres. Default `15000`.

`/v1/ready` reports the active pool configuration under `database.postgres.pool` for `postgres_native` deployments. Treat readiness failures as a signal to remove the replica from traffic; do not hide database connectivity failures behind fallback local storage.

## Data Retention

High-volume deployments should set retention intentionally:

- `DEE_AUDIT_RETENTION_DAYS` controls evaluation audit history.
- `DEE_CLIENT_EVENT_RETENTION_DAYS` controls client-side events and experiment assignment cleanup.
- Meiro/Pipes remains the long-term profile and event system of record; DEE keeps operational decision history for debugging, reporting, and experiment analytics.

At very high volume, consider monthly or daily Postgres partitioning for the largest append-heavy tables (`audit_log`, `client_events`, `experiment_assignments`, `meiro_deliveries`, and `precompute_runs`). The bundled schema keeps the baseline simple and portable; platform teams can add partitioning in a managed-Postgres overlay once traffic characteristics are known.

## Health Checks

Use:

- `/v1/health` for process liveness
- `/v1/ready` for readiness, including SQLite access

The production Compose template uses `/v1/ready` as the container health check.

## Traffic Guardrails

DEE is designed to sit behind a CDN, load balancer, or reverse proxy for public website traffic. Keep coarse abuse controls at the edge, then use DEE process controls as the application-level backstop.

Runtime knobs:

- `DEE_CORS_ORIGINS` is a comma-separated allow-list for browser origins that can call `/v1/client/*`, such as `https://www.example.com,https://app.example.com`. Use `*` only for local demos or controlled sandboxes because client tokens are intended for public browser integrations but should still be scoped and rate-limited.
- Client tokens can add per-token constraints for allowed browser origins, environment label, app id, and allowed decision keys. Environment/app constraints are read from request context (`context.environment`, `context.app_id`) or headers (`x-dee-environment`, `x-dee-app-id`).
- `DEE_RUNTIME_STATE_ADAPTER=memory|postgres` controls where decision cache, profile cache, and client rate-limit buckets live. Use `memory` for one replica. Use `postgres` with `DEE_STORE_ADAPTER=postgres_native` for shared runtime state across Kubernetes replicas.
- `DEE_CLIENT_RATE_LIMIT_WINDOW_MS` and `DEE_CLIENT_RATE_LIMIT_MAX` rate-limit `/v1/client/*` calls per token, origin, action, and source IP.
- `DEE_REQUEST_BODY_LIMIT_BYTES` caps normal JSON requests.
- `DEE_BATCH_REQUEST_BODY_LIMIT_BYTES` caps batch/import/schema payloads.
- `DEE_REQUEST_TIMEOUT_MS` limits full request processing time at the Node HTTP layer.
- `DEE_HEADERS_TIMEOUT_MS`, `DEE_KEEP_ALIVE_TIMEOUT_MS`, and `DEE_MAX_REQUESTS_PER_SOCKET` tune socket reuse for reverse-proxy traffic.
- `DEE_LOAD_SHEDDING_MODE` controls browser decision traffic protection: `off`, `monitor`, or `shed`. The default is `monitor`, which records pressure without rejecting requests. Use `shed` only after dashboards confirm thresholds are sensible for the environment.
- `DEE_LOAD_SHEDDING_RUNTIME_P95_MS`, `DEE_LOAD_SHEDDING_CLIENT_ERROR_RATE`, `DEE_LOAD_SHEDDING_PROFILE_ERROR_THRESHOLD`, and `DEE_LOAD_SHEDDING_MIN_SAMPLES` define pressure thresholds. In `shed` mode, `/v1/client/evaluate`, `/v1/client/surface`, and `/v1/client/surface/batch` return `503 load_shed` with `retry-after` when a threshold is active.
- `DEE_LOAD_SHEDDING_SHED_ON_OPEN_CIRCUIT=true` can reject browser decisions when a Meiro dependency circuit is open. Keep it `false` if rule-level fail-open/fail-closed policies should decide degraded behavior.
- `DEE_MEIRO_CIRCUIT_FAILURE_THRESHOLD` opens a per-replica circuit after repeated Meiro Profile API, feedback, or collector failures. Default `5`.
- `DEE_MEIRO_CIRCUIT_COOLDOWN_MS` controls how long an open Meiro circuit waits before allowing a half-open retry. Default `30000`.

Rate-limited responses return `429`, `retry-after`, and `x-ratelimit-*` headers. Watch `/v1/metrics` for `runtime_state.adapter`, `runtime_requests.p95_ms`, `runtime_requests.error_rate`, `runtime_requests.slow_routes`, `client_traffic.error_rate`, `client_traffic.by_origin`, `client_traffic.by_token`, `client_rate_limit.block_rate`, `load_shedding`, `client_cache.hit_rate`, and `profile_cache.hit_rate` before increasing limits. For browser integrations, keep request payloads small and prefer profile/context keys over large profile snapshots.

Client feedback endpoints are idempotent by `event_id` or `Idempotency-Key`. Use a stable key for impression, exposure, and conversion retries so browser retry queues, CDN retries, and network timeouts do not inflate operational metrics or experiment conversion rates.

Meiro dependency circuit breakers are intentionally per replica and in-memory. They prevent a degraded Meiro Profile API or collector endpoint from turning every website request into a slow outbound retry. When the Profile API circuit is open, DEE continues evaluating with the local request payload and reports `profile_cache.status = "circuit_open"` in the decision response diagnostics.

Rules can opt into explicit dependency failure behavior through `cache_policy.dependency_failure_mode`:

- `evaluate` keeps the default behavior and evaluates with whatever request/profile data is available.
- `fail_open` returns an eligible-style fallback result when Profile API enrichment fails or the profile circuit is open. Use this for low-risk marketing placements, generic content, and experiments where showing a fallback is better than showing nothing.
- `fail_closed` returns an ineligible/deferred-style fallback result. Use this for credit, compliance, suppression, or paid-benefit eligibility where missing profile data should not grant access.

Optional `cache_policy.dependency_failure_outputs`, `fail_open_outputs`, and `fail_closed_outputs` let a rule return a safe fallback message, suppression reason, or diagnostic payload. Dependency-failure responses are audited and forwarded to Meiro feedback like normal decisions.

## SQLite Operations

Mount `DEE_DATA_DIR` on persistent storage. With the default settings, the important files are:

- `dee.sqlite`
- `dee.sqlite-wal`
- `dee.sqlite-shm`

For backups, prefer one of these patterns:

- Stop the container, snapshot all three files, then restart.
- Use host-level SQLite online backup tooling against the mounted database.
- Snapshot the underlying persistent volume if your platform supports crash-consistent volume snapshots.

Restore by stopping the service, replacing the database files, and starting the service again.

## Managed Database Migration Path

The app starts through an explicit store adapter registry controlled by `DEE_STORE_ADAPTER`. SQLite remains the default:

```bash
DEE_STORE_ADAPTER=sqlite
```

Managed Postgres snapshot mode can be enabled with:

```bash
DEE_STORE_ADAPTER=postgres
DEE_DATABASE_URL=postgres://user:pass@host:5432/db
DEE_POSTGRES_SNAPSHOT_TABLE=dee_store_snapshots
```

This mode stores the full DEE SQLite-compatible snapshot in a managed Postgres JSONB table. It gives managed-database persistence, provider backups, and easier restore workflows, but it is intentionally reported as a single-writer adapter. Do not use it for horizontal write scaling across multiple active DEE replicas.

Snapshot saves use optimistic revision protection. If two active writers point at the same snapshot table, the later stale writer will fail with a revision conflict instead of silently overwriting newer data. Stop the stale instance, restart it so it reloads the latest snapshot, and keep only one active writer for snapshot mode.

For high-write or multi-replica deployments, use the native row-level Postgres adapter:

```env
DEE_STORE_ADAPTER=postgres_native
DEE_DATABASE_URL=postgres://user:pass@host:5432/db
```

The native adapter applies the idempotent schema contract from `src/storePostgresNativeSchema.js` during startup and reports production-ready row-store capabilities through `/v1/ready` and Settings runtime metadata. This is the required adapter for Kubernetes horizontal scaling.

Unsupported adapter values fail startup with a clear error. This is deliberate: production deployments should not silently fall back to local-file storage when a managed database was expected. `/v1/ready` and Settings runtime metadata report the active adapter and its capabilities.

Recommended path:

1. Keep the SQLite adapter as the default implementation.
2. Use Postgres snapshot mode when managed persistence is more important than horizontal writes.
3. Use `DEE_STORE_ADAPTER=postgres_native` for high-write multi-replica deployments.
4. Keep `npm run postgres:migrate -- --print` in release review so schema changes are visible before rollout.
5. Add live integration tests against the managed database before scaling traffic.
6. Tune database pool limits and web replica counts together.
7. Keep a rollback playbook for application version rollback and managed database restore points.

Preview the native schema without touching a database:

```bash
npm run postgres:migrate -- --print
```

Check the migration status recorded in a target database:

```bash
DEE_DATABASE_URL=postgres://user:pass@host:5432/db npm run postgres:migrate -- --status
```

Apply it to a managed Postgres database before rollout, or let the native adapter apply the same idempotent schema during startup:

```bash
DEE_DATABASE_URL=postgres://user:pass@host:5432/db npm run postgres:migrate -- --apply
```

Run a live smoke test against a staging or newly provisioned production database before moving traffic:

```bash
DEE_DATABASE_URL=postgres://user:pass@host:5432/db npm run postgres:smoke
```

The smoke test applies startup schema checks through the native adapter, verifies `/v1/ready`-equivalent health, creates and publishes a temporary rule, writes audit/client-event rows, and removes its temporary data unless `-- --keep-data` is supplied.

For SQLite or Postgres snapshot mode, run one active writer per database volume or snapshot table. Multiple service replicas pointed at the same SQLite file over network storage are not recommended.

## Observability

Every response includes `x-request-id`. Pass your own `x-request-id` from upstream systems when available. The service writes one JSON log line per request, including status, method, path, duration, and request ID.

Use `/v1/metrics` and `/v1/metrics/client-events` from an admin or viewer token for rule usage, runtime latency/status telemetry, website API traffic by endpoint/token/origin/environment/app, client-event reporting, client cache performance, profile cache performance, and client rate-limit pressure.

Use `/v1/metrics/prometheus` for Prometheus scraping with a viewer/admin token. See `docs/observability-runbook.md` for scrape configuration, dashboard panels, alert thresholds, and staging load gates. Import `deploy/grafana/dee-overview-dashboard.json` for the baseline Grafana dashboard, and use `docs/alert-response-runbook.md` with the optional Prometheus rules in `deploy/kubernetes/observability.yaml`.

## Benchmark Gates

Run the benchmark from a network location close to the service before exposing DEE to a high-traffic website:

```bash
npm run bench:100
npm run bench:500
npm run bench:1000
```

The named profiles target `/v1/client/evaluate` at roughly 100, 500, and 1000 RPS. Override any preset with `DEE_BENCH_URL`, `DEE_BENCH_TOKEN`, `DEE_BENCH_PROFILE`, `DEE_BENCH_REQUESTS`, `DEE_BENCH_CONCURRENCY`, `DEE_BENCH_WARMUP_REQUESTS`, `DEE_BENCH_MAX_P95_MS`, `DEE_BENCH_MAX_P99_MS`, `DEE_BENCH_MAX_ERROR_RATE`, and `DEE_BENCH_MIN_RPS`.

The benchmark emits JSON with profile name, request counts, status distribution, error rate, RPS, p50/p95/p99, max latency, configured thresholds, and `passed`. It exits non-zero when a configured threshold fails, so it can be used in staging release checks.

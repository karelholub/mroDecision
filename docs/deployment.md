# Deployment Guide

This service is currently optimized for a single container with SQLite persistence. That is a good fit for demos, pilots, and controlled single-region deployments. For higher scale or multi-instance deployments, keep the API contract and move persistence behind a managed database adapter.

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

- `dee`: the Node decision service
- `nginx`: a reverse proxy that forwards `X-Request-ID`
- `dee-data`: a named volume for SQLite data

In a real HTTPS deployment, terminate TLS at your platform load balancer, ingress controller, Caddy, Traefik, or cert-manager-backed nginx. The bundled nginx example is intentionally HTTP-only so certificate management stays platform-specific.

## First Admin Token

Do not leave the development token active in production.

1. Start once with a short-lived bootstrap token in `DEE_TOKENS`.
2. Open Settings and create a database-backed token with the `admin` scope.
3. Store the generated token in your secret manager.
4. Set `DEE_BOOTSTRAP_TOKENS_ENABLED=false`.
5. Restart and verify the bootstrap token no longer works.

The app also prevents disabling bootstrap tokens from Settings until at least one active DB admin token exists.

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
- `DEE_CLIENT_RATE_LIMIT_WINDOW_MS` and `DEE_CLIENT_RATE_LIMIT_MAX` rate-limit `/v1/client/*` calls per token, origin, action, and source IP.
- `DEE_REQUEST_BODY_LIMIT_BYTES` caps normal JSON requests.
- `DEE_BATCH_REQUEST_BODY_LIMIT_BYTES` caps batch/import/schema payloads.
- `DEE_REQUEST_TIMEOUT_MS` limits full request processing time at the Node HTTP layer.
- `DEE_HEADERS_TIMEOUT_MS`, `DEE_KEEP_ALIVE_TIMEOUT_MS`, and `DEE_MAX_REQUESTS_PER_SOCKET` tune socket reuse for reverse-proxy traffic.

Rate-limited responses return `429`, `retry-after`, and `x-ratelimit-*` headers. Watch `/v1/metrics` for `runtime_requests.p95_ms`, `runtime_requests.error_rate`, `runtime_requests.slow_routes`, `client_traffic.error_rate`, `client_traffic.by_origin`, `client_traffic.by_token`, `client_rate_limit.block_rate`, `client_cache.hit_rate`, and `profile_cache.hit_rate` before increasing limits. For browser integrations, keep request payloads small and prefer profile/context keys over large profile snapshots.

Client feedback endpoints are idempotent by `event_id` or `Idempotency-Key`. Use a stable key for impression, exposure, and conversion retries so browser retry queues, CDN retries, and network timeouts do not inflate operational metrics or experiment conversion rates.

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

Snapshot saves use optimistic revision protection. If two active writers point at the same snapshot table, the later stale writer will fail with a revision conflict instead of silently overwriting newer data. Stop the stale instance, restart it so it reloads the latest snapshot, and keep only one active writer until the native row-level adapter is available.

Unsupported adapter values fail startup with a clear error. This is deliberate: production deployments should not silently fall back to local-file storage when a managed database was expected. `/v1/ready` and Settings runtime metadata report the active adapter and its capabilities.

Recommended path:

1. Keep the SQLite adapter as the default implementation.
2. Use Postgres snapshot mode when managed persistence is more important than horizontal writes.
3. Use the planned `postgres_native` adapter contract for high-write multi-replica deployments once the async store implementation is complete.
4. Apply the native Postgres schema contract from `src/storePostgresNativeSchema.js`; it defines JSONB domain tables, typed timestamps, migration metadata, and the indexes needed by the current query paths.
5. Add a migration runner for the managed SQL schema instead of relying on SQLite inline `CREATE TABLE IF NOT EXISTS`.
6. Add integration tests that run against both SQLite and the native managed adapter.
7. Add readiness checks for connection pool health, migration version, and read/write probes.
8. Only then scale horizontally.

Preview the native schema without touching a database:

```bash
npm run postgres:migrate -- --print
```

Apply it to a managed Postgres database once the native adapter implementation is ready:

```bash
DEE_DATABASE_URL=postgres://user:pass@host:5432/db npm run postgres:migrate -- --apply
```

Until the native row-level adapter exists, run one active writer per SQLite database volume or Postgres snapshot table. Multiple service replicas pointed at the same SQLite file over network storage are not recommended.

## Observability

Every response includes `x-request-id`. Pass your own `x-request-id` from upstream systems when available. The service writes one JSON log line per request, including status, method, path, duration, and request ID.

Use `/v1/metrics` and `/v1/metrics/client-events` from an admin or viewer token for rule usage, runtime latency/status telemetry, website API traffic by endpoint/token/origin/environment/app, client-event reporting, client cache performance, profile cache performance, and client rate-limit pressure.

## Benchmark Gates

Run the benchmark from a network location close to the service before exposing DEE to a high-traffic website:

```bash
DEE_BENCH_ENDPOINT=/v1/client/evaluate \
DEE_BENCH_REQUESTS=1000 \
DEE_BENCH_CONCURRENCY=50 \
DEE_BENCH_WARMUP_REQUESTS=100 \
DEE_BENCH_MAX_P95_MS=150 \
DEE_BENCH_MAX_P99_MS=300 \
DEE_BENCH_MAX_ERROR_RATE=0 \
npm run bench
```

The benchmark emits JSON with request counts, status distribution, error rate, RPS, p50/p95/p99, max latency, configured thresholds, and `passed`. It exits non-zero when a configured threshold fails, so it can be used in staging release checks.

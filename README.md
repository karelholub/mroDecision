# Meiro Decision & Eligibility Engine

A standalone Decision & Eligibility Engine (DEE) for evaluating profile-level eligibility and routing decisions from Meiro Pipes or Profile Destinations.

This initial implementation is dependency-light and runs on Node.js built-ins only. It includes:

- Versioned rule sets with draft/publish workflow
- Version diff and rollback from published versions into the current draft
- Rule-set types for decisions, in-app messages, and experiments
- Rule-set search, filtering, duplicate, and archive actions
- Single and batch evaluation APIs
- Client evaluation API for app-facing decisions and experiments
- Client impression, exposure, and conversion feedback APIs
- In-app message library with reusable default content
- Safe expression evaluation without `eval`
- Basic rule-builder style branches and advanced graph nodes
- First-pass advanced graph editor with route preview and reachability validation
- Generic reference data table storage for catalogs, matrices, mappings, and suppressions
- Audit log queries and operational metrics
- Per-rule usage detail with fallback, branch, and recent decision views
- Response TTL hints for cache-aware decision clients
- In-process client response caching based on rule TTL and cache scope
- Client API tokens with optional allowed decision-key restrictions
- Manual schema cache import for attribute, segment, and context definitions
- Schema-aware rule builder key suggestions and broken-reference warnings
- Meiro Profile API schema sync from a sample identifier, with optional scheduled refresh
- Bearer-token authentication with viewer/editor/publisher/admin/evaluate scopes
- Database-backed API token management
- Guarded bootstrap-token disablement after a database admin token exists
- Embedded management UI
- Meiro integration templates generated from runtime settings
- Dockerfile and Compose example
- SQLite persistence using Node's built-in `node:sqlite`

## Quick Start

```bash
npm test
npm start
```

The service listens on `http://localhost:8080` by default when run directly with Node. Docker Compose publishes it at `http://localhost:8090` to avoid common local port collisions.

Default development token:

```text
dev-admin-token
```

Override it in production:

```bash
DEE_TOKENS='[{"name":"admin","token":"replace-me","scopes":["admin","evaluate"]}]' npm start
```

Persistent data is stored in `data/dee.sqlite` by default. Override with:

```bash
DEE_DB_PATH=/path/to/dee.sqlite npm start
```

The store adapter is explicit and defaults to SQLite:

```bash
DEE_STORE_ADAPTER=sqlite npm start
```

Managed Postgres snapshot mode is available when the optional `pg` package is installed and `DEE_DATABASE_URL` is configured:

```bash
DEE_STORE_ADAPTER=postgres DEE_DATABASE_URL=postgres://user:pass@host:5432/db npm start
```

Postgres snapshot mode persists the full DEE store into a managed Postgres JSONB table while keeping SQLite as the in-process execution engine. Use one active writer for this mode; native row-level Postgres remains the path for horizontal write scaling. Unsupported adapter values fail startup with a clear error so production deployments do not silently fall back to local-file storage.

## API

- `GET /v1/health`
- `GET /v1/ready`
- `POST /v1/evaluate`
- `POST /v1/evaluate/batch`
- `POST /v1/client/evaluate`
- `POST /v1/client/surface`
- `POST /v1/client/surface/batch`
- `POST /v1/client/impression`
- `POST /v1/client/exposure`
- `POST /v1/client/conversion`
- `POST /v1/assistant/plan`
- `POST /v1/assistant/apply`
- `GET /v1/messages`
- `PUT /v1/messages/:id`
- `GET /v1/rule-sets`
- `GET /v1/rule-sets/:key`
- `GET /v1/rule-sets/:key/versions`
- `GET /v1/rule-sets/:key/versions/:version`
- `GET /v1/rule-sets/:key/versions/:version/diff`
- `POST /v1/rule-sets/:key/versions/:version/rollback`
- `POST /v1/rule-sets`
- `PUT /v1/rule-sets/:key/draft`
- `POST /v1/rule-sets/:key/publish`
- `POST /v1/rule-sets/:key/archive`
- `POST /v1/rule-sets/:key/duplicate`
- `POST /v1/rule-sets/:key/test`
- `GET /v1/metrics`
- `GET /v1/metrics/rule/:key`
- `GET /v1/metrics/client-events`
- `GET /v1/experiments`
- `GET /v1/experiments?format=csv`
- `GET /v1/audit`
- `GET /v1/audit?format=csv`
- `GET /v1/lookup-tables`
- `PUT /v1/lookup-tables/:id`
- `GET /v1/lookup-tables/:id/export?format=csv`
- `GET /v1/lookup-tables/:id/versions`
- `GET /v1/lookup-tables/:id/versions/:version`
- `GET /v1/schema`
- `POST /v1/schema/import`
- `POST /v1/schema/sync`
- `GET /v1/export`
- `POST /v1/import`
- `GET /v1/tokens`
- `POST /v1/tokens`
- `DELETE /v1/tokens/:id`
- `GET /v1/settings`
- `PUT /v1/settings`

See [docs/rule-format.md](docs/rule-format.md) for supported rule syntax.

The machine-readable API contract is available at [docs/openapi.yaml](docs/openapi.yaml).

Meiro Pipes integration templates are available in [docs/meiro-pipes](docs/meiro-pipes):

- Event Destination send function for live decisions
- Profile Destination send function for scheduled/batch decisions
- Example SQL for storing the latest `next_best_offer` result as a profile attribute

## Experiment Mock Website

A standalone mock website for testing external app experiment calls is available at [docs/experiment-mock-site](docs/experiment-mock-site).

Run DEE through Docker Compose, then serve the mock site on port `8091`:

```bash
docker compose up -d --build
python3 -m http.server 8091 --directory docs/experiment-mock-site
```

Open `http://localhost:8091`, enter a published experiment `decision_key`, and click **Evaluate variant**. The page calls:

- `POST /v1/client/evaluate`
- `POST /v1/client/exposure`
- `POST /v1/client/impression`
- `POST /v1/client/conversion`

Experiment operations are available in the DEE UI and through `GET /v1/experiments`. The endpoint reports baseline variant, current winner, lift versus baseline, exposure/impression/conversion counts, and conversion rates. Add `?format=csv` to export the same analysis for downstream reporting.

For website retry safety, send `event_id` in the JSON body or an `Idempotency-Key` header when calling impression, exposure, or conversion endpoints. New events return `202`; duplicate retry events return `200` with `duplicate: true` and do not increment metrics.

For real external websites, allow their browser origin with `DEE_CORS_ORIGINS`, for example:

```bash
DEE_CORS_ORIGINS="https://www.example.com,http://localhost:8091" npm start
```

Client tokens can also be scoped to allowed browser origins, an environment label, an app id, and allowed decision keys from the Settings > API Tokens screen. When environment or app id is configured, send it in `context.environment` / `context.app_id` or the `x-dee-environment` / `x-dee-app-id` headers.

A reusable browser helper for declared website placements is available in [docs/dee-web-sdk](docs/dee-web-sdk). It supports `data-dee-placement`, client evaluation, safe fallback rendering, exposure/conversion feedback, and forced-variant QA via URL parameters.

## Management UI

The embedded UI supports the current MVP workflow:

1. Create a rule set.
2. Generate branch drafts, including lookup-backed output expressions, or edit the draft JSON directly.
3. Save the draft.
4. Publish the draft.
5. Evaluate a sample profile against either the published version or the current draft.
6. Inspect audit entries, reference data tables, API tokens, and Meiro Pipes request templates.

The visual flow canvas described in the product spec is intentionally not part of this first implementation; advanced graphs are supported through JSON drafts.

## Operations

Use `GET /v1/health` for a lightweight process check and `GET /v1/ready` for readiness checks that verify SQLite access. Every API response includes `x-request-id`; callers can pass their own `x-request-id` header to correlate upstream logs. The service writes one JSON log line per request.

For high-traffic websites, tune process guardrails with environment variables:

- `DEE_CLIENT_RATE_LIMIT_WINDOW_MS` and `DEE_CLIENT_RATE_LIMIT_MAX` protect `/v1/client/*` endpoints per token, origin, action, and source IP. Responses include `x-ratelimit-*` headers and return `429` with `retry-after` when exhausted.
- `DEE_REQUEST_BODY_LIMIT_BYTES` and `DEE_BATCH_REQUEST_BODY_LIMIT_BYTES` cap JSON payload size.
- `DEE_REQUEST_TIMEOUT_MS`, `DEE_HEADERS_TIMEOUT_MS`, `DEE_KEEP_ALIVE_TIMEOUT_MS`, and `DEE_MAX_REQUESTS_PER_SOCKET` control Node HTTP socket behavior.

Monitor `/v1/metrics` for `runtime_requests`, `client_traffic`, `client_rate_limit`, `client_cache`, `profile_cache`, and `assistant_provider` before raising limits or enabling optional LLM planning broadly. Runtime request metrics include rolling p50/p95/p99 latency, status counts, error rate, and slow-route summaries. Client traffic metrics break website API calls down by endpoint, token, origin, environment, and app id. Assistant provider metrics include call/test counts, fallback/error rate, p95 latency, last provider status, and provider-reported token usage without storing prompts or API keys.

Retention is configurable in Settings:

- `audit_retention_days` controls evaluation audit retention.
- `client_event_retention_days` controls impression and exposure retention.

For production, create at least one database-backed token with the `admin` scope, then disable bootstrap tokens in Settings. This prevents the built-in development token or `DEE_TOKENS` bootstrap list from remaining a long-term access path. The service rejects disabling bootstrap tokens until an active DB admin token exists.

For Docker deployments, place the service behind an HTTPS reverse proxy and mount `data/` on durable storage. Back up SQLite by snapshotting `data/dee.sqlite` together with its WAL/SHM sidecar files while the container is stopped, or by using SQLite online backup tooling from the host. Restore by replacing those files before starting the container.

See [docs/deployment.md](docs/deployment.md) for production Compose, nginx, backup, token-hardening, and managed-database migration guidance.

Run a simple local latency check against the Docker service with:

```bash
npm run bench
```

For browser-facing traffic, run the client endpoint benchmark:

```bash
npm run bench:client
```

Tune it with `DEE_BENCH_URL`, `DEE_BENCH_TOKEN`, `DEE_BENCH_ENDPOINT`, `DEE_BENCH_REQUESTS`, `DEE_BENCH_CONCURRENCY`, `DEE_BENCH_WARMUP_REQUESTS`, and `DEE_BENCH_DECISION_KEY`. Add SLO gates with `DEE_BENCH_MAX_P95_MS`, `DEE_BENCH_MAX_P99_MS`, `DEE_BENCH_MAX_ERROR_RATE`, and `DEE_BENCH_MIN_RPS`; the command exits non-zero when a configured gate fails.

Pull requests and pushes to `main` run GitHub Actions checks for JavaScript syntax, the Node test suite, and a Docker image build.

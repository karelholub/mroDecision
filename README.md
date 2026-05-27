# Meiro Decision & Eligibility Engine

A standalone Decision & Eligibility Engine (DEE) for evaluating profile-level eligibility and routing decisions from Meiro Pipes or Profile Destinations.

This initial implementation is dependency-light and runs on Node.js built-ins only. It includes:

- Versioned rule sets with draft/publish workflow
- Version diff and rollback from published versions into the current draft
- Rule-set types for decisions, in-app messages, and experiments
- Rule-set search, filtering, duplicate, and archive actions
- Single and batch evaluation APIs
- Client evaluation API for app-facing decisions and experiments
- Client impression and exposure feedback APIs
- In-app message library with reusable default content
- Safe expression evaluation without `eval`
- Basic rule-builder style branches and advanced graph nodes
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

## API

- `GET /v1/health`
- `GET /v1/ready`
- `POST /v1/evaluate`
- `POST /v1/evaluate/batch`
- `POST /v1/client/evaluate`
- `POST /v1/client/surface`
- `POST /v1/client/impression`
- `POST /v1/client/exposure`
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

Retention is configurable in Settings:

- `audit_retention_days` controls evaluation audit retention.
- `client_event_retention_days` controls impression and exposure retention.

For production, create at least one database-backed token with the `admin` scope, then disable bootstrap tokens in Settings. This prevents the built-in development token or `DEE_TOKENS` bootstrap list from remaining a long-term access path. The service rejects disabling bootstrap tokens until an active DB admin token exists.

For Docker deployments, place the service behind an HTTPS reverse proxy and mount `data/` on durable storage. Back up SQLite by snapshotting `data/dee.sqlite` together with its WAL/SHM sidecar files while the container is stopped, or by using SQLite online backup tooling from the host. Restore by replacing those files before starting the container.

Run a simple local latency check against the Docker service with:

```bash
npm run bench
```

Tune it with `DEE_BENCH_URL`, `DEE_BENCH_TOKEN`, `DEE_BENCH_REQUESTS`, `DEE_BENCH_CONCURRENCY`, and `DEE_BENCH_DECISION_KEY`.

Pull requests and pushes to `main` run GitHub Actions checks for JavaScript syntax, the Node test suite, and a Docker image build.

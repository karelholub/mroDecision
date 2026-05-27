# Meiro Decision & Eligibility Engine

A standalone Decision & Eligibility Engine (DEE) for evaluating profile-level eligibility and routing decisions from Meiro Pipes or Profile Destinations.

This initial implementation is dependency-light and runs on Node.js built-ins only. It includes:

- Versioned rule sets with draft/publish workflow
- Version diff and rollback from published versions into the current draft
- Rule-set types for decisions, in-app messages, and experiments
- Rule-set search, filtering, duplicate, and archive actions
- Single and batch evaluation APIs
- Safe expression evaluation without `eval`
- Basic rule-builder style branches and advanced graph nodes
- Lookup table storage
- Audit log queries and operational metrics
- Manual schema cache import for attribute, segment, and context definitions
- Schema-aware rule builder key suggestions and broken-reference warnings
- Meiro Profile API schema sync from a sample identifier, with optional scheduled refresh
- Bearer-token authentication with viewer/editor/publisher/admin/evaluate scopes
- Database-backed API token management
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
- `POST /v1/evaluate`
- `POST /v1/evaluate/batch`
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
6. Inspect audit entries, lookup tables, API tokens, and Meiro Pipes request templates.

The visual flow canvas described in the product spec is intentionally not part of this first implementation; advanced graphs are supported through JSON drafts.

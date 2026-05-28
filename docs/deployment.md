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

The current code uses Node's SQLite driver directly in `src/store.js`. A managed database migration should be an explicit adapter change, not a connection-string-only switch.

Recommended path:

1. Introduce a `Store` interface boundary for rule sets, versions, audits, lookup tables, messages, schema items, tokens, settings, and client events.
2. Keep `SqliteStore` as the default implementation.
3. Add `PostgresStore` or another managed-store implementation behind `DEE_STORE_ADAPTER`.
4. Add migrations for the SQL schema instead of relying on inline `CREATE TABLE IF NOT EXISTS`.
5. Add integration tests that run against both SQLite and the managed adapter.
6. Only then scale horizontally.

Until that adapter exists, run one service replica per SQLite database volume. Multiple service replicas pointed at the same SQLite file over network storage are not recommended.

## Observability

Every response includes `x-request-id`. Pass your own `x-request-id` from upstream systems when available. The service writes one JSON log line per request, including status, method, path, duration, and request ID.

Use `/v1/metrics` and `/v1/metrics/client-events` from an admin or viewer token for rule usage and client-event reporting.


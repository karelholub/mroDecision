# Production Launch Checklist

Use this checklist before exposing DEE to high-volume website or app traffic.

## Pre-Launch Configuration

- `DEE_STORE_ADAPTER=postgres_native`.
- `DEE_RUNTIME_STATE_ADAPTER=postgres` for every multi-replica deployment.
- Managed Postgres connection limit covers `max replicas * DEE_POSTGRES_POOL_MAX` plus maintenance headroom.
- `npm run postgres:migrate -- --print` reviewed in release notes.
- Migration job or CI/CD migration step completed before app rollout.
- Backups, point-in-time recovery, and one restore drill completed.
- Kubernetes Deployment uses readiness/liveness/startup probes, HPA, PDB, topology spread, and graceful shutdown.
- `DEE_BOOTSTRAP_TOKENS_ENABLED=false` after DB-backed admin/service/client tokens exist.
- Client tokens are scoped by origin, environment, app id, and allowed decision keys where possible.
- `DEE_CORS_ORIGINS` is an explicit allow-list, not `*`.
- Meiro base URL, Profile API token, feedback endpoint, collector endpoint, and source slug pass Settings connection tests.
- SDK config includes request timeout, event timeout, consent provider, bot policy, debug query opt-in, and static fallback content.
- Decision assets have TTL, fallback behavior, dependency-failure policy, and expected Meiro feedback event mapping.

## Staging Gates

- `npm run check` passes.
- `npm test` passes.
- `npm run launch:preflight` passes for local production artifacts.
- If staging is already deployed, `DEE_PREFLIGHT_URL=https://staging-dee.example.com DEE_PREFLIGHT_TOKEN=... npm run launch:preflight` passes against readiness and Prometheus metrics.
- `npm run postgres:smoke` passes against staging/managed Postgres.
- Benchmark profile at expected peak passes:

```bash
npm run bench:100
npm run bench:500
npm run bench:1000
```

- If testing in Kubernetes, run the optional `deploy/kubernetes/benchmark-job.yaml` close to the service.
- Grafana imports `deploy/grafana/dee-overview-dashboard.json` and shows non-empty request, latency, cache, Meiro circuit, and precompute panels.
- Optional Prometheus rules from `deploy/kubernetes/observability.yaml` load without errors.
- Mock website validates evaluate, surface, in-app message, survey feedback, DOM experiment, and client event delivery.
- Meiro receives decision feedback, collector events, survey feedback, and in-app precompute digest events.

## Go-Live

- Start with a small traffic slice or limited GTM trigger.
- Keep `DEE_LOAD_SHEDDING_MODE=monitor` for the first traffic window unless a site-protection decision has already been approved.
- Watch client request rate, p95/p99, client error rate, rate-limit block rate, Meiro circuits, profile cache errors, and feedback delivery failures.
- Compare DEE decision outcomes with Meiro downstream profile updates.
- Confirm static fallbacks appear when DEE is unavailable or a request times out.
- Keep a human owner available for rules/messages/experiments during the first production window.

## Rollback

- Disable or roll back the GTM/CDN SDK tag for website-impacting issues.
- Roll back DEE Deployment to the previous image for runtime regressions.
- Restore previously published rule/message/experiment versions for decision asset regressions.
- Restore Meiro endpoint/token settings if feedback or profile enrichment breaks.
- Use managed Postgres point-in-time restore only for data corruption or accidental destructive migration.

## Launch Is Not Complete Until

- Expected peak and 2x peak traffic have passed staging or canary gates.
- Restore drill is documented with timestamps and owner.
- Alerts route to the right on-call channel and include runbook links.
- Customer-specific CORS, tokens, Meiro endpoints, and SDK placements are reviewed by both DEE and web owners.
- Post-launch metrics have been reviewed after at least one full business cycle.

# Production Readiness Roadmap

This roadmap tracks the hardening needed before DEE is used on high-volume public websites.

## Architecture Principle

DEE should stay a decisioning service. It should not own identity resolution, profile stitching, or full event warehousing. Those capabilities stay in Meiro/Pipes and its profile infrastructure. DEE consumes identifiers, profile attributes, segments, and context, then returns decision payloads and sends feedback events back to Meiro.

## Phase P1: Kubernetes Baseline

Status: implemented baseline.

- Package DEE as a stateless Kubernetes Deployment.
- Run `DEE_STORE_ADAPTER=postgres_native` in production.
- Provide a self-contained Postgres StatefulSet template for pilots and private-cluster installs.
- Provide a migration Job for native Postgres schema.
- Add readiness, liveness, startup probes, Service, HPA, and example Ingress.
- Keep SQLite for local/demo only.
- Add safe rolling update controls: topology spread, PodDisruptionBudget, preStop delay, and graceful shutdown.

## Phase P2: Production Database Operations

Status: partial.

- Add managed Postgres sizing guidance for decision/event/write-heavy workloads.
- Add live integration test profile for real Postgres in CI/staging. Status: `npm run postgres:smoke` implemented for staging/managed database validation.
- Add migration rollback and restore playbook. Status: documented in `docs/postgres-operations-runbook.md`; migration status check implemented with `npm run postgres:migrate -- --status`.
- Add Postgres connection-pool sizing guidance per DEE replica. Status: implemented.
- Add retention/partitioning guidance for `audit_log`, `client_events`, and `experiment_assignments`. Status: implemented baseline guidance.

## Phase P3: High-Traffic Runtime Controls

Status: partial.

- Add external cache option for shared decision/profile cache and rate-limit state. Status: implemented through `DEE_RUNTIME_STATE_ADAPTER=postgres` for native Postgres deployments.
- Add Kubernetes scaling controls for high-traffic replicas. Status: Deployment, HPA behavior, PDB, topology spread, and on-demand benchmark Job are included under `deploy/kubernetes`.
- Add circuit breakers for Meiro Profile API and feedback delivery. Status: per-replica breakers implemented for Profile API, feedback, and collector.
- Add explicit fail-open/fail-closed policies per decision type. Status: implemented through `cache_policy.dependency_failure_mode`.
- Add load-shedding response mode when Postgres or Meiro dependencies degrade. Status: implemented for browser decision endpoints with `monitor` and `shed` modes.
- Add benchmark profiles for 100, 500, and 1000+ rps. Status: implemented as `npm run bench:100`, `npm run bench:500`, and `npm run bench:1000`.

## Phase P4: Observability

Status: mostly implemented.

- `/v1/metrics`, `/v1/metrics/client-events`, request IDs, and runtime metrics exist.
- Add Prometheus-format metrics endpoint. Status: implemented at `/v1/metrics/prometheus`.
- Add dashboard examples for p95/p99 latency, error rate, cache hit rate, DB readiness, Meiro enrichment status, feedback queue status, and rule evaluation duration. Status: implemented as `deploy/grafana/dee-overview-dashboard.json` and documented in `docs/observability-runbook.md`.
- Add alert threshold recommendations. Status: documented in `docs/observability-runbook.md`; optional Prometheus Operator rules are available in `deploy/kubernetes/observability.yaml`; first-response guidance is documented in `docs/alert-response-runbook.md`.

## Phase P5: SDK Production Rollout

Status: partial.

- Document CDN/GTM deployment. Status: documented in `docs/dee-web-sdk/README.md`.
- Add SDK retry queue for client feedback with idempotency. Status: SDK queues transient feedback failures in local storage and retries with stable event IDs.
- Add stricter layout-shift and timeout defaults for high-traffic placements. Status: SDK request/event timeouts and static-fallback behavior are implemented.
- Add consent/bot/debug controls for production sites. Status: consent provider, bot suppression, debug query opt-in, and SPA/GTM `destroy()` cleanup are implemented.

## Phase P6: Security And Change Safety

Status: mostly implemented.

- DB-backed scoped tokens exist.
- Add token rotation runbook. Status: documented in `docs/security-change-safety-runbook.md`.
- Add production CORS review checklist. Status: documented in `docs/security-change-safety-runbook.md`.
- Add release approval checklist for rules, messages, experiments, and graph changes. Status: documented in `docs/security-change-safety-runbook.md`.
- Add staged rollout and rollback guidance for SDK and DEE app versions. Status: documented in `docs/security-change-safety-runbook.md`.

## Phase P7: Launch Validation

Status: documentation implemented; real environment validation still required.

- Add production launch checklist. Status: documented in `docs/production-launch-checklist.md`.
- Add repeatable launch preflight. Status: implemented as `npm run launch:preflight` for local production artifacts and optional live readiness/Prometheus checks.
- Import baseline Grafana dashboard in staging. Status: dashboard JSON available in `deploy/grafana/dee-overview-dashboard.json`; import must be validated in the target Grafana instance.
- Run managed Postgres smoke test. Status: command implemented as `npm run postgres:smoke`; must be run against the target staging database.
- Run benchmark gates at expected peak and 2x expected peak. Status: `bench:100`, `bench:500`, `bench:1000`, and Kubernetes benchmark Job exist; target-environment results are still required.
- Complete backup restore drill. Status: procedure documented in `docs/postgres-operations-runbook.md`; customer/platform-specific drill result is required.
- Complete real website SDK canary. Status: SDK controls are implemented; production origin, GTM/CDN, CORS, token, consent, and fallback behavior must be validated on the target website.

## Remaining External Validation

The codebase now contains the main production controls, but DEE should not be considered ready for a high-volume website until these have passed in the customer's staging or pre-production environment:

- Managed Postgres migration, smoke test, benchmark, and restore drill.
- Prometheus scrape, Grafana dashboard import, and alert routing with runbook links.
- Multi-replica Kubernetes rollout with `DEE_RUNTIME_STATE_ADAPTER=postgres`.
- Meiro Profile API, collector, feedback, and in-app precompute delivery tests with real tokens and schemas.
- Website SDK canary on the real origin with CORS, consent, bot policy, timeout, fallback, and feedback events verified.
- Decision asset review for critical rules: TTL, fallback, dependency failure mode, campaign grouping, and rollback owner.

Future optional hardening:

- OpenTelemetry traces across DEE, Meiro profile enrichment, and feedback delivery.
- Partitioned Postgres table overlays for very large audit/event tables.
- Customer-specific Grafana overlays with namespace, cluster, pod, and app variables.

## Next Product Workstream

After the production-readiness slice is complete, the next major workstream is UI simplification for marketing users and large object inventories. Track that work in `docs/marketing-ui-refactor-roadmap.md`.

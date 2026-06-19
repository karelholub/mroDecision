# Alert Response Runbook

Use this runbook with the optional Prometheus Operator rules in `deploy/kubernetes/observability.yaml`.

## First Response

1. Open the Grafana `Meiro DEE Overview` dashboard from `deploy/grafana/dee-overview-dashboard.json`.
2. Check `/v1/ready` on at least two replicas or through the load balancer.
3. Check recent deploys, rule/message/experiment publishes, schema syncs, and SDK rollouts.
4. If browser traffic is impacted, prefer restoring a known-good state over debugging live traffic.
5. Keep request IDs from logs, Meiro delivery diagnostics, and customer-facing incident notes together.

## DeeDatabaseNotReady

Meaning: at least one replica cannot prove the active store is ready.

First checks:

- `/v1/ready` for `database.ok`, `adapter`, migration status, and Postgres pool settings.
- Kubernetes pod events, restart count, and `dee-postgres-migrate` job status.
- Managed Postgres health, connection limits, certificate rotation, and network policies.

Mitigation:

- Stop rollout if it is in progress.
- Restore `DEE_DATABASE_URL`, credentials, or network policy if recently changed.
- Reduce HPA max replicas or `DEE_POSTGRES_POOL_MAX` if the database is refusing connections.
- Roll back the app if the readiness failure started with a release.

Escalate when all replicas are not ready, managed Postgres reports failover/degraded state, or migrations cannot complete.

## DeeRuntimeErrorRateHigh

Meaning: all HTTP routes are returning too many server-side errors.

First checks:

- Runtime status distribution and slow routes in `/v1/metrics`.
- App logs grouped by `x-request-id`.
- Recent app release, migrations, environment variable changes, or token changes.

Mitigation:

- Roll back the app release if errors are concentrated after deployment.
- Disable new decision assets if errors map to rule/message/experiment evaluation.
- Increase app replicas only if CPU saturation is the cause and Postgres has connection headroom.

## DeeClientErrorRateHigh

Meaning: browser/client endpoints are failing too often.

First checks:

- Client errors by action, token, origin, environment, and app in `/v1/metrics`.
- CORS failures in the browser console and CDN/Ingress logs.
- Rate-limit and load-shedding panels.
- Profile enrichment status in decision responses.

Mitigation:

- Roll back the SDK tag or disable the GTM tag if the issue is client-side.
- Restore CORS origin allow-list or client token constraints if recently changed.
- Switch high-risk rules to safe fallback outputs or dependency fail-open/fail-closed policy.

## DeeRuntimeP99High

Meaning: runtime p99 is above the launch threshold.

First checks:

- Postgres CPU, connection count, lock waits, query duration, and pool wait.
- Slow routes from `/v1/metrics`.
- Profile API circuit state and Meiro response latency.
- Rule complexity, branch count, and large payloads.

Mitigation:

- Enable or tighten CDN caching for static SDK assets.
- Keep `DEE_LOAD_SHEDDING_MODE=monitor` while diagnosing; switch to `shed` only when protecting the site is more important than serving decisions.
- Reduce expensive profile enrichment by sending required attributes in server/Pipes calls.
- Scale app replicas only if the database and Meiro dependencies are healthy.

## DeeLoadSheddingActive

Meaning: DEE sees pressure that would trigger load shedding.

First checks:

- `dee_load_shedding_active` labels for `mode` and `reason`.
- Runtime p95/p99, client error rate, profile errors, and Meiro circuit state.
- Planned load tests or traffic spikes.

Mitigation:

- In `monitor` mode, tune thresholds only after confirming traffic characteristics.
- In `shed` mode, confirm the site has graceful static fallbacks.
- If pressure is dependency-driven, use rule-level `dependency_failure_mode` before broad shedding.

## DeeLoadSheddingEnforced

Meaning: DEE returned `503 load_shed` for browser decision traffic.

First checks:

- Whether `DEE_LOAD_SHEDDING_MODE=shed` was intentional.
- Recent traffic spike, bot surge, load test, or Meiro dependency outage.
- Affected origins and tokens.

Mitigation:

- Confirm web placements show static fallback content.
- Reduce traffic at CDN/Ingress if bot or abuse-driven.
- Move back to `monitor` only if rejecting traffic is causing more harm than degraded decisions.

## DeeRuntimeStateNotShared

Meaning: runtime cache/rate-limit state is not shared through Postgres.

First checks:

- `/v1/ready` and Settings runtime metadata for `DEE_RUNTIME_STATE_ADAPTER`.
- Replica count and deployment environment.

Mitigation:

- For multi-replica production, set `DEE_RUNTIME_STATE_ADAPTER=postgres` with `DEE_STORE_ADAPTER=postgres_native`.
- For single-replica demos, document the exception and keep HPA max replicas at 1.

## DeeProfileCircuitOpen

Meaning: Profile API enrichment is circuit-open and decisions may evaluate with local payloads only.

First checks:

- Settings Meiro Profile API URL and profile API token.
- `/v1/meiro-deliveries` and profile cache diagnostics.
- Meiro Profile API availability and rate limits.
- Decision response diagnostics: `profile_cache.status`, missing attributes, and dependency-failure outputs.

Mitigation:

- Restore Profile API token/base URL if invalid.
- Increase profile cache TTL only if cached data is acceptable for the use case.
- Use `fail_closed` for sensitive eligibility and safe fallback outputs for marketing decisions.

## DeeFeedbackCircuitOpen

Meaning: feedback or collector delivery to Meiro is degraded.

First checks:

- Settings feedback endpoint, collector endpoint, source slug, and token.
- `/v1/meiro-deliveries` for latest error message and status code.
- Meiro collector availability and schema expectations.

Mitigation:

- Restore endpoint/token if changed.
- Pause noisy client placements only if delivery failures are causing downstream pressure.
- Keep decision serving online when possible; failed feedback should not normally block website rendering.

## DeeClientRateLimitPressure

Meaning: application rate limits are blocking more than the expected traffic share.

First checks:

- Blocked traffic by origin, token, endpoint action, and source IP.
- CDN/Ingress logs for bot or repeated requests.
- Recent SDK retry behavior or duplicate GTM tags.

Mitigation:

- Fix duplicate SDK/tag deployments before raising limits.
- Add CDN bot/rate controls for abusive origins.
- Raise token limits only for verified traffic and after checking app/Postgres headroom.

## Related Runbooks

- `docs/observability-runbook.md`
- `docs/postgres-operations-runbook.md`
- `docs/security-change-safety-runbook.md`
- `docs/production-launch-checklist.md`

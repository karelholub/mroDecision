# Security And Change Safety Runbook

Use this runbook for production DEE environments before rotating credentials, changing browser origins, publishing decision assets, or rolling out SDK/app versions.

## Token Rotation

DEE supports DB-backed scoped tokens. Prefer DB-backed tokens over bootstrap tokens for all long-lived access.

Recommended token types:

- `admin`: platform operators only.
- `viewer`: observability, dashboards, and read-only diagnostics.
- `evaluate`: trusted server-to-server callers.
- `client`: browser SDK tokens restricted by origins, environment, app id, and decision keys.

Rotation process:

1. Create a replacement token in Settings with the same or narrower scopes.
2. For client tokens, set:
   - allowed origins
   - environment label, for example `production`
   - app id, for example `main_web`
   - allowed decision keys where possible
3. Deploy the new token to the secret manager, GTM variable, CDN config, or server integration.
4. Verify traffic with `/v1/metrics`:
   - `client_traffic.by_token`
   - `client_traffic.by_origin`
   - `client_traffic.by_environment`
   - `client_traffic.by_app`
5. Revoke the old token after the new token has served stable traffic for one release window.
6. Keep `DEE_BOOTSTRAP_TOKENS_ENABLED=false` after at least one active DB-backed admin token exists.

Emergency rotation:

1. Create and deploy the replacement token.
2. Revoke the suspected token immediately.
3. Check `client_traffic.by_token` and logs for continued use.
4. Rotate any upstream GTM/CDN/server secrets that may have exposed the token.
5. Review allowed origins and decision-key scope before returning to normal operation.

## Production CORS Review

`DEE_CORS_ORIGINS` should list exact origins for production sites.

Acceptable examples:

```text
https://www.example.com
https://app.example.com
https://m.example.com
```

Avoid in production:

```text
*
https://*.example.com
http://www.example.com
```

Review checklist:

1. Every origin is HTTPS, except local development.
2. Every origin maps to a real website or app that should call DEE directly.
3. Client tokens also restrict origins, environment, app id, and decision keys.
4. Staging, QA, and production use separate tokens.
5. Ngrok or temporary preview origins are time-limited and removed after testing.
6. `/v1/client/rule-catalog` does not expose decisions outside the intended origin/token scope.
7. CORS changes are tested with the real website domain before going live.

## Decision Asset Release Checklist

Use this checklist before publishing rule sets, messages, experiments, graph flows, or decision stacks.

Pre-publish:

1. Validate schema warnings and missing attributes.
2. Preview affected rules, messages, surfaces, campaigns, and conflicts.
3. Check dependency failure behavior:
   - `evaluate` for normal marketing personalization
   - `fail_open` for low-risk fallback offers
   - `fail_closed` for eligibility, compliance, credit, or paid benefits
4. Confirm TTLs and cache scopes match the user journey.
5. Confirm message lifecycle and delivery policy:
   - surface
   - display frequency
   - dismiss policy
   - consent category
   - device and URL targeting
6. For experiments, confirm:
   - allocation sums to 100%
   - baseline exists
   - conversion goal and attribution window are set
   - holdout and bandit settings are intentional
7. Evaluate with at least one known test profile.
8. Confirm feedback events appear in Audit or Client Event Detail after SDK testing.

Publish:

1. Publish during a low-risk release window for large campaigns.
2. Watch Overview, Client Event Detail, Meiro deliveries, and Prometheus alerts.
3. Keep load shedding in `monitor` unless traffic and dependencies are already validated.

Rollback:

1. If only one rule is faulty, roll back that rule to the previous published version.
2. If a message is faulty, archive or replace the message and republish dependent rules.
3. If an experiment variant is faulty, set its allocation to `0`, freeze to a safe winner, or roll back the rule version.
4. If SDK rendering is faulty, disable the affected placement in the rule or restore static fallback through the website/GTM.
5. Confirm new client events show the rollback behavior.

## SDK Rollout Checklist

Before deploying the SDK to a high-traffic website:

1. Configure `DEE_CORS_ORIGINS` with exact production origins.
2. Use a client-scoped token restricted to the website origin and relevant decision keys.
3. Keep static fallback content in the page.
4. Set `requestTimeoutMs` and `eventTimeoutMs` to conservative values.
5. Enable `eventRetryQueue` for feedback resilience.
6. Wire `consentProvider` before enabling marketing or personalization messages.
7. Use `botPolicy: "skip_known"` for production.
8. Keep `debug: false`; use `?dee_debug=1` for short QA sessions.
9. Test:
   - first page load
   - SPA route change
   - consent denied
   - consent granted
   - bot/headless QA if applicable
   - network timeout fallback
   - impression, exposure, conversion, skipped, and survey events

Staged rollout:

1. Start on a staging domain with production-like CORS/token constraints.
2. Deploy to a low-traffic production page or a small percentage of traffic through GTM/CDN targeting.
3. Watch:
   - `dee_client_error_rate`
   - `dee_runtime_latency_p95_ms`
   - `dee_client_rate_limit_block_rate`
   - `dee_load_shedding_active`
   - client skipped reasons
   - Meiro feedback delivery status
4. Expand traffic only after events, rendering, and fallback behavior are stable.

SDK rollback:

1. Disable the GTM tag or revert the CDN asset version.
2. Leave static fallback markup in place.
3. If needed, set affected rules to ineligible/deferred or remove their surface targeting.
4. Confirm client traffic drops and no new SDK errors appear.

## DEE App Version Rollout

Before rollout:

1. Review migration SQL with `npm run postgres:migrate -- --print`.
2. Run `npm run postgres:migrate -- --status` against the target database.
3. Confirm backups or restore points exist.
4. Run staging smoke and benchmark gates.
5. Confirm Kubernetes HPA, PDB, runtime state, and metrics are configured.

Rollout:

1. Apply migration job or CI migration step.
2. Roll the Deployment.
3. Verify:
   - `/v1/ready`
   - `/v1/metrics/prometheus`
   - representative `/v1/client/evaluate`
   - representative SDK placement
   - Meiro feedback delivery

Rollback:

1. Use `kubectl rollout undo deployment/dee` for app regressions after additive migrations.
2. Use managed Postgres restore only when data/schema rollback is required.
3. Pause Pipes exports and public client traffic before database restore.
4. Capture incident notes listed in `docs/postgres-operations-runbook.md`.

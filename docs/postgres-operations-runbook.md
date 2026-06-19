# Postgres Operations Runbook

Use this runbook for production DEE deployments that run `DEE_STORE_ADAPTER=postgres_native`.

## Release Checklist

Before deploying a new DEE image:

1. Review the migration SQL:

   ```bash
   npm run postgres:migrate -- --print
   ```

2. Check the target database status:

   ```bash
   DEE_DATABASE_URL=postgres://user:pass@host:5432/db npm run postgres:migrate -- --status
   ```

3. Confirm a recent database backup or managed restore point exists.
4. Apply the migration in staging:

   ```bash
   DEE_DATABASE_URL=postgres://user:pass@staging-host:5432/db npm run postgres:migrate -- --apply
   DEE_DATABASE_URL=postgres://user:pass@staging-host:5432/db npm run postgres:smoke
   ```

5. Run the staging benchmark from a network location close to the service.
6. Apply the production migration through the Kubernetes Job or CI/CD release step.
7. Roll out the new DEE Deployment after the migration succeeds.
8. Verify:
   - `/v1/ready` reports `postgres_native` and `production_ready`.
   - `/v1/metrics/prometheus` returns `dee_database_ready == 1`.
   - `npm run postgres:smoke` passes against the production database if permitted by change policy.

## Migration Strategy

DEE native Postgres migrations are designed to be idempotent and forward-compatible. The app currently applies the same schema contract during startup as the migration job. For production, prefer an explicit migration step before rolling app pods, because it gives platform teams a visible release gate and cleaner failure handling.

Recommended sequence:

```bash
kubectl apply -k deploy/kubernetes
kubectl -n meiro-dee wait --for=condition=complete job/dee-postgres-migrate --timeout=120s
kubectl -n meiro-dee rollout status deployment/dee
```

For managed Postgres, keep provider automated backups enabled and create a manual restore point before schema-affecting releases.

## Application Rollback

Use application rollback when the database migration succeeded but the new app image has a runtime regression.

1. Stop new traffic if the issue is severe: route at CDN/Ingress or scale down public paths.
2. Roll back the Deployment image:

   ```bash
   kubectl -n meiro-dee rollout undo deployment/dee
   kubectl -n meiro-dee rollout status deployment/dee
   ```

3. Check readiness and metrics:

   ```bash
   curl -fsS https://dee.example.com/v1/ready
   curl -fsS -H "Authorization: Bearer $DEE_VIEWER_TOKEN" https://dee.example.com/v1/metrics/prometheus
   ```

4. Verify key decisions and client surfaces from staging scripts or the sample website.

This is the preferred rollback path for additive migrations.

## Database Restore

Use database restore when data is corrupted or a migration must be reversed and application rollback is not enough.

1. Freeze writes:
   - Pause Pipes batch exports to DEE.
   - Disable or route away public `/v1/client/*` traffic.
   - Scale DEE to zero or to a maintenance-only instance.

2. Restore from managed Postgres backup, point-in-time recovery, or volume snapshot.

3. Check migration state:

   ```bash
   DEE_DATABASE_URL=postgres://user:pass@host:5432/db npm run postgres:migrate -- --status
   ```

4. Re-apply current schema only if status is behind:

   ```bash
   DEE_DATABASE_URL=postgres://user:pass@host:5432/db npm run postgres:migrate -- --apply
   ```

5. Run smoke validation:

   ```bash
   DEE_DATABASE_URL=postgres://user:pass@host:5432/db npm run postgres:smoke
   ```

6. Restart DEE replicas and verify `/v1/ready`.
7. Resume Pipes exports and public traffic.

## Backup Validation

Backups are only useful if restore is rehearsed. At least once per release cycle:

1. Restore production backup into an isolated staging database.
2. Run:

   ```bash
   DEE_DATABASE_URL=postgres://user:pass@staging-restore:5432/db npm run postgres:migrate -- --status
   DEE_DATABASE_URL=postgres://user:pass@staging-restore:5432/db npm run postgres:smoke
   ```

3. Start a staging DEE replica against the restored database.
4. Evaluate representative rules, experiments, in-app messages, and decision stacks.
5. Confirm audit, client events, campaigns, and precompute history load in the UI.

## Incident Notes

During an incident, capture:

- DEE image tag and Git commit.
- `npm run postgres:migrate -- --status` output.
- `/v1/ready` output.
- `/v1/metrics/prometheus` snapshot.
- Last successful migration Job logs.
- Postgres backup/restore point used.
- Whether Meiro/Pipes exports were paused and resumed.

Keep DEE as a decisioning service during recovery. Identity resolution and long-term profile truth remain in Meiro/Pipes; restoring DEE should focus on rules, messages, experiments, operational history, and decision feedback continuity.

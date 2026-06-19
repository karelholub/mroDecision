# Meiro DEE Kubernetes Package

This package is a plain Kustomize deployment for production-like Kubernetes environments.

## Apply

```bash
kubectl apply -k deploy/kubernetes
kubectl -n meiro-dee wait --for=condition=complete job/dee-postgres-migrate --timeout=120s
kubectl -n meiro-dee rollout status deployment/dee
```

Replace `secret.example.yaml`, image names, hostnames, CORS origins, and Postgres settings before using this package outside a pilot environment.

## Scaling Defaults

- `Deployment` starts with `3` replicas.
- `HorizontalPodAutoscaler` allows `3` to `12` replicas.
- `PodDisruptionBudget` keeps at least `2` replicas available during voluntary disruption.
- `topologySpreadConstraints` spread pods across nodes and zones when capacity allows.
- `DEE_RUNTIME_STATE_ADAPTER=postgres` is enabled by default so decision cache, profile cache, and rate-limit buckets are shared across replicas.

## Postgres Pool Sizing

Each DEE pod owns its own Postgres pool.

```text
maximum app connections = HPA maxReplicas * DEE_POSTGRES_POOL_MAX
```

The default Kubernetes template allows `12` replicas and `DEE_POSTGRES_POOL_MAX=10`, so reserve at least `120` application connections, plus headroom for:

- migration jobs
- admin sessions
- monitoring
- backups
- failover/maintenance sessions

If the managed Postgres plan cannot support that connection budget, lower either `maxReplicas` or `DEE_POSTGRES_POOL_MAX`, or place a pooler such as PgBouncer in front of Postgres.

## Manual Benchmark Job

`benchmark-job.yaml` is not included in `kustomization.yaml` because it should run only on demand.

Create a token secret with a client/evaluate-capable token:

```bash
kubectl -n meiro-dee create secret generic dee-benchmark-token \
  --from-literal=token='replace-with-client-or-admin-token'
```

Run a 100 RPS staging gate:

```bash
kubectl -n meiro-dee apply -f deploy/kubernetes/benchmark-job.yaml
kubectl -n meiro-dee logs -f job/dee-benchmark-100rps
kubectl -n meiro-dee delete job dee-benchmark-100rps
```

For 500 or 1000 RPS gates, copy the job and set `DEE_BENCH_PROFILE` to `500rps` or `1000rps`. Run these only against staging or during an approved production load window.

## Optional Prometheus Operator Resources

`observability.yaml` and `metrics-secret.example.yaml` are not included in `kustomization.yaml` because they require Prometheus Operator CRDs.

Create a DB-backed token with `viewer` scope, then create the metrics token secret:

```bash
kubectl -n meiro-dee create secret generic dee-metrics-token \
  --from-literal=token='replace-with-viewer-token'
```

Apply the monitoring resources only in clusters with Prometheus Operator installed:

```bash
kubectl -n meiro-dee apply -f deploy/kubernetes/observability.yaml
```

The `ServiceMonitor` scrapes `/v1/metrics/prometheus` every 30 seconds. The `PrometheusRule` covers database readiness, runtime/client error rate, p99 latency, load shedding, shared runtime state, Meiro circuits, and client rate-limit pressure.

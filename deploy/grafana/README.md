# Grafana Dashboards

`dee-overview-dashboard.json` is an importable Grafana dashboard for the Prometheus metrics exposed by `/v1/metrics/prometheus`.

Import checklist:

1. Configure Prometheus to scrape DEE with a viewer/admin token.
2. In Grafana, import `deploy/grafana/dee-overview-dashboard.json`.
3. Select the Prometheus datasource when prompted.
4. Verify the top-row status panels show database readiness, client error rate, runtime p99, load shedding, rate-limit pressure, and Meiro circuit state.
5. Keep the dashboard in source control and promote changes through the same review path as Kubernetes alert rules.

The dashboard is intentionally generic. Customer overlays can add namespace, cluster, pod, or environment template variables if their Prometheus labels include those dimensions.

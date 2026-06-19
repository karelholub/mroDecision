#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const jsonOnly = args.has("--json");
const root = process.cwd();
const checks = [];

if (args.has("--help")) {
  console.log([
    "Usage:",
    "  npm run launch:preflight",
    "  npm run launch:preflight -- --json",
    "  DEE_PREFLIGHT_URL=https://staging-dee.example.com DEE_PREFLIGHT_TOKEN=... npm run launch:preflight",
    "",
    "Validates local production artifacts and, when DEE_PREFLIGHT_URL is set,",
    "checks a running DEE readiness and Prometheus metrics endpoint."
  ].join("\n"));
  process.exit(0);
}

checkPackageScripts();
checkRequiredFiles();
checkGrafanaDashboard();
checkKubernetesManifests();
checkDocs();
await checkLiveService();

const summary = {
  ok: checks.every((check) => check.status !== "fail"),
  generated_at: new Date().toISOString(),
  checks
};

if (jsonOnly) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  printHuman(summary);
}

if (!summary.ok) process.exitCode = 1;

function checkPackageScripts() {
  const pkg = readJson("package.json");
  const scripts = pkg?.scripts || {};
  requiredScript("check", scripts);
  requiredScript("test", scripts);
  requiredScript("postgres:smoke", scripts);
  requiredScript("bench:100", scripts);
  requiredScript("bench:500", scripts);
  requiredScript("bench:1000", scripts);
}

function checkRequiredFiles() {
  [
    "deploy/kubernetes/dee.yaml",
    "deploy/kubernetes/configmap.yaml",
    "deploy/kubernetes/migration-job.yaml",
    "deploy/kubernetes/observability.yaml",
    "deploy/grafana/dee-overview-dashboard.json",
    "docs/production-launch-checklist.md",
    "docs/alert-response-runbook.md",
    "docs/observability-runbook.md",
    "docs/postgres-operations-runbook.md",
    "docs/security-change-safety-runbook.md"
  ].forEach((file) => {
    record(fs.existsSync(resolve(file)) ? "pass" : "fail", `file:${file}`, fs.existsSync(resolve(file)) ? "present" : "missing");
  });
}

function checkGrafanaDashboard() {
  const dashboard = readJson("deploy/grafana/dee-overview-dashboard.json");
  if (!dashboard) return;
  const panelTitles = new Set((dashboard.panels || []).map((panel) => panel.title));
  [
    "Database Ready",
    "Client Error Rate",
    "Runtime p99",
    "Load Shedding Active",
    "Rate Limit Block Rate",
    "Meiro Circuit Open",
    "Request Rate",
    "Latency",
    "Decision Outcomes",
    "Top Rules",
    "Cache Hit Rates",
    "Load Shedding Decisions",
    "Meiro Dependency Circuits",
    "Client Events",
    "In-App Precompute"
  ].forEach((title) => {
    record(panelTitles.has(title) ? "pass" : "fail", `grafana:${title}`, panelTitles.has(title) ? "panel present" : "panel missing");
  });
  record(dashboard.uid === "meiro-dee-overview" ? "pass" : "fail", "grafana:uid", dashboard.uid || "missing uid");
}

function checkKubernetesManifests() {
  const dee = readText("deploy/kubernetes/dee.yaml");
  const configmap = readText("deploy/kubernetes/configmap.yaml");
  const observability = readText("deploy/kubernetes/observability.yaml");

  if (dee) {
    [
      "kind: Deployment",
      "kind: Service",
      "kind: HorizontalPodAutoscaler",
      "kind: PodDisruptionBudget",
      "readinessProbe:",
      "livenessProbe:",
      "startupProbe:",
      "topologySpreadConstraints:",
      "preStop:"
    ].forEach((needle) => {
      record(dee.includes(needle) ? "pass" : "fail", `k8s:dee:${needle.replace(/:$/, "")}`, dee.includes(needle) ? "configured" : "missing");
    });
  }

  if (configmap) {
    record(
      /DEE_STORE_ADAPTER:\s*"?postgres_native"?/.test(configmap),
      "k8s:config:postgres_native",
      "DEE_STORE_ADAPTER should be postgres_native"
    );
    record(
      /DEE_RUNTIME_STATE_ADAPTER:\s*"?postgres"?/.test(configmap),
      "k8s:config:runtime_state_postgres",
      "DEE_RUNTIME_STATE_ADAPTER should be postgres"
    );
    record(
      /DEE_BOOTSTRAP_TOKENS_ENABLED:\s*"?false"?/.test(configmap),
      "k8s:config:bootstrap_disabled",
      "bootstrap tokens should be disabled"
    );
  }

  if (observability) {
    const alerts = [...observability.matchAll(/-\s+alert:\s+([A-Za-z0-9]+)/g)].map((match) => match[1]);
    const runbooks = [...observability.matchAll(/runbook_url:/g)];
    record(alerts.length >= 10 ? "pass" : "fail", "k8s:alerts:count", `${alerts.length} alerts`);
    record(
      runbooks.length >= alerts.length && alerts.length > 0 ? "pass" : "fail",
      "k8s:alerts:runbook_urls",
      `${runbooks.length} runbook URLs for ${alerts.length} alerts`
    );
  }
}

function checkDocs() {
  const launch = readText("docs/production-launch-checklist.md");
  if (launch) {
    [
      "Pre-Launch Configuration",
      "Staging Gates",
      "Go-Live",
      "Rollback",
      "Launch Is Not Complete Until"
    ].forEach((heading) => {
      record(launch.includes(`## ${heading}`) ? "pass" : "fail", `docs:launch:${heading}`, launch.includes(`## ${heading}`) ? "present" : "missing");
    });
  }

  const alertRunbook = readText("docs/alert-response-runbook.md");
  if (alertRunbook) {
    [
      "DeeDatabaseNotReady",
      "DeeRuntimeErrorRateHigh",
      "DeeClientErrorRateHigh",
      "DeeRuntimeP99High",
      "DeeLoadSheddingActive",
      "DeeLoadSheddingEnforced",
      "DeeRuntimeStateNotShared",
      "DeeProfileCircuitOpen",
      "DeeFeedbackCircuitOpen",
      "DeeClientRateLimitPressure"
    ].forEach((alert) => {
      record(alertRunbook.includes(`## ${alert}`) ? "pass" : "fail", `docs:alert:${alert}`, alertRunbook.includes(`## ${alert}`) ? "present" : "missing");
    });
  }
}

async function checkLiveService() {
  const baseUrl = normalizeBaseUrl(process.env.DEE_PREFLIGHT_URL);
  if (!baseUrl) {
    record("warn", "live:service", "skipped; set DEE_PREFLIGHT_URL to check a running deployment");
    return;
  }

  const token = process.env.DEE_PREFLIGHT_TOKEN || "";
  const ready = await fetchJson(`${baseUrl}/v1/ready`, token);
  if (!ready.ok) {
    record("fail", "live:ready", ready.error);
    return;
  }
  const readyBody = ready.body || {};
  record(readyBody.ok === true ? "pass" : "fail", "live:ready:ok", JSON.stringify({ ok: readyBody.ok, adapter: readyBody.adapter || readyBody.database?.adapter || null }));

  const metrics = await fetchText(`${baseUrl}/v1/metrics/prometheus`, token);
  if (!metrics.ok) {
    record("fail", "live:metrics", metrics.error);
    return;
  }
  [
    "dee_database_ready",
    "dee_runtime_latency_p95_ms",
    "dee_runtime_latency_p99_ms",
    "dee_client_error_rate",
    "dee_load_shedding_active",
    "dee_runtime_state_postgres",
    "dee_meiro_circuit_open"
  ].forEach((metric) => {
    record(metrics.body.includes(metric) ? "pass" : "fail", `live:metric:${metric}`, metrics.body.includes(metric) ? "present" : "missing");
  });
}

async function fetchJson(url, token) {
  const response = await fetchWithToken(url, token);
  if (!response.ok) return response;
  try {
    return { ok: true, body: JSON.parse(response.body) };
  } catch (error) {
    return { ok: false, error: `invalid JSON from ${url}: ${error.message}` };
  }
}

async function fetchText(url, token) {
  return fetchWithToken(url, token);
}

async function fetchWithToken(url, token) {
  try {
    const response = await fetch(url, {
      headers: token ? { authorization: `Bearer ${token}` } : {}
    });
    const body = await response.text();
    if (!response.ok) return { ok: false, error: `${url} returned ${response.status}: ${body.slice(0, 200)}` };
    return { ok: true, body };
  } catch (error) {
    return { ok: false, error: `${url} failed: ${error.message}` };
  }
}

function requiredScript(name, scripts) {
  record(scripts[name] ? "pass" : "fail", `package:script:${name}`, scripts[name] || "missing");
}

function readJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch (error) {
    record("fail", `json:${file}`, error.message);
    return null;
  }
}

function readText(file) {
  try {
    return fs.readFileSync(resolve(file), "utf8");
  } catch (error) {
    record("fail", `file:${file}`, error.message);
    return "";
  }
}

function resolve(file) {
  return path.join(root, file);
}

function record(statusOrCondition, id, detail) {
  const status = typeof statusOrCondition === "boolean" ? (statusOrCondition ? "pass" : "fail") : statusOrCondition;
  checks.push({ id, status, detail });
}

function normalizeBaseUrl(value) {
  if (!value) return "";
  return String(value).replace(/\/+$/, "");
}

function printHuman(summary) {
  for (const status of ["fail", "warn", "pass"]) {
    const group = summary.checks.filter((check) => check.status === status);
    if (!group.length) continue;
    console.log(`\n${status.toUpperCase()} (${group.length})`);
    for (const check of group) {
      console.log(`- ${check.id}: ${check.detail}`);
    }
  }
  console.log(`\nLaunch preflight ${summary.ok ? "passed" : "failed"} with ${summary.checks.length} checks.`);
}

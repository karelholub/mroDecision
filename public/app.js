const tokenInput = document.querySelector("#token");
const evalInput = document.querySelector("#eval-input");
const evalOutput = document.querySelector("#eval-output");
const evalTrace = document.querySelector("#eval-trace");
const evalSummary = document.querySelector("#eval-summary");
const evalOutputSummary = document.querySelector("#eval-output-summary");
const evalEndpointLabel = document.querySelector("#eval-endpoint-label");
const evalAuditLabel = document.querySelector("#eval-audit-label");
const evalPayloadModal = document.querySelector("#eval-payload-modal");
const evalValidation = document.querySelector("#eval-validation");
const evalSavedProfile = document.querySelector("#eval-saved-profile");
const editorOutput = document.querySelector("#rule-editor-output");
const branchEditor = document.querySelector("#branch-editor");
const ruleGraph = document.querySelector("#rule-graph");
const graphEditor = document.querySelector("#graph-editor");
const graphNodeEditor = document.querySelector("#graph-node-editor");
const lookupOutput = document.querySelector("#lookup-output");
const lookupDetailModal = document.querySelector("#lookup-detail-modal");
const messageOutput = document.querySelector("#message-output");
const messagePreview = document.querySelector("#message-preview");
const messageDetailModal = document.querySelector("#message-detail-modal");
const messageInspectorSummary = document.querySelector("#message-inspector-summary");
const lookupInspectorSummary = document.querySelector("#lookup-inspector-summary");
const lookupHelpTable = document.querySelector("#lookup-help-table");
const lookupHelpKey = document.querySelector("#lookup-help-key");
const lookupHelpExpression = document.querySelector("#lookup-help-expression");
const referenceGrid = document.querySelector("#reference-grid");
const auditDetail = document.querySelector("#audit-detail");
const auditDetailSummary = document.querySelector("#audit-detail-summary");
const auditCount = document.querySelector("#audit-count");
const auditRange = document.querySelector("#audit-range");
const auditInsights = document.querySelector("#audit-insights");
const versionList = document.querySelector("#version-list");
const lookupVersionList = document.querySelector("#lookup-version-list");
const settingsOutput = document.querySelector("#settings-output");
const configExportOutput = document.querySelector("#config-export-output");
const configExportSummary = document.querySelector("#config-export-summary");
const configImportInput = document.querySelector("#config-import-input");
const configImportOutput = document.querySelector("#config-import-output");
const configImportSummary = document.querySelector("#config-import-summary");
const tokenOutput = document.querySelector("#token-output");
const schemaOutput = document.querySelector("#schema-output");
const settingsHealthSummary = document.querySelector("#settings-health-summary");
const integrationTemplate = document.querySelector("#integration-template");
const integrationResponse = document.querySelector("#integration-response");
const meiroTestOutput = document.querySelector("#meiro-test-output");
const meiroDeliveryStatus = document.querySelector("#meiro-delivery-status");
const schemaImportDiagnostics = document.querySelector("#schema-import-diagnostics");
const conditionBlockList = document.querySelector("#condition-block-list");
const conditionBlockOutput = document.querySelector("#condition-block-output");
const metricCards = document.querySelector("#metric-cards");
const ruleDetailPanel = document.querySelector("#metrics-rule-detail");
const clientEventsPanel = document.querySelector("#metrics-client-events");
const requestTrendPanel = document.querySelector("#metrics-request-trend");
const overviewServiceFooter = document.querySelector("#overview-service-footer");
const overviewRuleDetailModal = document.querySelector("#overview-rule-detail-modal");
const experimentKpis = document.querySelector("#experiment-kpis");
const experimentList = document.querySelector("#experiment-list");
const experimentDetail = document.querySelector("#experiment-detail");
const topbarTitle = document.querySelector("#topbar-title");
const topbarSubtitle = document.querySelector("#topbar-subtitle");
const topbarEnv = document.querySelector("#topbar-env");
const topbarHealth = document.querySelector("#topbar-health");
const ruleInspectorSummary = document.querySelector("#rule-inspector-summary");
const inspectorKey = document.querySelector("#inspector-key");
const inspectorSurface = document.querySelector("#inspector-surface");
const inspectorCache = document.querySelector("#inspector-cache");
const inspectorFallback = document.querySelector("#inspector-fallback");
const inspectorBranches = document.querySelector("#inspector-branches");
const inspectorNodes = document.querySelector("#inspector-nodes");
const inspectorMode = document.querySelector("#inspector-mode");
const experimentPanel = document.querySelector("#experiment-panel");
const experimentSummary = document.querySelector("#experiment-summary");
const ruleDetailModal = document.querySelector("#rule-detail-modal");
const ruleBuilderModal = document.querySelector("#rule-builder-modal");
const publishConfirmModal = document.querySelector("#publish-confirm-modal");
const publishConfirmSummary = document.querySelector("#publish-confirm-summary");
const publishConfirmDiff = document.querySelector("#publish-confirm-diff");
const publishConfirmValidation = document.querySelector("#publish-confirm-validation");
const logicSummaryTitle = document.querySelector("#logic-summary-title");
const logicSummaryMeta = document.querySelector("#logic-summary-meta");
const logicModalSubtitle = document.querySelector("#logic-modal-subtitle");
let selectedRuleKey = null;
let selectedLookupId = null;
let selectedMessageId = null;
let selectedPublishedDefinition = null;
let selectedPublishedMetadata = null;
let builderBranches = [];
let graphBuilder = { entry: "input", nodes: [] };
let cachedRuleSets = [];
let cachedLookupTables = [];
let cachedMessages = [];
let cachedExperiments = [];
let cachedSettings = {};
let cachedSchema = [];
let cachedEvaluationProfiles = [];
let cachedConditionBlocks = [];
let cachedConfigBundle = null;
let conditionBlocksLoaded = false;
let selectedConditionBlockId = null;
const savedProfileStorageKey = "meiro-dee-evaluate-profiles";
const defaultConditionBlockTemplates = [
  {
    id: "high_intent",
    name: "High intent",
    conditions: [
      { source: "attribute", key: "lead_score", operator: "greater_than_or_equal", value: "70" },
      { source: "attribute", key: "web_engagement_score", operator: "greater_than_or_equal", value: "60" }
    ]
  },
  {
    id: "credit_safe",
    name: "Credit safe",
    conditions: [
      { source: "attribute", key: "outstanding_balance_tier", operator: "not_in", value: "high, critical" },
      { source: "attribute", key: "late_payments_count_12m", operator: "less_than_or_equal", value: "1" }
    ]
  },
  {
    id: "retention_risk",
    name: "Retention risk",
    conditions: [
      { source: "attribute", key: "churn_risk_score", operator: "greater_than_or_equal", value: "65" }
    ]
  },
  {
    id: "surface_match",
    name: "Surface matches rule",
    conditions: [
      { source: "context", key: "surface", operator: "equals", value: "" }
    ]
  },
  {
    id: "known_profile",
    name: "Known profile",
    conditions: [
      { source: "attribute", key: "customer_lifetime_value", operator: "is_not_blank", value: "" }
    ]
  }
];

document.querySelectorAll("nav button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("nav button, .view").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.body.dataset.currentView = button.dataset.view;
    const view = document.querySelector(`#${button.dataset.view}`);
    view.classList.add("active");
    updateTopbarForView(view);
    if (button.dataset.view === "overview") loadMetrics();
    if (button.dataset.view === "experiments") loadExperiments();
  });
});

document.body.dataset.currentView = document.querySelector("nav button.active")?.dataset.view || "overview";

document.querySelectorAll("[data-settings-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-settings-tab], [data-settings-panel]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`[data-settings-panel="${button.dataset.settingsTab}"]`)?.classList.add("active");
  });
});

document.querySelectorAll("[data-rule-drawer-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-rule-drawer-tab], [data-rule-drawer-panel]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`[data-rule-drawer-panel="${button.dataset.ruleDrawerTab}"]`)?.classList.add("active");
  });
});

document.querySelectorAll("[data-message-drawer-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-message-drawer-tab], [data-message-drawer-panel]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`[data-message-drawer-panel="${button.dataset.messageDrawerTab}"]`)?.classList.add("active");
  });
});

document.querySelectorAll("[data-lookup-drawer-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-lookup-drawer-tab], [data-lookup-drawer-panel]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`[data-lookup-drawer-panel="${button.dataset.lookupDrawerTab}"]`)?.classList.add("active");
  });
});

document.querySelector("#refresh-metrics").addEventListener("click", loadMetrics);
document.querySelector("#refresh-experiments")?.addEventListener("click", loadExperiments);
document.querySelector("#export-experiments-csv")?.addEventListener("click", exportExperimentsCsv);
document.querySelector("#refresh-rules").addEventListener("click", loadRules);
document.querySelector("#rule-filter-search").addEventListener("input", renderRuleList);
document.querySelector("#rule-filter-status").addEventListener("change", renderRuleList);
document.querySelector("#rule-filter-type").addEventListener("change", renderRuleList);
document.querySelector("#rule-filter-tag").addEventListener("input", renderRuleList);
document.querySelector("#refresh-audit").addEventListener("click", loadAudit);
document.querySelector("#clear-audit-filters").addEventListener("click", clearAuditFilters);
document.querySelector("#refresh-lookups").addEventListener("click", loadLookups);
document.querySelector("#refresh-messages").addEventListener("click", loadMessages);
document.querySelector("#export-lookup-csv").addEventListener("click", exportLookupCsv);
document.querySelector("#refresh-settings").addEventListener("click", loadSettings);
document.querySelector("#test-meiro-profile").addEventListener("click", () => testMeiroConnection("profile"));
document.querySelector("#test-meiro-collector").addEventListener("click", () => testMeiroConnection("collector"));
document.querySelector("#test-meiro-feedback").addEventListener("click", () => testMeiroConnection("feedback"));
document.querySelector("#refresh-meiro-deliveries").addEventListener("click", loadMeiroDeliveries);
document.querySelector("#refresh-integration").addEventListener("click", loadIntegration);
document.querySelector("#export-audit-csv").addEventListener("click", exportAuditCsv);
document.querySelector("#import-schema").addEventListener("click", importSchema);
document.querySelector("#refresh-schema").addEventListener("click", loadSchema);
document.querySelector("#sync-schema").addEventListener("click", syncSchemaFromMeiro);
document.querySelector("#sync-meiro-metadata").addEventListener("click", syncMeiroMetadata);
document.querySelector("#new-condition-block").addEventListener("click", newConditionBlock);
document.querySelector("#save-condition-block").addEventListener("click", saveConditionBlock);
document.querySelector("#delete-condition-block").addEventListener("click", deleteConditionBlock);
document.querySelector("#run-eval").addEventListener("click", runEvaluate);
document.querySelector("#run-eval-secondary").addEventListener("click", runEvaluate);
document.querySelector("#load-preset").addEventListener("click", loadEvaluatePreset);
document.querySelector("#load-preset-secondary").addEventListener("click", loadEvaluatePreset);
document.querySelector("#open-eval-payload").addEventListener("click", openEvalPayload);
document.querySelector("#close-eval-payload").addEventListener("click", closeEvalPayload);
document.querySelector("#save-eval-profile").addEventListener("click", saveEvaluateProfile);
document.querySelector("#delete-eval-profile").addEventListener("click", deleteEvaluateProfile);
document.querySelector("#compare-eval").addEventListener("click", compareEvaluateVersions);
document.querySelector("#eval-saved-profile").addEventListener("change", loadSavedEvaluateProfile);
document.querySelector("#eval-mode").addEventListener("change", () => {
  renderEvaluateModeLabels();
  renderEvaluateValidation();
});
document.querySelector("#eval-rule-key").addEventListener("change", loadEvaluatePresetForSelectedRule);
document.querySelector("#eval-profile-key").addEventListener("input", () => {
  const body = readEvaluateInput();
  body.profile_key = document.querySelector("#eval-profile-key").value.trim() || body.profile_key;
  evalInput.value = JSON.stringify(body, null, 2);
  renderEvaluateValidation();
});
evalInput.addEventListener("input", () => renderEvaluateValidation());
document.querySelector("#new-rule").addEventListener("click", newRule);
document.querySelector("#new-lookup").addEventListener("click", newLookup);
document.querySelector("#new-message").addEventListener("click", newMessage);
document.querySelector("#close-lookup-detail").addEventListener("click", closeLookupDetail);
document.querySelector("#close-message-detail").addEventListener("click", closeMessageDetail);
document.querySelector("#cancel-message-detail").addEventListener("click", closeMessageDetail);
document.querySelector("#close-overview-rule-detail")?.addEventListener("click", closeOverviewRuleDetail);
document.querySelector("#export-config")?.addEventListener("click", exportConfig);
document.querySelector("#download-config")?.addEventListener("click", downloadConfig);
document.querySelector("#preview-config-import")?.addEventListener("click", previewConfigImport);
document.querySelector("#import-config")?.addEventListener("click", importConfig);
document.querySelector("#sync-json").addEventListener("click", syncJsonFromBuilder);
document.querySelector("#sync-json-modal").addEventListener("click", syncJsonFromBuilder);
document.querySelector("#open-rule-builder").addEventListener("click", openRuleBuilder);
document.querySelector("#close-rule-detail").addEventListener("click", closeRuleDetail);
document.querySelector("#close-rule-builder").addEventListener("click", closeRuleBuilder);
document.querySelector("#done-rule-builder").addEventListener("click", () => {
  syncJsonFromBuilder();
  closeRuleBuilder();
});
document.querySelector("#builder-mode").addEventListener("change", switchBuilderMode);
document.querySelector("#add-branch").addEventListener("click", () => {
  builderBranches.push(newBranch(builderBranches.length + 1));
  renderBranchEditor();
  syncJsonFromBuilder();
});
document.querySelector("#add-graph-node").addEventListener("click", addGraphNode);
document.querySelector("#create-graph-template").addEventListener("click", () => {
  graphBuilder = starterGraphBuilder();
  renderGraphBuilder();
  syncJsonFromBuilder();
});
document.querySelector("#reset-graph-layout").addEventListener("click", () => {
  autoLayoutGraph(true);
  renderGraphBuilder();
  syncJsonFromBuilder();
});
document.querySelector("#graph-entry").addEventListener("input", () => {
  graphBuilder.entry = document.querySelector("#graph-entry").value.trim();
  renderRuleGraph();
  syncJsonFromBuilder();
});
document.querySelector("#publish-rule").addEventListener("click", publishSelectedRule);
document.querySelector("#cancel-publish-rule").addEventListener("click", closePublishConfirm);
document.querySelector("#confirm-publish-rule").addEventListener("click", confirmPublishSelectedRule);
document.querySelector("#rule-editor").addEventListener("submit", saveDraft);
document.querySelector("#rule-draft").addEventListener("change", syncBuilderFromJson);
["#rule-name", "#rule-key", "#rule-type", "#rule-priority", "#rule-surface", "#rule-client-ttl", "#rule-cache-scope", "#rule-description"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", renderRuleInspector);
  document.querySelector(selector).addEventListener("change", renderRuleInspector);
});
["#experiment-status", "#experiment-unit", "#experiment-variants"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", renderRuleInspector);
  document.querySelector(selector).addEventListener("change", renderRuleInspector);
});
document.querySelector("#experiment-launch").addEventListener("click", () => setExperimentStatus("running"));
document.querySelector("#experiment-pause").addEventListener("click", () => setExperimentStatus("paused"));
document.querySelector("#fallback-result").addEventListener("input", syncJsonFromBuilder);
document.querySelector("#fallback-outputs").addEventListener("change", syncJsonFromBuilder);
document.querySelector("#lookup-editor").addEventListener("submit", saveLookup);
document.querySelector("#message-editor").addEventListener("submit", saveMessage);
document.querySelector("#sync-message-json").addEventListener("click", syncMessageJsonFromPreview);
document.querySelector("#format-message-json").addEventListener("click", formatActiveMessageJson);
[
  "#message-name",
  "#message-surface",
  "#message-status",
  "#message-template-type",
  "#message-placement",
  "#message-preview-title",
  "#message-preview-body",
  "#message-preview-footer",
  "#message-preview-image",
  "#message-primary-cta-label",
  "#message-primary-cta-url",
  "#message-secondary-cta-label",
  "#message-secondary-cta-url",
  "#message-starts-at",
  "#message-expires-at",
  "#message-priority",
  "#message-frequency-ttl"
].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", renderMessagePreview);
  document.querySelector(selector).addEventListener("change", renderMessagePreview);
});
document.querySelectorAll("[data-message-preview-device]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-message-preview-device]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    messagePreview?.setAttribute("data-device", button.dataset.messagePreviewDevice);
  });
});
document.querySelector("#message-content").addEventListener("change", syncMessagePreviewFromJson);
document.querySelector("#import-lookup-csv").addEventListener("click", importLookupCsv);
document.querySelector("#add-reference-row").addEventListener("click", addReferenceRow);
document.querySelector("#add-reference-column").addEventListener("click", addReferenceColumn);
document.querySelector("#sync-reference-json").addEventListener("click", syncReferenceGridFromJson);
document.querySelector("#lookup-rows").addEventListener("change", syncReferenceGridFromJson);
document.querySelector("#lookup-key-column").addEventListener("change", () => {
  renderReferenceGrid();
  renderLookupInspector();
});
["#lookup-id", "#lookup-name"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", renderLookupInspector);
});
document.querySelector("#settings-form").addEventListener("submit", saveSettings);
document.querySelector("#token-form").addEventListener("submit", createToken);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !ruleBuilderModal.hidden) closeRuleBuilder();
  else if (event.key === "Escape" && ruleDetailModal && !ruleDetailModal.hidden) closeRuleDetail();
  if (event.key === "Escape" && lookupDetailModal && !lookupDetailModal.hidden) closeLookupDetail();
  if (event.key === "Escape" && messageDetailModal && !messageDetailModal.hidden) closeMessageDetail();
  if (event.key === "Escape" && overviewRuleDetailModal && !overviewRuleDetailModal.hidden) closeOverviewRuleDetail();
  if (event.key === "Escape" && evalPayloadModal && !evalPayloadModal.hidden) closeEvalPayload();
});

loadMetrics();
loadExperiments();
loadRules();
newRule({ silent: true });
newLookup({ silent: true });
newMessage({ silent: true });
loadLookups();
loadMessages();
loadSettings();
loadSchema({ silent: true });
loadConditionBlocks({ silent: true });
loadEvaluatePreset();
loadEvaluationProfiles();
renderEvaluationSummary(null, document.querySelector("#eval-mode").value);
renderEvaluationOutputSummary(null);
renderSavedEvaluateProfiles();
renderEvaluateValidation();
loadIntegration();
loadRuntimeStatus();

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${tokenInput.value}`,
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || response.statusText);
  return body;
}

function updateTopbarForView(view) {
  const title = view.querySelector("h2")?.textContent || "Meiro DEE";
  const subtitle = view.querySelector(".page-subtitle")?.textContent || "Decision control plane";
  topbarTitle.textContent = title;
  topbarSubtitle.textContent = subtitle;
}

async function loadRuntimeStatus() {
  try {
    const response = await fetch("/v1/ready", { headers: { "x-request-id": "ui-runtime-status" } });
    const body = await response.json();
    topbarHealth.textContent = body.status === "ready" ? "Ready" : "Not ready";
  } catch {
    topbarHealth.textContent = "Unknown";
  }
}

async function loadRules() {
  try {
    const body = await api("/v1/rule-sets");
    cachedRuleSets = body.rule_sets;
    renderEvaluateRuleOptions();
    renderRuleList();
    renderRuleInspector();
  } catch (error) {
    const target = document.querySelector("#rule-list");
    target.innerHTML = header(["Name", "Decision key", "Status", "Version", "Actions"]);
    target.innerHTML += row([error.message, "", "", "", ""]);
  }
}

async function loadMetrics() {
  try {
    const body = await api("/v1/metrics");
    renderMetrics(body.metrics);
  } catch (error) {
    metricCards.innerHTML = `<div class="metric-card"><span>Metrics unavailable</span><strong>${escapeHtml(error.message)}</strong></div>`;
  }
}

function renderMetrics(metrics) {
  const requests = metrics.requests || {};
  const rules = metrics.rules || {};
  const schema = metrics.schema || {};
  const cache = metrics.client_cache || {};
  const profileCache = metrics.profile_cache || {};
  const events = metrics.client_events || {};
  const runtime = metrics.runtime_requests || {};
  const rateLimit = metrics.client_rate_limit || {};
  metricCards.innerHTML = [
    metricCard("Requests 24h", formatNumber(requests.last_24h), `${formatNumber(requests.total)} total`, "RQ", "teal"),
    metricCard("P95 Latency", `${formatNumber(runtime.p95_ms || 0)}ms`, `${formatNumber(runtime.sample_size || 0)} recent samples`, "P95", "blue"),
    metricCard("Unique Profiles", formatNumber(requests.unique_profiles), "Seen in audit log", "UP", "blue"),
    metricCard("Published Rules", formatNumber(rules.published), `${formatNumber(rules.draft)} drafts`, "PR", "purple"),
    metricCard("Schema Items", formatNumber(schema.total), `${schema.last_sync_status || "never"} sync`, "SC", "teal"),
    metricCard("Client Cache", `${Math.round((cache.hit_rate || 0) * 100)}%`, `${formatNumber(cache.entries || 0)} decision entries`, "CC", "blue"),
    metricCard("Profile Cache", `${Math.round((profileCache.hit_rate || 0) * 100)}%`, `${formatNumber(profileCache.entries || 0)} Meiro profiles`, "PC", "teal"),
    metricCard("Client Events", formatNumber(events.last_24h || 0), `${formatNumber(events.total || 0)} total`, "CE", "blue")
  ].join("");

  renderRuleUsage(metrics.rule_usage || []);
  loadClientEventMetrics();
  renderRequestTrend(metrics);
  renderResultDistribution(metrics);
  renderRulesInventory(rules);
  renderOverviewFooter(metrics);
  document.querySelector("#metrics-schema-health").innerHTML = [
    statusItem("Attributes", formatNumber(schema.attributes || 0)),
    statusItem("Segments", formatNumber(schema.segments || 0)),
    statusItem("Context keys", formatNumber(schema.context || 0)),
    statusItem("Last sync", schema.last_synced_at ? formatTime(schema.last_synced_at) : "never"),
    statusItem("Imported last sync", formatNumber(schema.last_sync_count || 0)),
    statusItem("Reference tables", formatNumber(metrics.lookups?.total || 0)),
    statusItem("Decision cache hits", formatNumber(cache.hits || 0)),
    statusItem("Decision cache misses", formatNumber(cache.misses || 0)),
    statusItem("Profile cache hits", formatNumber(profileCache.hits || 0)),
    statusItem("Profile cache errors", formatNumber(profileCache.errors || 0)),
    statusItem("Runtime error rate", formatPercent(runtime.error_rate || 0)),
    statusItem("Rate limit blocks", formatNumber(rateLimit.blocked || 0)),
    statusItem("Slowest route", runtime.slow_routes?.[0] ? `${runtime.slow_routes[0].route} · ${formatNumber(runtime.slow_routes[0].avg_ms)}ms avg` : "-"),
    ...clientEventStatusItems(events.by_type || [])
  ].join("");
  if (ruleDetailPanel && !ruleDetailPanel.textContent.trim()) {
    ruleDetailPanel.innerHTML = `<div class="status-line">Select a rule in Rule Usage to inspect recent decisions, fallback rate, and matched branch frequency.</div>`;
  }
}

async function loadExperiments() {
  if (!experimentList) return;
  try {
    const body = await api("/v1/experiments");
    cachedExperiments = body.experiments || [];
    renderExperiments(body);
  } catch (error) {
    experimentList.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
    if (experimentDetail) experimentDetail.innerHTML = `<div class="status-line">Experiment reporting is unavailable.</div>`;
  }
}

async function exportExperimentsCsv() {
  try {
    const response = await fetch("/v1/experiments?format=csv", {
      headers: { authorization: `Bearer ${tokenInput.value}` }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text);
    downloadTextFile(text, `meiro-dee-experiments-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`, "text/csv");
  } catch (error) {
    if (experimentDetail) experimentDetail.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

function renderExperiments(body) {
  const summary = body.summary || {};
  if (experimentKpis) {
    experimentKpis.innerHTML = [
      metricCard("Experiments", formatNumber(summary.total || 0), `${formatNumber(summary.running || 0)} running`, "EX", "teal"),
      metricCard("Paused", formatNumber(summary.paused || 0), `${formatNumber(summary.draft || 0)} draft · ${formatNumber(summary.archived || 0)} archived`, "PA", "blue"),
      metricCard("Exposures", formatNumber(summary.exposures || 0), "Variant shown to users", "EV", "purple"),
      metricCard("Conversions", formatNumber(summary.conversions || 0), `${formatPercent(rate(summary.conversions || 0, summary.exposures || 0))} of exposures`, "CV", "teal"),
      metricCard("Impressions", formatNumber(summary.impressions || 0), "Message rendered events", "IM", "blue")
    ].join("");
  }
  if (!cachedExperiments.length) {
    experimentList.innerHTML = `<div class="status-line">No experiment rule sets yet. Create a rule set with type Experiment to begin.</div>`;
    experimentDetail.innerHTML = `<div class="status-line">Select an experiment to inspect variants and feedback.</div>`;
    return;
  }
  experimentList.innerHTML = cachedExperiments.map((experiment, index) => experimentOpsCard(experiment, index)).join("");
  experimentList.querySelectorAll("[data-experiment-index]").forEach((button) => {
    button.addEventListener("click", () => renderExperimentDetail(cachedExperiments[Number(button.dataset.experimentIndex)]));
  });
  renderExperimentDetail(cachedExperiments[0]);
}

function experimentOpsCard(experiment, index) {
  const exposureCount = experiment.events?.exposure?.count || 0;
  const impressionCount = experiment.events?.impression?.count || 0;
  const conversionCount = experiment.events?.conversion?.count || 0;
  const allocationState = Math.round(Number(experiment.allocation_total || 0) * 1000) === 100000 ? "ok" : "warn";
  return `
    <button type="button" class="experiment-ops-card" data-experiment-index="${index}">
      <div class="experiment-ops-head">
        <div>
          <strong>${escapeHtml(experiment.name)}</strong>
          <span>${escapeHtml(experiment.decision_key)}</span>
        </div>
        <mark class="experiment-status ${escapeHtml(experiment.experiment_status)}">${escapeHtml(experiment.experiment_status)}</mark>
      </div>
      <div class="experiment-ops-meta">
        <span>v${escapeHtml(experiment.version || "-")}</span>
        <span>${escapeHtml(experiment.assignment_unit || "profile")} assignment</span>
        <span class="${allocationState}">${formatNumber(experiment.allocation_total || 0)}% allocation</span>
      </div>
      <div class="experiment-ops-bars">
        ${experiment.variants.map((variant) => variantAllocationBar(variant)).join("")}
      </div>
      <div class="experiment-ops-events">
        ${statusItem("Exposures", formatNumber(exposureCount))}
        ${statusItem("Conversions", `${formatNumber(conversionCount)} · ${formatPercent(experiment.conversion_rate || 0)}`)}
        ${statusItem("Winner", experiment.winner_variant || "-")}
        ${statusItem("Impressions", formatNumber(impressionCount))}
      </div>
    </button>
  `;
}

function variantAllocationBar(variant) {
  const width = Math.max(0, Math.min(100, Number(variant.weight || 0)));
  return `
    <div class="variant-allocation-row">
      <span>${escapeHtml(variant.key || "(empty)")}</span>
      <div><em style="width: ${width}%"></em></div>
      <strong>${formatNumber(width)}%</strong>
    </div>
  `;
}

function renderExperimentDetail(experiment) {
  if (!experimentDetail) return;
  if (!experiment) {
    experimentDetail.innerHTML = `<div class="status-line">Select an experiment to inspect variants and feedback.</div>`;
    return;
  }
  const warnings = experimentOpsWarnings(experiment);
  experimentDetail.innerHTML = `
    <div class="experiment-detail-summary">
      ${statusItem("Status", experiment.experiment_status || "draft")}
      ${statusItem("Rule status", experiment.status || "-")}
      ${statusItem("Version", experiment.version || "-")}
      ${statusItem("Assignment", experiment.assignment_unit || "profile")}
      ${statusItem("Baseline", experiment.baseline_variant || "-")}
      ${statusItem("Winner", experiment.winner_variant ? `${experiment.winner_variant} ${formatLift(experiment.winner_lift_vs_baseline)}` : "-")}
      ${statusItem("Last published", experiment.last_published_at ? formatTime(experiment.last_published_at) : "-")}
    </div>
    ${warnings.length ? `<div class="experiment-warning-list">${warnings.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div>` : ""}
    <div class="experiment-variant-table">
      <div class="experiment-variant-header">
        <span>Variant</span>
        <span>Weight</span>
        <span>Exposures</span>
        <span>Conversions</span>
        <span>Conv. rate</span>
        <span>Lift</span>
        <span>Impressions</span>
        <span>Last event</span>
      </div>
      ${experiment.variants.length ? experiment.variants.map((variant) => experimentVariantRow(variant)).join("") : `<div class="status-line">No variants configured.</div>`}
    </div>
  `;
}

function experimentVariantRow(variant) {
  const exposure = variant.events?.exposure || {};
  const conversion = variant.events?.conversion || {};
  const impression = variant.events?.impression || {};
  const lastSeen = [exposure.last_seen_at, conversion.last_seen_at, impression.last_seen_at].filter(Boolean).sort().at(-1);
  return `
    <div class="experiment-variant-row">
      <strong>${escapeHtml(variant.key || "(empty)")}${variant.configured === false ? " *" : ""}</strong>
      <span>${formatNumber(variant.weight || 0)}%</span>
      <span>${formatNumber(exposure.count || 0)} / ${formatNumber(exposure.unique_profiles || 0)} profiles</span>
      <span>${formatNumber(conversion.count || 0)} / ${formatNumber(conversion.unique_profiles || 0)} profiles</span>
      <span>${formatPercent(variant.conversion_rate || 0)}</span>
      <span>${formatLift(variant.lift_vs_baseline)}</span>
      <span>${formatNumber(impression.count || 0)} / ${formatNumber(impression.unique_profiles || 0)} profiles</span>
      <span>${lastSeen ? formatTime(lastSeen) : "-"}</span>
    </div>
  `;
}

function experimentOpsWarnings(experiment) {
  const warnings = [];
  if (experiment.status !== "published") warnings.push("This rule is not published; client traffic will not use the current draft.");
  if (experiment.experiment_status !== "running") warnings.push("Experiment assignment is not running.");
  if (Math.round(Number(experiment.allocation_total || 0) * 1000) !== 100000) warnings.push("Variant allocation does not sum to 100%.");
  if (!experiment.variants.length) warnings.push("No variants are configured.");
  if (experiment.variants.some((variant) => variant.configured === false)) warnings.push("Some recorded variants are no longer in the active allocation.");
  return warnings;
}

async function loadClientEventMetrics() {
  if (!clientEventsPanel) return;
  try {
    const body = await api("/v1/metrics/client-events?limit=8&recent_limit=8");
    renderClientEventMetrics(body.metrics);
  } catch (error) {
    clientEventsPanel.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

function renderClientEventMetrics(metrics) {
  clientEventsPanel.innerHTML = `
    <div class="client-event-subsections">
      ${clientEventGroup("Rules", metrics.by_rule)}
      ${clientEventGroup("Variants", metrics.by_variant)}
      ${clientEventGroup("Messages", metrics.by_message)}
      ${clientEventGroup("Surfaces", metrics.by_surface)}
      <div class="client-event-section recent-events-section">
        <div class="editor-title">Recent Events</div>
        <div class="client-event-list recent-client-events">${clientEventRows(metrics.recent_events)}</div>
      </div>
    </div>
  `;
}

function clientEventGroup(title, items = []) {
  return `
    <div class="client-event-section">
      <div class="editor-title">${escapeHtml(title)}</div>
      <div class="client-event-list">${
        items.length
          ? items.map((item) => clientEventCard(item.key, [
              ["Type", item.event_type],
              ["Count", formatNumber(item.count)],
              ["Profiles", formatNumber(item.unique_profiles)],
              ["Last seen", item.last_seen_at ? formatTime(item.last_seen_at) : "-"]
            ])).join("")
          : `<div class="status-line">No data yet</div>`
      }</div>
    </div>
  `;
}

function clientEventRows(items = []) {
  return items.length
    ? items.map((item) => clientEventCard(item.occurred_at ? formatTime(item.occurred_at) : "-", [
        ["Type", item.event_type],
        ["Rule", item.decision_key],
        ["Profile", item.profile_key],
        ["Variant", item.variant_key || item.message_id || "-"]
      ])).join("")
    : `<div class="status-line">No events yet</div>`;
}

function clientEventCard(title, fields) {
  return `
    <div class="client-event-card">
      <strong>${escapeHtml(title || "(empty)")}</strong>
      <div>
        ${fields.map(([label, value]) => `<span>${escapeHtml(label)}</span><em>${escapeHtml(value || "-")}</em>`).join("")}
      </div>
    </div>
  `;
}

function clientEventStatusItems(items) {
  const counts = Object.fromEntries(items.map((item) => [item.event_type, item.count]));
  return [
    statusItem("Exposures", formatNumber(counts.exposure || 0)),
    statusItem("Impressions", formatNumber(counts.impression || 0)),
    statusItem("Conversions", formatNumber(counts.conversion || 0))
  ];
}

function renderRuleUsage(items) {
  const target = document.querySelector("#metrics-rule-usage");
  const total = Math.max(1, items.reduce((sum, item) => sum + Number(item.requests || 0), 0));
  target.innerHTML = items.length
    ? items.map((item) => ruleUsageCard(item, total)).join("")
    : `<div class="status-line">No rule traffic yet</div>`;
  target.querySelectorAll("[data-metric-rule-key]").forEach((element) => {
    element.addEventListener("click", async () => {
      await loadRuleMetrics(element.dataset.metricRuleKey);
      openOverviewRuleDetail();
    });
  });
}

function ruleUsageCard(item, total) {
  const share = Math.round((Number(item.requests || 0) / total) * 100);
  return `
    <button type="button" class="rule-usage-card" data-metric-rule-key="${escapeHtml(item.decision_key)}">
      <span>${escapeHtml(item.decision_key)}</span>
      <strong>${escapeHtml(formatNumber(item.requests))}</strong>
      <em>${escapeHtml(formatNumber(item.requests_24h))}</em>
      <small>${escapeHtml(`${formatNumber(item.unique_profiles)} profiles`)}</small>
      <i><b style="width:${share}%"></b></i>
      <mark>${share}%</mark>
    </button>
  `;
}

async function loadRuleMetrics(key) {
  try {
    const body = await api(`/v1/metrics/rule/${encodeURIComponent(key)}`);
    renderRuleMetricsDetail(body.metrics);
  } catch (error) {
    ruleDetailPanel.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

function openOverviewRuleDetail() {
  if (!overviewRuleDetailModal) return;
  overviewRuleDetailModal.hidden = false;
}

function closeOverviewRuleDetail() {
  if (!overviewRuleDetailModal) return;
  overviewRuleDetailModal.hidden = true;
}

function renderRuleMetricsDetail(metrics) {
  const fallbackRate = metrics.requests ? Math.round((metrics.fallback_count / metrics.requests) * 100) : 0;
  ruleDetailPanel.innerHTML = `
    <div class="detail-summary">
      ${statusItem("Rule", metrics.decision_key)}
      ${statusItem("Requests", formatNumber(metrics.requests))}
      ${statusItem("Fallback rate", `${fallbackRate}%`)}
      ${statusItem("Errors", formatNumber(metrics.error_count))}
    </div>
    <div class="overview-grid">
      <div>
        <div class="editor-title">Results</div>
        <div class="table compact-table">${header(["Result", "Count", "Share", "", ""])}${resultRows(metrics.result_distribution, metrics.requests)}</div>
      </div>
      <div>
        <div class="editor-title">Matched Branches</div>
        <div class="table compact-table">${header(["Branch", "Count", "Share", "", ""])}${branchRows(metrics.matched_branch_distribution, metrics.requests)}</div>
      </div>
    </div>
    <div>
      <div class="editor-title">Recent Decisions</div>
      <div class="table compact-table">${header(["Time", "Profile", "Result", "Version", "Matched"])}${recentDecisionRows(metrics.recent_decisions)}</div>
    </div>
  `;
}

function resultRows(items, total) {
  return items.length ? items.map((item) => row([item.result, formatNumber(item.count), `${Math.round((item.count / Math.max(1, total)) * 100)}%`, "", ""])).join("") : row(["No data", "", "", "", ""]);
}

function branchRows(items, total) {
  return items.length ? items.map((item) => row([item.branch, formatNumber(item.count), `${Math.round((item.count / Math.max(1, total)) * 100)}%`, "", ""])).join("") : row(["No data", "", "", "", ""]);
}

function recentDecisionRows(items) {
  return items.length ? items.map((item) => row([
    formatTime(item.evaluated_at),
    item.profile_key,
    item.result,
    item.rule_version,
    (item.matched_rules || []).join(", ") || "fallback"
  ])).join("") : row(["No recent decisions", "", "", "", ""]);
}

function metricCard(label, value, meta, icon = "M", tone = "blue") {
  return `
    <div class="metric-card">
      <div class="metric-icon ${escapeHtml(tone)}">${escapeHtml(icon)}</div>
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
        <small>${escapeHtml(meta)}</small>
      </div>
    </div>
  `;
}

function renderTable(selector, headings, rows) {
  const target = document.querySelector(selector);
  target.innerHTML = header(headings);
  target.innerHTML += rows.length ? rows.map((item) => row(item)).join("") : row(["No data yet", "", "", "", ""]);
}

function resultDistributionRows(metrics) {
  const total = Math.max(1, metrics.requests?.total || 0);
  return (metrics.result_distribution || []).map((item) => [
    item.result,
    formatNumber(item.count),
    `${Math.round((item.count / total) * 100)}%`,
    "",
    ""
  ]);
}

function renderRequestTrend(metrics) {
  if (!requestTrendPanel) return;
  const requests = metrics.requests || {};
  const cache = metrics.client_cache || {};
  const rules = metrics.rules || {};
  const points = trendPoints(Number(requests.last_7d || requests.total || 0), Number(requests.last_24h || 0));
  requestTrendPanel.innerHTML = `
    <div class="trend-chart" aria-label="Request activity">
      ${points.map((point, index) => `<span style="height:${point}%" title="Day ${index + 1}: ${point}%"></span>`).join("")}
    </div>
    <div class="trend-stats">
      ${statusItem("7 day requests", formatNumber(requests.last_7d || requests.total || 0))}
      ${statusItem("24h requests", formatNumber(requests.last_24h || 0))}
      ${statusItem("Cache hit rate", `${Math.round((cache.hit_rate || 0) * 100)}%`)}
      ${statusItem("Active rules", formatNumber(rules.published || 0))}
    </div>
  `;
}

function trendPoints(total, latest) {
  const average = Math.max(1, Math.round(total / 7));
  return [45, 62, 52, 74, 88, 70, Math.max(28, Math.min(100, Math.round((latest / average) * 65)))];
}

function renderResultDistribution(metrics) {
  const target = document.querySelector("#metrics-result-distribution");
  if (!target) return;
  const items = metrics.result_distribution || [];
  const total = Math.max(1, items.reduce((sum, item) => sum + Number(item.count || 0), 0));
  const primary = items[0];
  const primaryShare = primary ? Math.round((Number(primary.count || 0) / total) * 100) : 0;
  target.innerHTML = `
    <div class="donut-summary" style="--donut:${primaryShare * 3.6}deg">
      <div><strong>${escapeHtml(formatNumber(total))}</strong><span>Total</span></div>
    </div>
    <div class="distribution-list">
      ${items.length ? items.map((item) => distributionRow(item, total)).join("") : `<div class="status-line">No results yet</div>`}
    </div>
  `;
}

function distributionRow(item, total) {
  const share = Math.round((Number(item.count || 0) / Math.max(1, total)) * 100);
  return `
    <div class="distribution-row">
      <span>${escapeHtml(item.result)}</span>
      <strong>${escapeHtml(formatNumber(item.count))}</strong>
      <small>${share}%</small>
    </div>
  `;
}

function renderRulesInventory(rules) {
  const target = document.querySelector("#metrics-rule-inventory");
  if (!target) return;
  const total = Math.max(1, Number(rules.total || 0));
  target.innerHTML = `
    <div class="inventory-ring" style="--published:${Math.round((Number(rules.published || 0) / total) * 360)}deg">
      <div><strong>${escapeHtml(formatNumber(rules.total || 0))}</strong><span>Total</span></div>
    </div>
    <div class="inventory-list">
      ${inventoryRow("Published", rules.published || 0, total)}
      ${inventoryRow("Draft", rules.draft || 0, total)}
      ${inventoryRow("Archived", rules.archived || 0, total)}
    </div>
  `;
}

function inventoryRow(label, value, total) {
  return `
    <div class="inventory-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(formatNumber(value))}</strong>
      <small>${Math.round((Number(value || 0) / Math.max(1, total)) * 100)}%</small>
    </div>
  `;
}

function renderOverviewFooter(metrics) {
  if (!overviewServiceFooter) return;
  const schema = metrics.schema || {};
  overviewServiceFooter.innerHTML = [
    serviceFooterItem("System status", "All systems operational", "OK"),
    serviceFooterItem("Data freshness", schema.last_synced_at ? `Schema synced ${formatTime(schema.last_synced_at)}` : "Schema not synced", "DF"),
    serviceFooterItem("Environment", topbarEnv?.textContent || "local", "ENV"),
    serviceFooterItem("Version", "v0.1.0", "VER")
  ].join("");
}

function serviceFooterItem(label, value, icon) {
  return `
    <div class="service-footer-item">
      <span>${escapeHtml(icon)}</span>
      <div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(value)}</small></div>
    </div>
  `;
}

function statusItem(label, value) {
  return `<div class="status-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function openRuleDetail() {
  if (!ruleDetailModal) return;
  ruleDetailModal.hidden = false;
}

function closeRuleDetail() {
  if (!ruleDetailModal) return;
  ruleDetailModal.hidden = true;
}

function openRuleBuilder() {
  renderRuleInspector();
  ruleBuilderModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeRuleBuilder() {
  ruleBuilderModal.hidden = true;
  document.body.classList.remove("modal-open");
  renderRuleInspector();
}

function openPublishConfirm() {
  publishConfirmModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closePublishConfirm() {
  publishConfirmModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function renderRuleInspector() {
  if (!ruleInspectorSummary) return;
  const key = document.querySelector("#rule-key").value.trim() || "new_eligibility_rule";
  const selected = cachedRuleSets.find((item) => item.decision_key === selectedRuleKey || item.decision_key === key);
  const type = document.querySelector("#rule-type").value || "decision";
  const priority = document.querySelector("#rule-priority").value || 0;
  const surface = document.querySelector("#rule-surface").value.trim() || "-";
  const mode = document.querySelector("#builder-mode").value;
  const ttl = Number(document.querySelector("#rule-client-ttl").value || 0);
  const scope = document.querySelector("#rule-cache-scope").value;
  const fallback = mode === "graph" ? "graph output" : (document.querySelector("#fallback-result").value.trim() || "deferred");
  ruleInspectorSummary.innerHTML = [
    statusItem("Status", selected?.status || (selectedRuleKey ? "draft" : "new")),
    statusItem("Version", selected?.version ?? "-"),
    statusItem("Type", type),
    statusItem("Priority", priority)
  ].join("");
  renderExperimentPanel();
  inspectorKey.textContent = key;
  inspectorSurface.textContent = surface;
  inspectorCache.textContent = ttl > 0 ? `${ttl}s / ${scope === "none" ? "profile" : scope}` : "No cache hint";
  inspectorFallback.textContent = fallback;
  inspectorBranches.textContent = String(builderBranches.length || 0);
  inspectorNodes.textContent = String(graphBuilder.nodes?.length || 0);
  inspectorMode.textContent = mode === "graph" ? "Advanced graph" : "Branch rules";
  const branchLabel = `${builderBranches.length || 0} branch${builderBranches.length === 1 ? "" : "es"}`;
  const nodeLabel = `${graphBuilder.nodes?.length || 0} node${graphBuilder.nodes?.length === 1 ? "" : "s"}`;
  logicSummaryTitle.textContent = mode === "graph" ? "Advanced graph" : "Branch rules";
  logicSummaryMeta.textContent = mode === "graph" ? nodeLabel : `${branchLabel} · fallback ${fallback}`;
  logicModalSubtitle.textContent = mode === "graph" ? "Advanced graph routing and node outputs" : "Branch rules, conditions, lookup outputs, and fallback";
}

function renderExperimentPanel() {
  if (!experimentPanel) return;
  const type = document.querySelector("#rule-type").value || "decision";
  experimentPanel.hidden = type !== "experiment";
  if (type !== "experiment") return;
  const experiment = readExperimentMetadata({ tolerateInvalid: true });
  const variants = Array.isArray(experiment.variants) ? experiment.variants : [];
  const total = variants.reduce((sum, variant) => sum + Number(variant.weight || 0), 0);
  const status = experiment.status || "draft";
  const warnings = experimentMetadataWarnings(experiment);
  experimentSummary.innerHTML = [
    statusItem("Status", status),
    statusItem("Assignment", experiment.unit || "profile"),
    statusItem("Variants", variants.length),
    statusItem("Allocation", `${Number.isFinite(total) ? total : 0}%`),
    ...warnings.map((warning) => statusItem("Warning", warning))
  ].join("");
}

function setExperimentMetadata(experiment = {}) {
  document.querySelector("#experiment-status").value = experiment.status || "draft";
  document.querySelector("#experiment-unit").value = experiment.unit || "profile";
  document.querySelector("#experiment-variants").value = JSON.stringify(
    Array.isArray(experiment.variants) && experiment.variants.length
      ? experiment.variants
      : defaultExperimentVariants(),
    null,
    2
  );
  renderExperimentPanel();
}

function defaultExperimentVariants() {
  return [
    { key: "control", weight: 50, outputs: {} },
    { key: "treatment", weight: 50, outputs: {} }
  ];
}

function setExperimentStatus(status) {
  document.querySelector("#experiment-status").value = status;
  renderRuleInspector();
}

function readExperimentMetadata({ tolerateInvalid = false } = {}) {
  try {
    const variants = parseJsonStrict(document.querySelector("#experiment-variants").value || "[]", "Variants JSON");
    return {
      status: document.querySelector("#experiment-status").value || "draft",
      unit: document.querySelector("#experiment-unit").value || "profile",
      variants
    };
  } catch (error) {
    if (!tolerateInvalid) throw error;
    return {
      status: document.querySelector("#experiment-status").value || "draft",
      unit: document.querySelector("#experiment-unit").value || "profile",
      variants: []
    };
  }
}

function experimentMetadataWarnings(experiment = {}) {
  const warnings = [];
  const variants = Array.isArray(experiment.variants) ? experiment.variants : [];
  if (!variants.length) warnings.push("No variants configured.");
  const keys = new Set();
  let total = 0;
  for (const variant of variants) {
    if (!variant.key) warnings.push("A variant is missing a key.");
    if (keys.has(variant.key)) warnings.push(`Duplicate variant key: ${variant.key}`);
    keys.add(variant.key);
    const weight = Number(variant.weight || 0);
    if (!Number.isFinite(weight) || weight < 0) warnings.push(`${variant.key || "variant"} has an invalid weight.`);
    total += Number.isFinite(weight) ? weight : 0;
  }
  if (variants.length && Math.round(total * 1000) !== 100000) warnings.push("Variant weights must sum to 100%.");
  if (experiment.status === "running" && variants.length < 2) warnings.push("Running experiments should have at least two variants.");
  return [...new Set(warnings)];
}

function renderRuleList() {
  const target = document.querySelector("#rule-list");
  target.innerHTML = header(["Name", "Decision key", "Status", "Type", "Priority", "Version", "Actions"]);
  const filtered = filteredRuleSets();
  target.innerHTML += filtered.map(ruleSetRow).join("");
  document.querySelectorAll("[data-rule-key]").forEach((element) => {
    element.addEventListener("click", () => loadRule(element.dataset.ruleKey));
  });
  document.querySelectorAll("[data-rule-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      runRuleAction(button.dataset.ruleAction, button.dataset.ruleKey);
    });
  });
}

function filteredRuleSets() {
  const search = document.querySelector("#rule-filter-search").value.trim().toLowerCase();
  const status = document.querySelector("#rule-filter-status").value;
  const type = document.querySelector("#rule-filter-type").value;
  const tag = document.querySelector("#rule-filter-tag").value.trim().toLowerCase();
  return cachedRuleSets.filter((item) => {
    const haystack = `${item.name} ${item.decision_key} ${item.description || ""}`.toLowerCase();
    const tags = (item.tags || []).map((value) => String(value).toLowerCase());
    return (!search || haystack.includes(search))
      && (!status || item.status === status)
      && (!type || item.type === type)
      && (!tag || tags.some((value) => value.includes(tag)));
  });
}

function ruleSetRow(item) {
  const actions = [
    `<button type="button" data-rule-action="duplicate" data-rule-key="${escapeHtml(item.decision_key)}">Duplicate</button>`,
    item.status === "archived"
      ? ""
      : `<button type="button" data-rule-action="archive" data-rule-key="${escapeHtml(item.decision_key)}">Archive</button>`
  ].join("");
  return row(
    [
      item.name,
      item.decision_key,
      item.status,
      item.type || "decision",
      item.priority ?? 0,
      item.version ?? "-",
      actions
    ],
    { key: item.decision_key, rawColumns: [6] }
  );
}

async function runRuleAction(action, key) {
  try {
    if (action === "archive") {
      const body = await api(`/v1/rule-sets/${encodeURIComponent(key)}/archive`, { method: "POST", body: "{}" });
      editorOutput.textContent = JSON.stringify(body, null, 2);
    } else if (action === "duplicate") {
      const copyKey = uniqueCopyKey(key);
      const body = await api(`/v1/rule-sets/${encodeURIComponent(key)}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ decision_key: copyKey, name: `${key.replaceAll("_", " ")} copy` })
      });
      editorOutput.textContent = JSON.stringify(body, null, 2);
      await loadRule(body.rule_set.decision_key);
    }
    await loadRules();
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

function uniqueCopyKey(key) {
  const existing = new Set(cachedRuleSets.map((item) => item.decision_key));
  for (let index = 1; index < 100; index += 1) {
    const candidate = `${key}_copy${index === 1 ? "" : `_${index}`}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${key}_copy_${Date.now()}`;
}

async function loadRule(key) {
  try {
    const body = await api(`/v1/rule-sets/${encodeURIComponent(key)}`);
    selectedRuleKey = key;
    selectedPublishedDefinition = body.version?.definition || null;
    selectedPublishedMetadata = body.version?.metadata || null;
    document.querySelector("#rule-name").value = body.rule_set.name;
    document.querySelector("#rule-key").value = body.rule_set.decision_key;
    document.querySelector("#rule-key").disabled = true;
    document.querySelector("#rule-type").value = body.rule_set.type || "decision";
    document.querySelector("#rule-priority").value = body.rule_set.priority || 0;
    document.querySelector("#rule-surface").value = body.rule_set.surface || "";
    document.querySelector("#rule-client-ttl").value = body.rule_set.cache_policy?.client_ttl ?? "";
    document.querySelector("#rule-cache-scope").value = body.rule_set.cache_policy?.scope || (body.rule_set.cache_policy?.client_ttl ? "profile" : "none");
    document.querySelector("#rule-description").value = body.rule_set.description || "";
    setExperimentMetadata(body.rule_set.metadata?.experiment || body.version?.metadata?.experiment || {});
    document.querySelector("#rule-draft").value = JSON.stringify(
      body.draft || body.version?.definition || { fallback: { result: "deferred", outputs: {} }, branches: [] },
      null,
      2
    );
    syncBuilderFromJson();
    await loadVersions(key);
    renderRuleInspector();
    editorOutput.textContent = `Loaded ${key}`;
    openRuleDetail();
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

function newRule(options = {}) {
  selectedRuleKey = null;
  selectedPublishedDefinition = null;
  selectedPublishedMetadata = null;
  document.querySelector("#rule-name").value = "New Eligibility Rule";
  document.querySelector("#rule-key").value = "new_eligibility_rule";
  document.querySelector("#rule-key").disabled = false;
  document.querySelector("#rule-type").value = "decision";
  document.querySelector("#rule-priority").value = 0;
  document.querySelector("#rule-surface").value = "";
  document.querySelector("#rule-client-ttl").value = "";
  document.querySelector("#rule-cache-scope").value = "none";
  document.querySelector("#rule-description").value = "";
  setExperimentMetadata({});
  document.querySelector("#fallback-result").value = "ineligible";
  document.querySelector("#fallback-outputs").value = "{}";
  versionList.innerHTML = row(["No published versions yet", "", "", ""]);
  document.querySelector("#builder-mode").value = "branches";
  graphBuilder = starterGraphBuilder();
  builderBranches = [newBranch(1)];
  renderBranchEditor();
  renderBuilderMode();
  syncJsonFromBuilder();
  renderRuleInspector();
  editorOutput.textContent = "Ready for a new draft";
  if (!options.silent) openRuleDetail();
}

async function saveDraft(event) {
  event.preventDefault();
  try {
    syncJsonFromBuilder();
    const payload = readEditorPayload();
    validateDraft(payload.draft);
    const warnings = schemaReferenceWarnings(payload.draft);
    const path = selectedRuleKey ? `/v1/rule-sets/${encodeURIComponent(selectedRuleKey)}/draft` : "/v1/rule-sets";
    const body = await api(path, {
      method: selectedRuleKey ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    selectedRuleKey = body.rule_set.decision_key;
    document.querySelector("#rule-key").disabled = true;
    editorOutput.textContent = `${JSON.stringify(body, null, 2)}${formatSchemaWarnings(warnings)}`;
    await loadRules();
    renderRuleInspector();
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

async function publishSelectedRule() {
  if (!selectedRuleKey) {
    editorOutput.textContent = "Save the draft before publishing";
    return;
  }
  try {
    syncJsonFromBuilder();
    const payload = readEditorPayload();
    validateDraft(payload.draft);
    const warnings = schemaReferenceWarnings(payload.draft);
    renderPublishReview(payload, warnings);
    openPublishConfirm();
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

async function confirmPublishSelectedRule() {
  if (!selectedRuleKey) return;
  const button = document.querySelector("#confirm-publish-rule");
  button.disabled = true;
  try {
    syncJsonFromBuilder();
    const payload = readEditorPayload();
    validateDraft(payload.draft);
    const warnings = schemaReferenceWarnings(payload.draft);
    if (warnings.length) throw new Error(`Cannot publish with broken schema references:\n${warnings.map((item) => `- ${item}`).join("\n")}`);
    await api(`/v1/rule-sets/${encodeURIComponent(selectedRuleKey)}/draft`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    const body = await api(`/v1/rule-sets/${encodeURIComponent(selectedRuleKey)}/publish`, { method: "POST", body: "{}" });
    editorOutput.textContent = JSON.stringify(body, null, 2);
    selectedPublishedDefinition = payload.draft;
    selectedPublishedMetadata = payload.metadata || {};
    closePublishConfirm();
    await loadRules();
    await loadVersions(selectedRuleKey);
    renderRuleInspector();
  } catch (error) {
    editorOutput.textContent = error.message;
    renderPublishReviewError(error);
  } finally {
    button.disabled = false;
  }
}

function renderPublishReview(payload, schemaWarnings = []) {
  const draft = payload.draft;
  const stats = draftPublishStats(draft);
  const definitionChanges = clientDiffValues(selectedPublishedDefinition || {}, draft);
  const metadataChanges = clientDiffValues(selectedPublishedMetadata || {}, payload.metadata || {}).map((item) => ({
    ...item,
    path: `metadata${item.path.replace(/^\$/, "")}`
  }));
  const changes = [...definitionChanges, ...metadataChanges].slice(0, 40);
  const validations = publishValidationItems(payload, schemaWarnings);
  publishConfirmSummary.innerHTML = [
    statusItem("Decision key", payload.decision_key || "-"),
    statusItem("Branches", stats.branches),
    statusItem("Outputs", stats.outputs),
    statusItem("TTL", payload.cache_policy?.client_ttl ? `${payload.cache_policy.client_ttl}s` : "No response TTL")
  ].join("");
  publishConfirmDiff.innerHTML = changes.length
    ? changes.map((item) => `
      <div class="publish-diff-item">
        <strong>${escapeHtml(item.path)}</strong>
        <span>${escapeHtml(item.type)}</span>
      </div>
    `).join("")
    : `<div class="publish-diff-item"><strong>No draft changes detected</strong><span>Current draft matches the latest published definition.</span></div>`;
  publishConfirmValidation.innerHTML = validations.map((item) => `
    <div class="publish-validation-item ${item.level === "warn" ? "warn" : ""}">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.detail)}</span>
    </div>
  `).join("");
  document.querySelector("#confirm-publish-rule").disabled = schemaWarnings.length > 0 || hasBlockingExperimentWarnings(payload);
}

function renderPublishReviewError(error) {
  publishConfirmValidation.innerHTML = `
    <div class="publish-validation-item warn">
      <strong>Publish failed</strong>
      <span>${escapeHtml(error.message)}</span>
    </div>
  `;
}

function draftPublishStats(draft) {
  if (draft.graph) {
    const outputs = (draft.graph.nodes || []).filter((node) => node.type === "output").length;
    return { branches: `${draft.graph.nodes?.length || 0} nodes`, outputs };
  }
  const branches = draft.branches || [];
  const outputs = branches.reduce((count, branch) => count + Object.keys(branch.outputs || {}).length, 0);
  return { branches: branches.length, outputs };
}

function publishValidationItems(payload, schemaWarnings = []) {
  const draft = payload.draft || {};
  const items = [
    { title: "Draft schema", detail: "JSON structure is valid and executable.", level: "ok" },
    { title: "Affected rule", detail: `${payload.name || payload.decision_key} will publish as ${payload.type || "decision"}.`, level: "ok" }
  ];
  if (payload.cache_policy?.client_ttl) {
    items.push({ title: "Response TTL", detail: `${payload.cache_policy.client_ttl}s cache hint using ${payload.cache_policy.scope || "profile"} scope.`, level: "ok" });
  } else {
    items.push({ title: "Response TTL", detail: "No client-side cache hint is configured.", level: "warn" });
  }
  const branchWarnings = branchPublishWarnings(draft);
  const experimentWarnings = experimentPublishWarnings(payload);
  if (schemaWarnings.length) {
    items.push({ title: "Publish blocked", detail: "Fix schema reference warnings before publishing this rule.", level: "warn" });
  }
  [...schemaWarnings, ...branchWarnings, ...experimentWarnings].forEach((warning) => {
    items.push({ title: "Review warning", detail: warning, level: "warn" });
  });
  return items;
}

function experimentPublishWarnings(payload) {
  if (payload.type !== "experiment") return [];
  const experiment = payload.metadata?.experiment || {};
  const warnings = experimentMetadataWarnings(experiment);
  const current = selectedPublishedMetadata?.experiment || {};
  const currentAllocation = variantAllocationSignature(current.variants);
  const nextAllocation = variantAllocationSignature(experiment.variants);
  if (currentAllocation && nextAllocation && currentAllocation !== nextAllocation) {
    warnings.push(`Variant allocation changes from ${currentAllocation} to ${nextAllocation}. Existing assignment distribution can shift.`);
  }
  if (current.status === "running" && experiment.status === "running" && current.unit && current.unit !== experiment.unit) {
    warnings.push(`Assignment unit changes from ${current.unit} to ${experiment.unit}. Existing users may be re-bucketed.`);
  }
  if (experiment.status !== "running") {
    warnings.push(`Experiment will publish with status ${experiment.status || "draft"}; no variants will be assigned until status is running.`);
  }
  return warnings;
}

function hasBlockingExperimentWarnings(payload) {
  if (payload.type !== "experiment") return false;
  const warnings = experimentMetadataWarnings(payload.metadata?.experiment || {});
  return warnings.some((warning) =>
    warning.includes("must sum to 100") ||
    warning.includes("missing a key") ||
    warning.includes("Duplicate variant key") ||
    warning.includes("invalid weight") ||
    warning.includes("No variants")
  );
}

function variantAllocationSignature(variants = []) {
  return Array.isArray(variants) && variants.length
    ? variants.map((variant) => `${variant.key}:${Number(variant.weight || 0)}`).join(", ")
    : "";
}

function branchPublishWarnings(draft) {
  if (!draft || draft.graph) return [];
  const warnings = [];
  for (const branch of draft.branches || []) {
    const id = branch.id || branch.label || "branch";
    const outputs = branch.outputs || {};
    if (Object.keys(outputs).length === 0) warnings.push(`${id} has no output fields.`);
    if (outputs.expires_at && Number.isNaN(Date.parse(outputs.expires_at))) warnings.push(`${id} has an invalid expires_at value.`);
  }
  return warnings;
}

function clientDiffValues(left, right, path = "$") {
  if (JSON.stringify(left) === JSON.stringify(right)) return [];
  const leftObject = left && typeof left === "object";
  const rightObject = right && typeof right === "object";
  if (!leftObject || !rightObject || Array.isArray(left) || Array.isArray(right)) {
    return [{ path, type: changeType(left, right) }];
  }
  const keys = [...new Set([...Object.keys(left || {}), ...Object.keys(right || {})])].sort();
  return keys.flatMap((key) => clientDiffValues(left?.[key], right?.[key], `${path}.${key}`));
}

function changeType(left, right) {
  if (left === undefined) return "added";
  if (right === undefined) return "removed";
  return "changed";
}

async function loadVersions(key) {
  versionList.innerHTML = header(["Version", "Published", "Author", "Actions"]);
  try {
    const body = await api(`/v1/rule-sets/${encodeURIComponent(key)}/versions`);
    if (!body.versions.length) {
      versionList.innerHTML += row(["No published versions yet", "", "", ""]);
      return;
    }
    versionList.innerHTML += body.versions
      .slice()
      .reverse()
      .map((version) =>
        row(
          [
            version.version,
            version.published_at,
            version.author,
            [
              `<button type="button" data-version-action="diff" data-version="${version.version}">Diff</button>`,
              `<button type="button" data-version-action="rollback" data-version="${version.version}">Rollback</button>`
            ].join("")
          ],
          { rawColumns: [3] }
        )
      )
      .join("");
    document.querySelectorAll("[data-version-action]").forEach((button) => {
      button.addEventListener("click", () => runVersionAction(button.dataset.versionAction, Number(button.dataset.version)));
    });
  } catch (error) {
    versionList.innerHTML += row([error.message, "", "", ""]);
  }
}

async function runVersionAction(action, version) {
  if (!selectedRuleKey) return;
  try {
    if (action === "diff") {
      const body = await api(`/v1/rule-sets/${encodeURIComponent(selectedRuleKey)}/versions/${version}/diff?compare_to=draft`);
      editorOutput.textContent = formatVersionDiff(body);
    } else if (action === "rollback") {
      const body = await api(`/v1/rule-sets/${encodeURIComponent(selectedRuleKey)}/versions/${version}/rollback`, {
        method: "POST",
        body: "{}"
      });
      document.querySelector("#rule-draft").value = JSON.stringify(body.draft, null, 2);
      syncBuilderFromJson();
      editorOutput.textContent = JSON.stringify(body, null, 2);
      await loadRules();
      await loadVersions(selectedRuleKey);
    }
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

function formatVersionDiff(body) {
  if (!body.diff.length) return `No changes between version ${body.left.version} and ${body.right.version}`;
  return JSON.stringify({
    comparing: {
      from: body.left,
      to: body.right
    },
    changes: body.diff
  }, null, 2);
}

async function exportConfig() {
  try {
    const body = await api("/v1/export");
    cachedConfigBundle = body;
    if (configExportOutput) configExportOutput.textContent = JSON.stringify(body, null, 2);
    if (configExportSummary) configExportSummary.innerHTML = renderBundleSummary(body);
    if (configImportInput && !configImportInput.value.trim()) {
      configImportInput.value = JSON.stringify(body, null, 2);
      previewConfigImport();
    }
  } catch (error) {
    if (configExportOutput) configExportOutput.textContent = error.message;
    else editorOutput.textContent = error.message;
  }
}

function downloadConfig() {
  if (!cachedConfigBundle) {
    if (configExportOutput) configExportOutput.textContent = "Export a bundle before downloading.";
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadTextFile(JSON.stringify(cachedConfigBundle, null, 2), `meiro-dee-config-${stamp}.json`, "application/json");
}

function downloadTextFile(text, filename, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function previewConfigImport() {
  try {
    const bundle = readConfigImportBundle();
    if (configImportSummary) configImportSummary.innerHTML = renderBundleSummary(bundle);
    if (configImportOutput) {
      configImportOutput.textContent = JSON.stringify(
        {
          ready: true,
          kind: bundle.kind,
          counts: bundleCounts(bundle),
          settings_secrets_redacted: bundle.settings_secrets_redacted || []
        },
        null,
        2
      );
    }
  } catch (error) {
    if (configImportSummary) configImportSummary.innerHTML = "";
    if (configImportOutput) configImportOutput.textContent = error.message;
  }
}

async function importConfig() {
  try {
    const bundle = readConfigImportBundle();
    if (!confirm(`Import this configuration bundle?\n\n${bundleSummaryText(bundle)}\n\nExisting objects with matching IDs will be updated.`)) return;
    const body = await api("/v1/import", {
      method: "POST",
      body: JSON.stringify(bundle)
    });
    if (configImportOutput) configImportOutput.textContent = JSON.stringify(body, null, 2);
    if (configImportSummary) {
      configImportSummary.innerHTML = renderImportResult(body.imported || {}, bundle.settings_secrets_redacted || []);
    }
    await Promise.all([
      loadRules(),
      loadLookups(),
      loadMessages(),
      loadSettings(),
      loadConditionBlocks({ silent: true }),
      loadSchema({ silent: true })
    ]);
  } catch (error) {
    if (configImportOutput) configImportOutput.textContent = error.message;
  }
}

function readConfigImportBundle() {
  const raw = configImportInput?.value.trim();
  if (!raw) throw new Error("Paste a config bundle JSON before previewing or importing.");
  const bundle = JSON.parse(raw);
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) throw new Error("Config bundle must be a JSON object.");
  if (bundle.kind !== "meiro-dee-config-bundle") throw new Error("Unsupported config bundle kind.");
  return bundle;
}

function bundleCounts(bundle) {
  const settings = bundle.settings && typeof bundle.settings === "object" && !Array.isArray(bundle.settings)
    ? Object.keys(bundle.settings).length
    : 0;
  return {
    rule_sets: (bundle.rule_sets || []).length,
    lookup_tables: (bundle.lookup_tables || []).length,
    messages: (bundle.messages || []).length,
    condition_blocks: (bundle.condition_blocks || []).length,
    settings
  };
}

function renderBundleSummary(bundle) {
  const counts = bundleCounts(bundle);
  const redacted = (bundle.settings_secrets_redacted || []).join(", ") || "none";
  return `
    <div class="status-item"><span>Rule sets</span><strong>${formatNumber(counts.rule_sets)}</strong></div>
    <div class="status-item"><span>Reference tables</span><strong>${formatNumber(counts.lookup_tables)}</strong></div>
    <div class="status-item"><span>Messages</span><strong>${formatNumber(counts.messages)}</strong></div>
    <div class="status-item"><span>Condition blocks</span><strong>${formatNumber(counts.condition_blocks)}</strong></div>
    <div class="status-item"><span>Portable settings</span><strong>${formatNumber(counts.settings)}</strong></div>
    <div class="status-item wide"><span>Secrets redacted</span><strong>${escapeHtml(redacted)}</strong></div>
  `;
}

function renderImportResult(imported, redactedSecrets) {
  const redacted = redactedSecrets.join(", ") || "none";
  return `
    <div class="status-item"><span>Imported rules</span><strong>${formatNumber(imported.rule_sets || 0)}</strong></div>
    <div class="status-item"><span>Imported tables</span><strong>${formatNumber(imported.lookup_tables || 0)}</strong></div>
    <div class="status-item"><span>Imported messages</span><strong>${formatNumber(imported.messages || 0)}</strong></div>
    <div class="status-item"><span>Imported blocks</span><strong>${formatNumber(imported.condition_blocks || 0)}</strong></div>
    <div class="status-item"><span>Applied settings</span><strong>${formatNumber(imported.settings || 0)}</strong></div>
    <div class="status-item wide"><span>Secrets unchanged</span><strong>${escapeHtml(redacted)}</strong></div>
  `;
}

function bundleSummaryText(bundle) {
  const counts = bundleCounts(bundle);
  return [
    `${counts.rule_sets} rule sets`,
    `${counts.lookup_tables} reference tables`,
    `${counts.messages} messages`,
    `${counts.condition_blocks} condition blocks`,
    `${counts.settings} portable settings`
  ].join("\n");
}

async function loadAudit() {
  const target = document.querySelector("#audit-list");
  target.innerHTML = header(["Time", "Decision", "Profile", "Result", "Matched"]);
  try {
    const params = auditParams();
    const body = await api(`/v1/audit${params.toString() ? `?${params}` : ""}`);
    const audit = body.audit || [];
    target.innerHTML += audit.length
      ? audit.map((item, index) => row([formatTime(item.evaluated_at), item.decision_key, item.profile_key, item.result, item.matched_rules.join(", ") || "fallback"], { auditIndex: index })).join("")
      : row(["No audit entries match the current filters", "", "", "", ""]);
    renderAuditSummary(audit);
    document.querySelectorAll("[data-audit-index]").forEach((element) => {
      element.addEventListener("click", () => {
        renderAuditDetail(audit[Number(element.dataset.auditIndex)]);
      });
    });
    renderAuditDetail(audit[0]);
  } catch (error) {
    target.innerHTML += row([error.message, "", "", "", ""]);
    renderAuditSummary([]);
    auditDetail.textContent = error.message;
  }
}

function renderAuditSummary(audit) {
  const count = audit.length;
  auditCount.textContent = `${formatNumber(count)} event${count === 1 ? "" : "s"}`;
  const first = audit[0]?.evaluated_at ? formatTime(audit[0].evaluated_at) : "Latest first";
  const last = audit.at(-1)?.evaluated_at ? formatTime(audit.at(-1).evaluated_at) : "";
  auditRange.textContent = last ? `${first} to ${last}` : first;
  renderAuditInsights(audit);
}

function renderAuditInsights(audit) {
  if (!auditInsights) return;
  if (!audit.length) {
    auditInsights.innerHTML = [
      statusItem("Top decision", "-"),
      statusItem("Top result", "-"),
      statusItem("Matched rate", "0%"),
      statusItem("Profiles", "0")
    ].join("");
    return;
  }
  const topDecision = topCount(audit.map((item) => item.decision_key || "-"));
  const topResult = topCount(audit.map((item) => item.result || "-"));
  const matched = audit.filter((item) => (item.matched_rules || []).length).length;
  const profiles = new Set(audit.map((item) => item.profile_key).filter(Boolean)).size;
  auditInsights.innerHTML = [
    statusItem("Top decision", `${topDecision.key} (${formatNumber(topDecision.count)})`),
    statusItem("Top result", `${topResult.key} (${formatNumber(topResult.count)})`),
    statusItem("Matched rate", `${Math.round((matched / audit.length) * 100)}%`),
    statusItem("Profiles", formatNumber(profiles))
  ].join("");
}

function topCount(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
    .map(([key, count]) => ({ key, count }))[0] || { key: "-", count: 0 };
}

function renderAuditDetail(entry) {
  if (!entry) {
    auditDetailSummary.innerHTML = [
      statusItem("Decision", "-"),
      statusItem("Result", "-"),
      statusItem("Profile", "-"),
      statusItem("Matched", "-")
    ].join("");
    auditDetail.textContent = "No audit entries match the current filters";
    return;
  }
  auditDetailSummary.innerHTML = [
    statusItem("Decision", entry.decision_key || "-"),
    statusItem("Result", entry.result || "-"),
    statusItem("Profile", entry.profile_key || "-"),
    statusItem("Matched", entry.matched_rules?.join(", ") || "fallback")
  ].join("");
  auditDetail.textContent = JSON.stringify(entry, null, 2);
}

function clearAuditFilters() {
  ["audit-decision-key", "audit-profile-key", "audit-result", "audit-from", "audit-to"].forEach((id) => {
    document.querySelector(`#${id}`).value = "";
  });
  document.querySelector("#audit-limit").value = "100";
  loadAudit();
}

function auditParams() {
  const params = new URLSearchParams();
  for (const [id, key] of [
    ["audit-decision-key", "decision_key"],
    ["audit-profile-key", "profile_key"],
    ["audit-result", "result"],
    ["audit-from", "from"],
    ["audit-to", "to"],
    ["audit-limit", "limit"]
  ]) {
    const value = document.querySelector(`#${id}`)?.value.trim();
    if (!value) continue;
    params.set(key, id === "audit-from" || id === "audit-to" ? new Date(value).toISOString() : value);
  }
  return params;
}

async function exportAuditCsv() {
  try {
    const params = auditParams();
    params.set("format", "csv");
    const response = await fetch(`/v1/audit?${params}`, {
      headers: { authorization: `Bearer ${tokenInput.value}` }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text);
    auditDetail.textContent = text;
  } catch (error) {
    auditDetail.textContent = error.message;
  }
}

async function loadLookups() {
  const target = document.querySelector("#lookup-list");
  target.innerHTML = header(["Name", "ID", "Match column", "Rows", "Version", "Columns"]);
  try {
    const body = await api("/v1/lookup-tables");
    cachedLookupTables = body.lookup_tables || [];
    target.innerHTML += body.lookup_tables
      .map((item) => lookupCatalogRow(item))
      .join("");
    document.querySelectorAll("[data-lookup-id]").forEach((element) => {
      element.addEventListener("click", () => loadLookup(element.dataset.lookupId, body.lookup_tables));
    });
    renderBranchEditor();
    if (document.querySelector("#builder-mode")?.value === "graph") renderGraphBuilder();
  } catch (error) {
    target.innerHTML += row([error.message, "", "", "", "", ""]);
  }
}

function lookupCatalogRow(item) {
  const columns = referenceColumnsFromRowsForTable(item);
  return row([
    item.name,
    item.id,
    item.key_column || "key",
    formatNumber(item.rows?.length || 0),
    item.version || "-",
    columns.join(", ") || "-"
  ], { lookupId: item.id });
}

function referenceColumnsFromRowsForTable(table) {
  const keyColumn = table.key_column || "key";
  const discovered = [...new Set((table.rows || []).flatMap((rowItem) => Object.keys(rowItem || {})))];
  return [keyColumn, ...discovered.filter((column) => column !== keyColumn)];
}

async function loadMessages() {
  const target = document.querySelector("#message-list");
  target.innerHTML = header(["Name", "ID", "Surface", "Status", "Updated", "Content"]);
  try {
    const body = await api("/v1/messages");
    cachedMessages = body.messages || [];
    target.innerHTML += body.messages.length
      ? body.messages.map((item) => messageCatalogRow(item)).join("")
      : row(["No messages", "", "", "", "", ""]);
    document.querySelectorAll("[data-message-id]").forEach((element) => {
      element.addEventListener("click", () => loadMessage(element.dataset.messageId, body.messages));
    });
    if (document.querySelector("#builder-mode")?.value === "graph") renderGraphBuilder();
  } catch (error) {
    target.innerHTML += row([error.message, "", "", "", "", ""]);
  }
}

function messageCatalogRow(item) {
  const content = item.default_content || {};
  const title = content.title || content.headline || "-";
  const template = content.template_type || item.metadata?.template_type || "-";
  const cta = content.ctas?.[0]?.label || content.cta_label;
  return row([
    item.name,
    item.id,
    item.surface || "-",
    item.status || "active",
    item.updated_at ? formatTime(item.updated_at) : "-",
    `${template} · ${title}${cta ? ` · ${cta}` : ""}`
  ], { messageId: item.id });
}

function openMessageDetail() {
  if (!messageDetailModal) return;
  messageDetailModal.hidden = false;
}

function closeMessageDetail() {
  if (!messageDetailModal) return;
  messageDetailModal.hidden = true;
}

function newMessage(options = {}) {
  selectedMessageId = null;
  document.querySelector("#message-id").value = "hero_offer";
  document.querySelector("#message-id").disabled = false;
  document.querySelector("#message-name").value = "Hero Offer";
  document.querySelector("#message-surface").value = "homepage_hero";
  document.querySelector("#message-status").value = "active";
  document.querySelector("#message-template-type").value = "banner";
  document.querySelector("#message-placement").value = "homepage.hero.top";
  document.querySelector("#message-starts-at").value = "";
  document.querySelector("#message-expires-at").value = "";
  document.querySelector("#message-priority").value = "0";
  document.querySelector("#message-frequency-ttl").value = "";
  document.querySelector("#message-content").value = JSON.stringify({
    template_type: "banner",
    placement: "homepage.hero.top",
    title: "Special offer",
    body: "A personalized offer is ready.",
    footer: "",
    cta_label: "View offer",
    cta_url: "",
    image_url: "",
    ctas: [
      { label: "View offer", url: "", style: "primary" }
    ]
  }, null, 2);
  document.querySelector("#message-schema").value = JSON.stringify({
    template_type: "banner|alert|modal|inline|toast",
    placement: "string",
    title: "string",
    body: "string",
    footer: "string",
    cta_label: "string",
    cta_url: "url",
    image_url: "url",
    ctas: [{ label: "string", url: "url", style: "primary|secondary" }]
  }, null, 2);
  document.querySelector("#message-metadata").value = JSON.stringify({
    lifecycle: {
      starts_at: "",
      expires_at: "",
      ttl_seconds: 0
    },
    priority: 0
  }, null, 2);
  syncMessagePreviewFromJson();
  messageOutput.textContent = "Ready for a new message";
  if (!options.silent) openMessageDetail();
}

function loadMessage(id, messages) {
  const message = messages.find((item) => item.id === id);
  if (!message) {
    messageOutput.textContent = `Message not found: ${id}`;
    return;
  }
  selectedMessageId = id;
  document.querySelector("#message-id").value = message.id;
  document.querySelector("#message-id").disabled = true;
  document.querySelector("#message-name").value = message.name;
  document.querySelector("#message-surface").value = message.surface || "";
  document.querySelector("#message-status").value = message.status || "active";
  document.querySelector("#message-content").value = JSON.stringify(message.default_content || {}, null, 2);
  document.querySelector("#message-schema").value = JSON.stringify(message.content_schema || {}, null, 2);
  document.querySelector("#message-metadata").value = JSON.stringify(message.metadata || {}, null, 2);
  syncMessageDeliveryFromMetadata(message.metadata || {});
  syncMessagePreviewFromJson();
  messageOutput.textContent = `Loaded ${id}`;
  openMessageDetail();
}

async function saveMessage(event) {
  event.preventDefault();
  try {
    syncMessageJsonFromPreview();
    syncMessageMetadataFromDelivery();
    const id = selectedMessageId || document.querySelector("#message-id").value.trim();
    const body = {
      name: document.querySelector("#message-name").value.trim() || id,
      surface: document.querySelector("#message-surface").value.trim(),
      status: document.querySelector("#message-status").value,
      default_content: JSON.parse(document.querySelector("#message-content").value || "{}"),
      content_schema: JSON.parse(document.querySelector("#message-schema").value || "{}"),
      metadata: JSON.parse(document.querySelector("#message-metadata").value || "{}")
    };
    const response = await api(`/v1/messages/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
    selectedMessageId = response.message.id;
    document.querySelector("#message-id").disabled = true;
    messageOutput.textContent = JSON.stringify(response, null, 2);
    await loadMessages();
  } catch (error) {
    messageOutput.textContent = error.message;
  }
}

function syncMessagePreviewFromJson() {
  try {
    const content = JSON.parse(document.querySelector("#message-content").value || "{}");
    const ctas = normalizeMessageCtas(content);
    document.querySelector("#message-template-type").value = messageTemplateType(content.template_type || content.type || "banner");
    document.querySelector("#message-placement").value = content.placement || "";
    document.querySelector("#message-preview-title").value = content.title || "";
    document.querySelector("#message-preview-body").value = content.body || "";
    document.querySelector("#message-preview-footer").value = content.footer || "";
    document.querySelector("#message-preview-image").value = content.image_url || "";
    document.querySelector("#message-primary-cta-label").value = ctas[0]?.label || "";
    document.querySelector("#message-primary-cta-url").value = ctas[0]?.url || "";
    document.querySelector("#message-secondary-cta-label").value = ctas[1]?.label || "";
    document.querySelector("#message-secondary-cta-url").value = ctas[1]?.url || "";
    renderMessagePreview();
  } catch (error) {
    messageOutput.textContent = error.message;
  }
}

function syncMessageJsonFromPreview() {
  const current = parseJsonSafe(document.querySelector("#message-content").value || "{}");
  const ctas = [
    {
      label: document.querySelector("#message-primary-cta-label").value.trim(),
      url: document.querySelector("#message-primary-cta-url").value.trim(),
      style: "primary"
    },
    {
      label: document.querySelector("#message-secondary-cta-label").value.trim(),
      url: document.querySelector("#message-secondary-cta-url").value.trim(),
      style: "secondary"
    }
  ].filter((cta) => cta.label || cta.url);
  const content = {
    ...current,
    template_type: document.querySelector("#message-template-type").value,
    placement: document.querySelector("#message-placement").value.trim(),
    title: document.querySelector("#message-preview-title").value.trim(),
    body: document.querySelector("#message-preview-body").value.trim(),
    footer: document.querySelector("#message-preview-footer").value.trim(),
    image_url: document.querySelector("#message-preview-image").value.trim(),
    ctas
  };
  content.cta_label = ctas[0]?.label || "";
  content.cta_url = ctas[0]?.url || "";
  document.querySelector("#message-content").value = JSON.stringify(content, null, 2);
  renderMessagePreview();
  messageOutput.textContent = "Message JSON synced";
}

function syncMessageDeliveryFromMetadata(metadata = {}) {
  const lifecycle = metadata.lifecycle || metadata.delivery || {};
  document.querySelector("#message-starts-at").value = dateTimeLocalValue(lifecycle.starts_at || metadata.starts_at || "");
  document.querySelector("#message-expires-at").value = dateTimeLocalValue(lifecycle.expires_at || metadata.expires_at || "");
  document.querySelector("#message-priority").value = Number(metadata.priority ?? lifecycle.priority ?? 0);
  document.querySelector("#message-frequency-ttl").value = Number(lifecycle.ttl_seconds ?? metadata.ttl_seconds ?? 0) || "";
}

function syncMessageMetadataFromDelivery() {
  const metadata = parseJsonSafe(document.querySelector("#message-metadata").value || "{}");
  const startsAt = isoFromDateTimeLocal(document.querySelector("#message-starts-at").value);
  const expiresAt = isoFromDateTimeLocal(document.querySelector("#message-expires-at").value);
  const ttl = Number(document.querySelector("#message-frequency-ttl").value || 0);
  metadata.priority = Number(document.querySelector("#message-priority").value || 0);
  metadata.lifecycle = {
    ...(metadata.lifecycle || {}),
    starts_at: startsAt,
    expires_at: expiresAt,
    ttl_seconds: Number.isFinite(ttl) && ttl > 0 ? ttl : 0
  };
  document.querySelector("#message-metadata").value = JSON.stringify(metadata, null, 2);
}

function dateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isoFromDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatActiveMessageJson() {
  const activePanel = document.querySelector(".message-bottom-drawer .drawer-panel.active");
  const textarea = activePanel?.querySelector("textarea");
  if (!textarea) {
    messageOutput.textContent = "Select a JSON tab to format";
    return;
  }
  try {
    textarea.value = JSON.stringify(JSON.parse(textarea.value || "{}"), null, 2);
    if (textarea.id === "message-content") syncMessagePreviewFromJson();
    messageOutput.textContent = "JSON formatted";
  } catch (error) {
    messageOutput.textContent = error.message;
  }
}

function renderMessagePreview() {
  if (!messagePreview) return;
  const templateType = messageTemplateType(document.querySelector("#message-template-type").value);
  const placement = document.querySelector("#message-placement").value.trim();
  const title = document.querySelector("#message-preview-title").value.trim() || document.querySelector("#message-name").value.trim() || "Untitled message";
  const body = document.querySelector("#message-preview-body").value.trim() || "No message body yet.";
  const footer = document.querySelector("#message-preview-footer").value.trim();
  const imageUrl = document.querySelector("#message-preview-image").value.trim();
  const surface = document.querySelector("#message-surface").value.trim() || "-";
  const status = document.querySelector("#message-status").value || "active";
  const ttl = Number(document.querySelector("#message-frequency-ttl").value || 0);
  const expiresAt = document.querySelector("#message-expires-at").value;
  const ctas = [
    {
      label: document.querySelector("#message-primary-cta-label").value.trim(),
      url: document.querySelector("#message-primary-cta-url").value.trim(),
      style: "primary"
    },
    {
      label: document.querySelector("#message-secondary-cta-label").value.trim(),
      url: document.querySelector("#message-secondary-cta-url").value.trim(),
      style: "secondary"
    }
  ].filter((cta) => cta.label || cta.url);
  messagePreview.dataset.template = templateType;
  messagePreview.innerHTML = `
    ${imageUrl ? `<div class="message-preview-image" style="background-image:url('${escapeHtml(imageUrl)}')"></div>` : ""}
    <div class="message-preview-body">
      <span>${escapeHtml([templateType, placement || surface].filter(Boolean).join(" · "))}</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(body)}</p>
      ${ctas.length ? `<div class="message-preview-actions">${ctas.map((cta) => `<a class="${cta.style === "secondary" ? "secondary" : "primary"}" href="${escapeHtml(cta.url || "#")}" target="_blank" rel="noopener">${escapeHtml(cta.label || cta.url)}</a>`).join("")}</div>` : ""}
      ${footer ? `<small>${escapeHtml(footer)}</small>` : ""}
    </div>
  `;
  messageInspectorSummary.innerHTML = [
    statusItem("Status", status),
    statusItem("Template", templateType),
    statusItem("Placement", placement || "-"),
    statusItem("Surface", surface),
    statusItem("TTL", ttl > 0 ? `${ttl}s` : "No recheck hint"),
    statusItem("Expires", expiresAt ? formatTime(new Date(expiresAt).toISOString()) : "-"),
    statusItem("Message ID", document.querySelector("#message-id").value.trim() || "-"),
    statusItem("Schema fields", Object.keys(parseJsonSafe(document.querySelector("#message-schema").value || "{}")).length)
  ].join("");
}

function normalizeMessageCtas(content) {
  if (Array.isArray(content.ctas)) {
    return content.ctas
      .filter((cta) => cta && (cta.label || cta.url))
      .map((cta, index) => ({
        label: String(cta.label || ""),
        url: String(cta.url || cta.href || ""),
        style: cta.style || (index === 0 ? "primary" : "secondary")
      }));
  }
  return [
    {
      label: String(content.cta_label || ""),
      url: String(content.cta_url || content.cta_href || ""),
      style: "primary"
    }
  ].filter((cta) => cta.label || cta.url);
}

function messageTemplateType(value) {
  return ["banner", "alert", "modal", "inline", "toast"].includes(value) ? value : "banner";
}

async function loadLookupVersions(id) {
  lookupVersionList.innerHTML = header(["Version", "Updated", "Author", "Rows", "Action"]);
  if (!id) {
    lookupVersionList.innerHTML += row(["-", "-", "-", "-", "-"]);
    return;
  }
  try {
    const body = await api(`/v1/lookup-tables/${encodeURIComponent(id)}/versions`);
    if (!body.versions.length) {
      lookupVersionList.innerHTML += row(["No versions", "", "", "", ""]);
      return;
    }
    lookupVersionList.innerHTML += body.versions
      .map((item) =>
        row(
          [
            item.version,
            formatTime(item.updated_at),
            item.author,
            item.row_count,
            `<button type="button" data-lookup-version="${item.version}">Load</button>`
          ],
          { rawColumns: [4] }
        )
      )
      .join("");
    lookupVersionList.querySelectorAll("[data-lookup-version]").forEach((button) => {
      button.addEventListener("click", () => loadLookupVersion(id, button.dataset.lookupVersion));
    });
  } catch (error) {
    lookupVersionList.innerHTML += row([error.message, "", "", "", ""]);
  }
}

async function runEvaluate() {
  try {
    const request = readEvaluateInput();
    const validation = renderEvaluateValidation(request);
    if (validation.errors.length) throw new Error(`Fix request setup first: ${validation.errors.join("; ")}`);
    const mode = document.querySelector("#eval-mode").value;
    const path = mode === "draft"
      ? `/v1/rule-sets/${encodeURIComponent(request.decision_key)}/test`
      : "/v1/evaluate";
    const body = await api(path, {
      method: "POST",
      body: JSON.stringify(request)
    });
    renderEvaluationSummary(body, mode);
    renderEvaluationOutputSummary(body);
    renderEvaluationTrace(body);
    evalOutput.textContent = formatDecisionOutput(body);
    loadAudit();
    loadMetrics();
  } catch (error) {
    renderEvaluationSummary(null, document.querySelector("#eval-mode").value, error);
    renderEvaluationOutputSummary(null, error);
    evalTrace.innerHTML = "";
    evalOutput.textContent = error.message;
  }
}

async function compareEvaluateVersions() {
  try {
    const request = readEvaluateInput();
    const validation = renderEvaluateValidation(request);
    if (validation.errors.length) throw new Error(`Fix request setup first: ${validation.errors.join("; ")}`);
    const [published, draft] = await Promise.allSettled([
      api(`/v1/rule-sets/${encodeURIComponent(request.decision_key)}/test-published`, {
        method: "POST",
        body: JSON.stringify(request)
      }),
      api(`/v1/rule-sets/${encodeURIComponent(request.decision_key)}/test`, {
        method: "POST",
        body: JSON.stringify(request)
      })
    ]);
    const body = {
      decision_key: request.decision_key,
      profile_key: request.profile_key,
      compare: {
        published: published.status === "fulfilled" ? published.value : { error: published.reason.message },
        draft: draft.status === "fulfilled" ? draft.value : { error: draft.reason.message }
      }
    };
    renderEvaluationCompare(body);
    evalOutput.textContent = JSON.stringify(body, null, 2);
    loadAudit();
    loadMetrics();
  } catch (error) {
    renderEvaluationSummary(null, "compare", error);
    renderEvaluationOutputSummary(null, error);
    evalTrace.innerHTML = "";
    evalOutput.textContent = error.message;
  }
}

function renderEvaluationCompare(body) {
  const published = body.compare?.published || {};
  const draft = body.compare?.draft || {};
  const changed = compareDecisionResults(published, draft);
  evalSummary.innerHTML = [
    statusItem("Status", changed.length ? "Changed" : "Same"),
    statusItem("Mode", "Published vs draft"),
    statusItem("Published", published.error || published.result || "-"),
    statusItem("Draft", draft.error || draft.result || "-")
  ].join("");
  evalOutputSummary.innerHTML = `
    <div class="compare-grid">
      ${compareDecisionCard("Published", published)}
      ${compareDecisionCard("Draft", draft)}
    </div>
    <div class="compare-diff-card ${changed.length ? "warning" : ""}">
      <span>Differences</span>
      <strong>${escapeHtml(changed.length ? changed.join(", ") : "No functional difference detected")}</strong>
    </div>
  `;
  evalTrace.innerHTML = `
    <div class="trace-card">
      <div class="trace-card-header">
        <strong>Decision Path Compare</strong>
        <span class="trace-badge">${escapeHtml(changed.length ? `${changed.length} changes` : "same")}</span>
      </div>
      <div class="compare-trace-grid">
        <div>${traceCompareColumn("Published", published.trace)}</div>
        <div>${traceCompareColumn("Draft", draft.trace)}</div>
      </div>
    </div>
  `;
}

function compareDecisionCard(label, result) {
  if (result.error) {
    return `
      <div class="eval-output-card warning">
        <span>${escapeHtml(label)}</span>
        <strong>Error</strong>
        <small>${escapeHtml(result.error)}</small>
      </div>
    `;
  }
  return `
    <div class="eval-output-card ${label === "Draft" ? "primary" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(result.result || "-")}</strong>
      <small>${escapeHtml(result.matched_rules?.join(", ") || "fallback")}</small>
    </div>
  `;
}

function compareDecisionResults(left, right) {
  const changes = [];
  if (left.error || right.error) {
    if (left.error !== right.error) changes.push("availability");
    return changes;
  }
  if (left.result !== right.result) changes.push("result");
  if (JSON.stringify(left.outputs || {}) !== JSON.stringify(right.outputs || {})) changes.push("outputs");
  if (JSON.stringify(left.matched_rules || []) !== JSON.stringify(right.matched_rules || [])) changes.push("matched rules");
  if (JSON.stringify(left.errors || []) !== JSON.stringify(right.errors || [])) changes.push("errors");
  return changes;
}

function traceCompareColumn(label, trace = []) {
  const items = Array.isArray(trace) && trace.length ? trace : [{ type: "empty", message: "No trace returned" }];
  return `
    <div class="trace-compare-column">
      <strong>${escapeHtml(label)}</strong>
      <div class="trace-path compact">
        ${items.map(traceStepHtml).join("")}
      </div>
    </div>
  `;
}

function header(values) {
  return row(values);
}

function row(values, options = {}) {
  const attrs = [
    options.key ? `data-rule-key="${escapeHtml(options.key)}"` : "",
    options.lookupId ? `data-lookup-id="${escapeHtml(options.lookupId)}"` : "",
    options.messageId ? `data-message-id="${escapeHtml(options.messageId)}"` : "",
    options.metricRuleKey ? `data-metric-rule-key="${escapeHtml(options.metricRuleKey)}"` : "",
    Number.isInteger(options.auditIndex) ? `data-audit-index="${options.auditIndex}"` : "",
    options.tokenId ? `data-token-id="${escapeHtml(options.tokenId)}"` : ""
  ].filter(Boolean).join(" ");
  const className = options.key || options.lookupId || options.messageId || options.metricRuleKey || Number.isInteger(options.auditIndex) || options.tokenId ? "row actionable" : "row";
  return `<div class="${className}" ${attrs}>${values.map((value, index) => `<div>${options.rawColumns?.includes(index) ? String(value ?? "") : escapeHtml(String(value ?? ""))}</div>`).join("")}</div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function cssEscape(value) {
  return window.CSS?.escape ? window.CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
}

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 1000) / 10}%`;
}

function formatLift(value) {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  const rounded = Math.round(Number(value) * 1000) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function rate(numerator, denominator) {
  const base = Number(denominator || 0);
  return base > 0 ? Number(numerator || 0) / base : 0;
}

function readEditorPayload() {
  const type = document.querySelector("#rule-type").value;
  const payload = {
    name: document.querySelector("#rule-name").value.trim(),
    decision_key: document.querySelector("#rule-key").value.trim(),
    description: document.querySelector("#rule-description").value.trim(),
    type,
    priority: Number(document.querySelector("#rule-priority").value || 0),
    surface: document.querySelector("#rule-surface").value.trim(),
    cache_policy: readCachePolicy(),
    draft: JSON.parse(document.querySelector("#rule-draft").value),
    tags: []
  };
  if (type === "experiment") payload.metadata = { experiment: readExperimentMetadata() };
  return payload;
}

function readCachePolicy() {
  const ttl = Number(document.querySelector("#rule-client-ttl").value || 0);
  const scope = document.querySelector("#rule-cache-scope").value;
  const policy = {};
  if (ttl > 0) policy.client_ttl = ttl;
  if (scope !== "none") policy.scope = scope;
  return policy;
}

function parseLiteral(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (value !== "" && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

function newBranch(index) {
  return {
    id: `branch_${index}`,
    result: "eligible",
    outputs: "{}",
    logic: "all",
    conditions: [
      {
        source: "attribute",
        key: "lifetime_revenue",
        operator: "greater_than_or_equal",
        value: "5000"
      }
    ]
  };
}

function renderBranchEditor() {
  branchEditor.innerHTML = "";
  builderBranches.forEach((branch, branchIndex) => {
    const node = document.querySelector("#branch-template").content.firstElementChild.cloneNode(true);
    node.dataset.branchIndex = String(branchIndex);
    bindBranchField(node, branchIndex, "id");
    bindBranchField(node, branchIndex, "result");
    bindBranchField(node, branchIndex, "outputs");
    bindBranchField(node, branchIndex, "logic");
    bindBranchSummary(node, branchIndex);
    bindOutputFieldEditor(node, branchIndex);
    bindLookupOutputHelper(node, branchIndex);
    bindTtlOutputHelper(node, branchIndex);
    bindConditionBlockHelper(node, branchIndex);
    node.querySelector("[data-action='remove-branch']").addEventListener("click", () => {
      builderBranches.splice(branchIndex, 1);
      renderBranchEditor();
      syncJsonFromBuilder();
    });
    node.querySelector("[data-action='add-condition']").addEventListener("click", () => {
      builderBranches[branchIndex].conditions.push({
        source: "attribute",
        key: "",
        operator: "equals",
        value: "",
        compare_mode: "value",
        value_source_source: "attribute",
        value_source_key: ""
      });
      renderBranchEditor();
      syncJsonFromBuilder();
    });
    node.querySelector("[data-action='add-output']").addEventListener("click", () => {
      const outputs = parseJsonSafe(builderBranches[branchIndex].outputs || "{}");
      outputs[uniqueOutputFieldName(Object.keys(outputs), "new_field")] = "";
      builderBranches[branchIndex].outputs = JSON.stringify(outputs);
      renderBranchEditor();
      syncJsonFromBuilder();
    });
    node.querySelector("[data-action='apply-condition-block']").addEventListener("click", () => {
      applyConditionBlock(node, branchIndex);
    });

    const conditions = node.querySelector("[data-role='conditions']");
    branch.conditions.forEach((condition, conditionIndex) => {
      const conditionNode = document.querySelector("#condition-template").content.firstElementChild.cloneNode(true);
      bindConditionField(conditionNode, branchIndex, conditionIndex, "source");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "key");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "operator");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "value");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "compare_mode");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "value_source_source");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "value_source_key");
      bindSchemaKeySuggestions(conditionNode, branchIndex, conditionIndex);
      bindValueSourceSuggestions(conditionNode, branchIndex, conditionIndex);
      renderConditionCompareMode(conditionNode, builderBranches[branchIndex].conditions[conditionIndex]);
      conditionNode.querySelector("[data-action='remove-condition']").addEventListener("click", () => {
        builderBranches[branchIndex].conditions.splice(conditionIndex, 1);
        renderBranchEditor();
        syncJsonFromBuilder();
      });
      conditions.append(conditionNode);
    });

    branchEditor.append(node);
  });
  renderRuleGraph();
}

function switchBuilderMode() {
  const mode = document.querySelector("#builder-mode").value;
  if (mode === "graph" && (!graphBuilder.nodes || graphBuilder.nodes.length === 0)) {
    graphBuilder = starterGraphBuilder();
  }
  renderBuilderMode();
  syncJsonFromBuilder();
}

function renderBuilderMode() {
  const mode = document.querySelector("#builder-mode").value;
  const graphMode = mode === "graph";
  branchEditor.hidden = graphMode;
  graphEditor.hidden = !graphMode;
  document.querySelector("#add-branch").hidden = graphMode;
  document.querySelector("#fallback-result").closest("label").hidden = graphMode;
  document.querySelector("#fallback-outputs").closest("label").hidden = graphMode;
  if (graphMode) renderGraphBuilder();
  renderRuleGraph();
  renderRuleInspector();
}

function bindBranchSummary(node, branchIndex) {
  const target = node.querySelector("[data-role='branch-summary']");
  const branch = builderBranches[branchIndex];
  const outputs = parseJsonSafe(branch.outputs || "{}");
  const warnings = branchSummaryWarnings(branch, outputs);
  const items = [
    `${branch.conditions.length} condition${branch.conditions.length === 1 ? "" : "s"}`,
    `${Object.keys(outputs).length} output${Object.keys(outputs).length === 1 ? "" : "s"}`,
    outputs.ttl_seconds ? `offer TTL ${outputs.ttl_seconds}s` : "no offer TTL",
    branch.logic === "any" ? "match any" : "match all"
  ];
  target.innerHTML = [
    ...items.map((item) => `<span class="branch-chip">${escapeHtml(item)}</span>`),
    ...warnings.map((item) => `<span class="branch-chip warn">${escapeHtml(item)}</span>`)
  ].join("");
}

function branchSummaryWarnings(branch, outputs) {
  const warnings = [];
  if (!branch.conditions.length) warnings.push("no conditions");
  if (!Object.keys(outputs).length) warnings.push("no outputs");
  if (outputs.expires_at && Number.isNaN(Date.parse(outputs.expires_at))) warnings.push("invalid expiry");
  return warnings;
}

function bindConditionBlockHelper(node) {
  const select = node.querySelector("[data-field='condition-block']");
  const blocks = availableConditionBlocks();
  select.innerHTML = [
    `<option value="">Choose a reusable block</option>`,
    ...blocks.map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)}</option>`)
  ].join("");
}

function applyConditionBlock(node, branchIndex) {
  const select = node.querySelector("[data-field='condition-block']");
  const template = availableConditionBlocks().find((item) => item.id === select.value);
  if (!template) return;
  const surface = document.querySelector("#rule-surface").value.trim();
  const nextConditions = template.conditions.map((condition) => ({
    source: condition.source || "attribute",
    key: condition.key || "",
    operator: condition.operator || "equals",
    value: template.id === "surface_match" ? surface : (condition.value ?? ""),
    compare_mode: "value",
    value_source_source: "attribute",
    value_source_key: ""
  }));
  builderBranches[branchIndex].conditions.push(...nextConditions);
  renderBranchEditor();
  syncJsonFromBuilder();
}

function availableConditionBlocks() {
  return conditionBlocksLoaded ? cachedConditionBlocks : defaultConditionBlockTemplates;
}

function bindOutputFieldEditor(node, branchIndex) {
  const target = node.querySelector("[data-role='outputs']");
  const outputs = parseJsonSafe(builderBranches[branchIndex].outputs || "{}");
  const entries = Object.entries(outputs);
  target.innerHTML = entries.length
    ? entries.map(([key, value]) => outputFieldRow(key, value)).join("")
    : `<div class="grid-empty">No output fields yet.</div>`;
  target.querySelectorAll("[data-output-key]").forEach((input) => {
    input.addEventListener("change", () => updateOutputField(branchIndex, input.dataset.outputKey, input.value, null));
  });
  target.querySelectorAll("[data-output-type]").forEach((select) => {
    select.addEventListener("change", () => updateOutputFieldType(branchIndex, select.dataset.outputType, select.value));
  });
  target.querySelectorAll("[data-output-value]").forEach((input) => {
    input.addEventListener("input", () => updateOutputField(branchIndex, input.dataset.outputValue, null, input.value));
    input.addEventListener("change", syncJsonFromBuilder);
  });
  target.querySelectorAll("[data-remove-output]").forEach((button) => {
    button.addEventListener("click", () => {
      const outputs = parseJsonSafe(builderBranches[branchIndex].outputs || "{}");
      delete outputs[button.dataset.removeOutput];
      builderBranches[branchIndex].outputs = JSON.stringify(outputs);
      renderBranchEditor();
      syncJsonFromBuilder();
    });
  });
}

function outputFieldRow(key, value) {
  const type = outputValueType(value);
  return `
    <div class="output-field-row">
      <label>
        Field
        <input data-output-key="${escapeHtml(key)}" value="${escapeHtml(key)}" />
      </label>
      <label>
        Type
        <select data-output-type="${escapeHtml(key)}">
          <option value="static"${type === "static" ? " selected" : ""}>Static</option>
          <option value="reference"${type === "reference" ? " selected" : ""}>Reference</option>
          <option value="expression"${type === "expression" ? " selected" : ""}>Expression</option>
        </select>
      </label>
      <label>
        Value
        <input data-output-value="${escapeHtml(key)}" value="${escapeHtml(formatOutputValue(value))}" />
      </label>
      <button type="button" data-remove-output="${escapeHtml(key)}">Remove</button>
    </div>
  `;
}

function outputValueType(value) {
  if (typeof value === "string" && value.startsWith("=lookup(")) return "reference";
  if (typeof value === "string" && value.startsWith("=")) return "expression";
  return "static";
}

function formatOutputValue(value) {
  if (value == null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function updateOutputField(branchIndex, oldKey, nextKey, nextValue) {
  const outputs = parseJsonSafe(builderBranches[branchIndex].outputs || "{}");
  const key = nextKey ? slug(nextKey) : oldKey;
  const currentValue = outputs[oldKey];
  if (nextKey && key !== oldKey) delete outputs[oldKey];
  outputs[key] = nextValue == null ? currentValue : parseOutputInputValue(nextValue, currentValue);
  builderBranches[branchIndex].outputs = JSON.stringify(outputs);
  const advanced = branchEditor.querySelector(`[data-branch-index="${branchIndex}"] [data-field='outputs']`);
  if (advanced) advanced.value = builderBranches[branchIndex].outputs;
  renderRuleGraph();
}

function updateOutputFieldType(branchIndex, key, type) {
  const outputs = parseJsonSafe(builderBranches[branchIndex].outputs || "{}");
  const current = outputs[key];
  if (type === "reference" && !(typeof current === "string" && current.startsWith("=lookup("))) {
    const table = preferredLookupTable();
    const column = firstLookupValueColumn(table) || "field_name";
    outputs[key] = table ? `=lookup(${JSON.stringify(table.id)}, ${defaultLookupKeyExpression(table, outputs) || "\"\""}, ${JSON.stringify(column)})` : "=lookup(\"table_id\", \"key\", \"field\")";
  } else if (type === "expression" && !(typeof current === "string" && current.startsWith("=")) ) {
    outputs[key] = `=${formatOutputValue(current) || "\"\""}`;
  } else if (type === "static" && typeof current === "string" && current.startsWith("=")) {
    outputs[key] = "";
  }
  builderBranches[branchIndex].outputs = JSON.stringify(outputs);
  renderBranchEditor();
  syncJsonFromBuilder();
}

function parseOutputInputValue(raw, previousValue) {
  if (typeof previousValue === "string" && previousValue.startsWith("=")) return raw;
  return parseReferenceCell(raw);
}

function uniqueOutputFieldName(fields, base) {
  if (!fields.includes(base)) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base}_${index}`;
    if (!fields.includes(candidate)) return candidate;
  }
  return `${base}_${Date.now()}`;
}

function renderRuleGraph() {
  if (!ruleGraph) return;
  if (document.querySelector("#builder-mode").value === "graph") {
    renderAdvancedGraphPreview();
    return;
  }
  const fallbackResult = document.querySelector("#fallback-result").value.trim() || "deferred";
  const fallbackOutputs = parseJsonSafe(document.querySelector("#fallback-outputs").value || "{}");
  const branchCards = builderBranches.map((branch, index) => {
    const outputs = parseJsonSafe(branch.outputs || "{}");
    const conditionText = branch.conditions.length
      ? `${branch.conditions.length} ${branch.logic === "any" ? "any" : "all"} condition${branch.conditions.length === 1 ? "" : "s"}`
      : "No conditions";
    return `
      <button type="button" class="graph-node branch-node" data-graph-branch="${index}">
        <span class="graph-kicker">Branch ${index + 1}</span>
        <strong>${escapeHtml(branch.id || `branch_${index + 1}`)}</strong>
        <span>${escapeHtml(conditionText)}</span>
        <span>${escapeHtml(branch.result || "eligible")}</span>
        <small>${escapeHtml(Object.keys(outputs).length ? `${Object.keys(outputs).length} output field${Object.keys(outputs).length === 1 ? "" : "s"}` : "No outputs")}</small>
      </button>
    `;
  }).join("");
  ruleGraph.innerHTML = `
    <div class="graph-stage">
      <div class="graph-node input-node">
        <span class="graph-kicker">Input</span>
        <strong>Profile + context</strong>
        <span>Attributes, segments, identifiers</span>
      </div>
      <div class="graph-lane">
        ${branchCards || '<div class="graph-empty">Add a branch to start the decision flow.</div>'}
      </div>
      <div class="graph-node fallback-node">
        <span class="graph-kicker">Fallback</span>
        <strong>${escapeHtml(fallbackResult)}</strong>
        <span>${escapeHtml(Object.keys(fallbackOutputs).length ? `${Object.keys(fallbackOutputs).length} output field${Object.keys(fallbackOutputs).length === 1 ? "" : "s"}` : "No outputs")}</span>
      </div>
    </div>
  `;
  ruleGraph.querySelectorAll("[data-graph-branch]").forEach((button) => {
    button.addEventListener("click", () => {
      const branchIndex = Number(button.dataset.graphBranch);
      const target = branchEditor.querySelector(`[data-branch-index="${branchIndex}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("highlight");
      setTimeout(() => target?.classList.remove("highlight"), 900);
    });
  });
}

function renderAdvancedGraphPreview() {
  const nodes = graphBuilder.nodes || [];
  autoLayoutGraph(false);
  const layout = graphCanvasLayout();
  const cards = nodes.map((node) => {
    const edges = graphNodeEdges(node);
    const nodeLayout = normalizedGraphNodeLayout(node);
    return `
      <button
        type="button"
        class="graph-node branch-node graph-node-draggable"
        data-graph-node="${escapeHtml(node.id)}"
        style="left:${nodeLayout.x}px; top:${nodeLayout.y}px;"
        aria-label="Edit graph node ${escapeHtml(node.id || "node")}"
      >
        <span class="graph-drag-handle" data-graph-drag="${escapeHtml(node.id)}" title="Drag node">drag</span>
        <span class="graph-kicker">${escapeHtml(node.type || "node")}${node.id === graphBuilder.entry ? " / entry" : ""}</span>
        <strong>${escapeHtml(node.id || "node")}</strong>
        <span>${escapeHtml(graphNodeSummary(node))}</span>
        <small>${escapeHtml(edges.length ? `Routes to ${edges.join(", ")}` : "Terminal node")}</small>
      </button>
    `;
  }).join("");
  ruleGraph.innerHTML = `
    <div class="graph-stage advanced-graph-stage">
      <div class="graph-node input-node">
        <span class="graph-kicker">Entry</span>
        <strong>${escapeHtml(graphBuilder.entry || "input")}</strong>
        <span>${escapeHtml(nodes.length)} node${nodes.length === 1 ? "" : "s"}</span>
      </div>
      <div class="graph-node fallback-node">
        <span class="graph-kicker">Validation</span>
        <strong>${escapeHtml(graphReachabilitySummary())}</strong>
        <span>Draft JSON remains the source of truth.</span>
      </div>
      <div class="graph-canvas-shell">
        <div class="graph-canvas" style="width:${layout.width}px; height:${layout.height}px;">
          ${graphEdgeSvg(layout.width, layout.height)}
          ${cards || '<div class="graph-empty graph-canvas-empty">Create a graph template or add a node.</div>'}
        </div>
      </div>
    </div>
  `;
  ruleGraph.querySelectorAll("[data-graph-node]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.dragged === "true") {
        button.dataset.dragged = "false";
        return;
      }
      const target = graphNodeEditor.querySelector(`[data-node-id="${cssEscape(button.dataset.graphNode)}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("highlight");
      setTimeout(() => target?.classList.remove("highlight"), 900);
    });
  });
  bindGraphNodeDrag();
}

function normalizedGraphNodeLayout(node) {
  const layout = node.layout && typeof node.layout === "object" && !Array.isArray(node.layout) ? node.layout : {};
  return {
    x: Number.isFinite(Number(layout.x)) ? Math.max(16, Number(layout.x)) : 16,
    y: Number.isFinite(Number(layout.y)) ? Math.max(16, Number(layout.y)) : 16
  };
}

function autoLayoutGraph(force = false) {
  const nodes = graphBuilder.nodes || [];
  if (!nodes.length) return;
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const depthById = new Map();
  const queue = [{ id: graphBuilder.entry || nodes[0].id, depth: 0 }];
  while (queue.length) {
    const current = queue.shift();
    if (!current.id || depthById.has(current.id)) continue;
    depthById.set(current.id, current.depth);
    const node = nodeMap.get(current.id);
    if (!node) continue;
    graphNodeEdges(node).forEach((target) => queue.push({ id: target, depth: current.depth + 1 }));
  }
  nodes.forEach((node) => {
    if (!depthById.has(node.id)) depthById.set(node.id, depthById.size ? Math.max(...depthById.values()) + 1 : 0);
  });
  const rowsByDepth = new Map();
  nodes.forEach((node, index) => {
    const depth = depthById.get(node.id) || 0;
    const row = rowsByDepth.get(depth) || 0;
    rowsByDepth.set(depth, row + 1);
    if (force || !node.layout || !Number.isFinite(Number(node.layout.x)) || !Number.isFinite(Number(node.layout.y))) {
      node.layout = {
        x: 24 + depth * 250,
        y: 24 + row * 150 + (index % 2 ? 12 : 0)
      };
    }
  });
}

function graphCanvasLayout() {
  const nodeWidth = 210;
  const nodeHeight = 124;
  const layouts = (graphBuilder.nodes || []).map(normalizedGraphNodeLayout);
  const maxX = Math.max(620, ...layouts.map((layout) => layout.x + nodeWidth + 24));
  const maxY = Math.max(320, ...layouts.map((layout) => layout.y + nodeHeight + 24));
  return { width: maxX, height: maxY, nodeWidth, nodeHeight };
}

function graphEdgeSvg(width, height) {
  const nodes = new Map((graphBuilder.nodes || []).map((node) => [node.id, node]));
  const layout = graphCanvasLayout();
  const lines = [];
  for (const node of graphBuilder.nodes || []) {
    const from = normalizedGraphNodeLayout(node);
    const targets = graphNodeEdges(node);
    targets.forEach((target) => {
      const targetNode = nodes.get(target);
      if (!targetNode) return;
      const to = normalizedGraphNodeLayout(targetNode);
      lines.push(`
        <line
          x1="${from.x + layout.nodeWidth}"
          y1="${from.y + layout.nodeHeight / 2}"
          x2="${to.x}"
          y2="${to.y + layout.nodeHeight / 2}"
        ></line>
      `);
    });
  }
  return `<svg class="graph-edge-svg" width="${width}" height="${height}" aria-hidden="true">${lines.join("")}</svg>`;
}

function bindGraphNodeDrag() {
  ruleGraph.querySelectorAll("[data-graph-drag]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      const button = handle.closest("[data-graph-node]");
      const node = (graphBuilder.nodes || []).find((item) => item.id === button?.dataset.graphNode);
      const canvas = ruleGraph.querySelector(".graph-canvas");
      if (!button || !node || !canvas) return;
      event.preventDefault();
      event.stopPropagation();
      const start = { x: event.clientX, y: event.clientY };
      const original = normalizedGraphNodeLayout(node);
      let moved = false;
      const move = (moveEvent) => {
        const canvasRect = canvas.getBoundingClientRect();
        const next = {
          x: Math.max(16, Math.min(canvasRect.width - 226, original.x + moveEvent.clientX - start.x)),
          y: Math.max(16, Math.min(canvasRect.height - 140, original.y + moveEvent.clientY - start.y))
        };
        moved = moved || Math.abs(next.x - original.x) > 4 || Math.abs(next.y - original.y) > 4;
        node.layout = { x: Math.round(next.x), y: Math.round(next.y) };
        button.style.left = `${node.layout.x}px`;
        button.style.top = `${node.layout.y}px`;
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (moved) {
          button.dataset.dragged = "true";
          renderRuleGraph();
          syncJsonFromBuilder();
        }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
    });
  });
}

function renderGraphBuilder() {
  document.querySelector("#graph-entry").value = graphBuilder.entry || "";
  graphNodeEditor.innerHTML = (graphBuilder.nodes || []).map((node, index) => graphNodeEditorCard(node, index)).join("");
  graphNodeEditor.querySelectorAll("[data-graph-field]").forEach((input) => {
    input.addEventListener("input", () => updateGraphNodeField(Number(input.dataset.nodeIndex), input.dataset.graphField, input.value));
    input.addEventListener("change", () => {
      if (["table", "message_id", "type"].includes(input.dataset.graphField)) renderGraphBuilder();
      syncJsonFromBuilder();
    });
  });
  graphNodeEditor.querySelectorAll("[data-remove-graph-node]").forEach((button) => {
    button.addEventListener("click", () => {
      graphBuilder.nodes.splice(Number(button.dataset.removeGraphNode), 1);
      renderGraphBuilder();
      syncJsonFromBuilder();
    });
  });
  renderRuleGraph();
}

function graphNodeEditorCard(node, index) {
  return `
    <section class="graph-edit-card" data-node-id="${escapeHtml(node.id || "")}">
      <div class="graph-edit-head">
        <label>
          Node ID
          <input data-node-index="${index}" data-graph-field="id" value="${escapeHtml(node.id || "")}" />
        </label>
        <label>
          Type
          <select data-node-index="${index}" data-graph-field="type">
            ${graphNodeTypes().map((type) => `<option value="${type}"${node.type === type ? " selected" : ""}>${graphNodeTypeLabel(type)}</option>`).join("")}
          </select>
        </label>
        <label>
          Next
          <input data-node-index="${index}" data-graph-field="next" value="${escapeHtml(node.next || "")}" />
        </label>
        <button type="button" data-remove-graph-node="${index}">Remove</button>
      </div>
      <div class="graph-edge-line">${escapeHtml(graphNodeEdges(node).length ? `Edges: ${graphNodeEdges(node).join(", ")}` : "Terminal or incomplete node")}</div>
      <div class="graph-edit-fields">
        ${graphNodeSpecificFields(node, index)}
      </div>
    </section>
  `;
}

function graphNodeSpecificFields(node, index) {
  const field = (name, label, value = node[name] ?? "", attrs = "") => `
    <label>
      ${label}
      <input data-node-index="${index}" data-graph-field="${name}" value="${escapeHtml(formatOutputValue(value))}" ${attrs} />
    </label>
  `;
  const lookupTableList = graphDatalist(`graph-lookup-tables-${index}`, cachedLookupTables.map((item) => item.id));
  const lookupColumnList = graphDatalist(`graph-lookup-columns-${index}`, lookupColumns(lookupTableById(node.table)));
  const lookupExpressionList = graphDatalist(`graph-lookup-expressions-${index}`, graphLookupExpressionSuggestions(node));
  const messageList = graphDatalist(`graph-messages-${index}`, cachedMessages.map((item) => item.id));
  const surfaceList = graphDatalist(`graph-surfaces-${index}`, graphSurfaceSuggestions());
  const ruleList = graphDatalist(`graph-decisions-${index}`, cachedRuleSets.map((item) => item.decision_key));
  const eventList = graphDatalist(`graph-event-types-${index}`, ["impression", "exposure"]);
  if (node.type === "condition") {
    return [
      field("expression", "Expression"),
      field("true", "True route"),
      field("false", "False route")
    ].join("");
  }
  if (node.type === "score") {
    return [
      field("label", "Score label"),
      field("rules", "Rules JSON", JSON.stringify(node.rules || []))
    ].join("");
  }
  if (node.type === "lookup") {
    return [
      field("table", "Reference table", node.table, `list="graph-lookup-tables-${index}"`),
      field("key_expression", "Key expression", node.key_expression, `list="graph-lookup-expressions-${index}"`),
      field("column", "Field to return", node.column, `list="graph-lookup-columns-${index}"`),
      field("output_key", "Store as context"),
      lookupTableList,
      lookupColumnList,
      lookupExpressionList
    ].join("");
  }
  if (node.type === "frequency_cap") {
    return [
      field("event_type", "Event type", node.event_type || "impression", `list="graph-event-types-${index}"`),
      field("max", "Max events"),
      field("window_days", "Window days"),
      field("decision_key", "Decision key", node.decision_key || "", `list="graph-decisions-${index}"`),
      field("message_id", "Message ID", node.message_id, `list="graph-messages-${index}"`),
      field("surface", "Surface", node.surface, `list="graph-surfaces-${index}"`),
      field("capped", "Capped route"),
      field("output_key", "Store count as"),
      eventList,
      ruleList,
      messageList,
      surfaceList
    ].join("");
  }
  if (["output", "fallback", "error"].includes(node.type)) {
    return [
      field("result", "Result"),
      field("outputs", "Outputs JSON", JSON.stringify(node.outputs || {}))
    ].join("");
  }
  return [
    field("defaults", "Defaults JSON", JSON.stringify(node.defaults || {}))
  ].join("");
}

function updateGraphNodeField(index, field, rawValue) {
  const node = graphBuilder.nodes[index];
  if (!node) return;
  if (field === "id" && graphBuilder.entry === node.id) graphBuilder.entry = rawValue.trim();
  if (["rules", "outputs", "defaults"].includes(field)) {
    node[field] = parseJsonSafe(rawValue, field === "rules" ? [] : {});
  } else if (["max", "window_days"].includes(field)) {
    node[field] = Number(rawValue || 0);
  } else if (rawValue.trim() === "") {
    delete node[field];
  } else {
    node[field] = field === "id" ? rawValue.trim() : rawValue;
  }
  applyGraphNodeHelpers(node, field);
  if (field === "type") Object.assign(node, graphNodeDefaults(node.type, node.id));
  renderRuleGraph();
}

function applyGraphNodeHelpers(node, field) {
  if (node.type === "lookup" && field === "table") {
    const table = lookupTableById(node.table);
    const column = firstLookupValueColumn(table);
    if (column && !node.column) node.column = column;
    if (table && (!node.key_expression || node.key_expression === "\"\"")) node.key_expression = defaultLookupKeyExpression(table, {});
  }
  if (node.type === "frequency_cap" && field === "message_id") {
    const message = cachedMessages.find((item) => item.id === node.message_id);
    if (message?.surface && !node.surface) node.surface = message.surface;
  }
}

function graphDatalist(id, values) {
  const unique = [...new Set((values || []).filter((value) => value != null && String(value).trim() !== "").map(String))];
  return `<datalist id="${escapeHtml(id)}">${unique.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("")}</datalist>`;
}

function graphLookupExpressionSuggestions(node) {
  const table = lookupTableById(node.table);
  const tableKey = table?.key_column;
  return [
    ...(tableKey ? [`attribute("${tableKey}")`, `context("${tableKey}")`] : []),
    ...schemaItemsForSource("attribute").slice(0, 25).map((item) => `attribute("${item.name}")`),
    ...schemaItemsForSource("context").slice(0, 25).map((item) => `context("${item.name}")`)
  ];
}

function graphSurfaceSuggestions() {
  return [
    ...cachedMessages.map((item) => item.surface),
    ...cachedRuleSets.map((item) => item.surface)
  ];
}

function addGraphNode() {
  const type = document.querySelector("#graph-new-node-type").value;
  const id = uniqueGraphNodeId(type);
  graphBuilder.nodes.push(graphNodeDefaults(type, id));
  renderGraphBuilder();
  syncJsonFromBuilder();
}

function starterGraphBuilder() {
  return {
    entry: "input",
    nodes: [
      { id: "input", type: "input", next: "condition" },
      { id: "condition", type: "condition", expression: "attribute(\"lead_score\") >= 50", true: "eligible", false: "fallback" },
      { id: "eligible", type: "output", result: "eligible", outputs: {} },
      { id: "fallback", type: "output", result: "deferred", outputs: {} }
    ]
  };
}

function graphNodeDefaults(type, id) {
  const base = { id, type };
  if (type === "input") return { ...base, next: "" };
  if (type === "condition") return { ...base, expression: "attribute(\"lead_score\") >= 50", true: "", false: "" };
  if (type === "score") return { ...base, label: id, rules: [], next: "" };
  if (type === "lookup") {
    const table = preferredLookupTable();
    return {
      ...base,
      table: table?.id || "",
      key_expression: defaultLookupKeyExpression(table, {}) || "\"\"",
      column: firstLookupValueColumn(table) || "",
      output_key: id,
      next: ""
    };
  }
  if (type === "frequency_cap") {
    const message = cachedMessages.find((item) => item.status !== "archived") || cachedMessages[0];
    return {
      ...base,
      event_type: "impression",
      max: 3,
      window_days: 7,
      decision_key: "",
      message_id: message?.id || "",
      surface: message?.surface || "",
      next: "",
      capped: ""
    };
  }
  return { ...base, result: type === "fallback" ? "deferred" : "eligible", outputs: {} };
}

function graphNodeTypes() {
  return ["input", "condition", "score", "lookup", "frequency_cap", "output", "fallback", "error"];
}

function graphNodeTypeLabel(type) {
  return {
    input: "Input",
    condition: "Condition",
    score: "Score",
    lookup: "Reference lookup",
    frequency_cap: "Frequency cap",
    output: "Output",
    fallback: "Fallback",
    error: "Error"
  }[type] || type;
}

function uniqueGraphNodeId(type) {
  const ids = new Set((graphBuilder.nodes || []).map((node) => node.id));
  const base = slug(type || "node");
  for (let index = 1; index < 100; index += 1) {
    const id = `${base}_${index}`;
    if (!ids.has(id)) return id;
  }
  return `${base}_${Date.now()}`;
}

function graphNodeEdges(node) {
  return ["next", "true", "false", "capped", "fallback"]
    .map((field) => node[field])
    .filter(Boolean);
}

function graphNodeSummary(node) {
  if (node.type === "condition") return node.expression || "No expression";
  if (node.type === "score") return `${(node.rules || []).length} scoring rule${(node.rules || []).length === 1 ? "" : "s"}`;
  if (node.type === "lookup") return [node.table, node.column].filter(Boolean).join(" / ") || "Reference lookup";
  if (node.type === "frequency_cap") return `Max ${node.max || 0} in ${node.window_days || 0} days`;
  if (["output", "fallback", "error"].includes(node.type)) return node.result || "deferred";
  return "Defaults and routing";
}

function graphReachabilitySummary() {
  const nodes = new Map((graphBuilder.nodes || []).map((node) => [node.id, node]));
  const visited = new Set();
  const stack = [graphBuilder.entry];
  while (stack.length) {
    const id = stack.pop();
    if (!id || visited.has(id)) continue;
    visited.add(id);
    const node = nodes.get(id);
    if (!node) continue;
    stack.push(...graphNodeEdges(node));
  }
  const unreachable = (graphBuilder.nodes || []).filter((node) => !visited.has(node.id)).length;
  return unreachable ? `${unreachable} unreachable` : "All reachable";
}

function graphFromBuilder() {
  return {
    graph: {
      entry: graphBuilder.entry || "input",
      nodes: (graphBuilder.nodes || []).map((node) => cleanGraphNode(node))
    }
  };
}

function cleanGraphNode(node) {
  const copy = {};
  for (const [key, value] of Object.entries(node)) {
    if (value === "" || value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue;
    copy[key] = value;
  }
  return copy;
}

function bindLookupOutputHelper(node, branchIndex) {
  const branch = builderBranches[branchIndex];
  const targetInput = node.querySelector("[data-helper='target']");
  const tableInput = node.querySelector("[data-helper='table']");
  const keyInput = node.querySelector("[data-helper='key']");
  const columnInput = node.querySelector("[data-helper='column']");
  const outputs = parseJsonSafe(branch.outputs || "{}");
  const existingLookup = firstLookupOutput(outputs);
  const defaultTable = existingLookup?.table || preferredLookupTable()?.id || "";
  const table = lookupTableById(defaultTable);
  const defaultColumn = existingLookup?.column || firstLookupValueColumn(table) || "";
  targetInput.value = existingLookup?.target || defaultColumn;
  tableInput.value = defaultTable;
  keyInput.value = existingLookup?.keyExpression || defaultLookupKeyExpression(table, outputs);
  columnInput.value = defaultColumn;
  attachLookupDatalist(tableInput, "lookup-table-options", cachedLookupTables.map((item) => item.id));
  setLookupColumnDatalist(columnInput, table);
  tableInput.addEventListener("input", () => {
    const nextTable = lookupTableById(tableInput.value.trim());
    setLookupColumnDatalist(columnInput, nextTable);
    const nextColumn = firstLookupValueColumn(nextTable);
    if (nextColumn) {
      columnInput.value = nextColumn;
      if (!targetInput.value || targetInput.value === columnInput.defaultValue) targetInput.value = nextColumn;
    }
    const nextKeyExpression = defaultLookupKeyExpression(nextTable, outputs);
    if (nextKeyExpression) keyInput.placeholder = nextKeyExpression;
  });
  node.querySelector("[data-action='apply-lookup-output']").addEventListener("click", () => {
    try {
      const target = slug(targetInput.value || columnInput.value);
      const table = tableInput.value.trim();
      const keyExpression = keyInput.value.trim();
      const column = columnInput.value.trim();
      if (!target || !table || !keyExpression || !column) throw new Error("Reference data output needs target, table, key expression, and returned field");
      const nextOutputs = parseJsonField(null, `Outputs for ${branch.id || `branch_${branchIndex + 1}`}`, branch.outputs || "{}");
      nextOutputs[target] = `=lookup(${JSON.stringify(table)}, ${keyExpression}, ${JSON.stringify(column)})`;
      branch.outputs = JSON.stringify(nextOutputs);
      renderBranchEditor();
      syncJsonFromBuilder();
    } catch (error) {
      editorOutput.textContent = error.message;
    }
  });
}

function bindTtlOutputHelper(node, branchIndex) {
  const branch = builderBranches[branchIndex];
  const ttlInput = node.querySelector("[data-helper='ttl-seconds']");
  const expiresInput = node.querySelector("[data-helper='expires-at']");
  const outputs = parseJsonSafe(branch.outputs || "{}");
  ttlInput.value = outputs.ttl_seconds || "";
  expiresInput.value = outputs.expires_at ? toDateTimeLocal(outputs.expires_at) : "";
  node.querySelector("[data-action='apply-ttl-output']").addEventListener("click", () => {
    const nextOutputs = parseJsonSafe(branch.outputs || "{}");
    const ttl = Number(ttlInput.value || 0);
    if (Number.isFinite(ttl) && ttl > 0) nextOutputs.ttl_seconds = ttl;
    else delete nextOutputs.ttl_seconds;
    if (expiresInput.value) nextOutputs.expires_at = new Date(expiresInput.value).toISOString();
    else delete nextOutputs.expires_at;
    branch.outputs = JSON.stringify(nextOutputs);
    renderBranchEditor();
    syncJsonFromBuilder();
  });
  node.querySelector("[data-action='clear-ttl-output']").addEventListener("click", () => {
    const nextOutputs = parseJsonSafe(branch.outputs || "{}");
    delete nextOutputs.ttl_seconds;
    delete nextOutputs.expires_at;
    branch.outputs = JSON.stringify(nextOutputs);
    renderBranchEditor();
    syncJsonFromBuilder();
  });
}

function toDateTimeLocal(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function firstLookupOutput(outputs) {
  for (const [target, value] of Object.entries(outputs || {})) {
    if (typeof value !== "string") continue;
    const match = value.match(/^=lookup\("([^"]+)",\s*(.+),\s*"([^"]+)"\)$/);
    if (match) return { target, table: match[1], keyExpression: match[2].trim(), column: match[3] };
  }
  return null;
}

function preferredLookupTable() {
  return cachedLookupTables[0] || null;
}

function lookupTableById(id) {
  return cachedLookupTables.find((item) => item.id === id) || null;
}

function lookupColumns(table) {
  if (!table) return [];
  return [...new Set((table.rows || []).flatMap((rowItem) => Object.keys(rowItem || {})))];
}

function firstLookupValueColumn(table) {
  const columns = lookupColumns(table);
  return columns.find((column) => column !== table?.key_column) || columns[0] || "";
}

function defaultLookupKeyExpression(table, outputs) {
  if (table?.key_column && outputs[table.key_column] != null) return `outputs.${table.key_column}`;
  if (table?.rows?.[0]?.[table.key_column] != null) return JSON.stringify(table.rows[0][table.key_column]);
  return table?.key_column ? `attributes.${table.key_column}` : "";
}

function attachLookupDatalist(input, id, values) {
  const list = document.createElement("datalist");
  list.id = `${id}-${Math.random().toString(16).slice(2)}`;
  list.innerHTML = values.map((value) => `<option value="${escapeHtml(String(value))}"></option>`).join("");
  input.setAttribute("list", list.id);
  input.after(list);
}

function setLookupColumnDatalist(input, table) {
  input.nextElementSibling?.matches("datalist[data-lookup-columns='true']") && input.nextElementSibling.remove();
  const columns = lookupColumns(table);
  const list = document.createElement("datalist");
  list.dataset.lookupColumns = "true";
  list.id = `lookup-column-options-${Math.random().toString(16).slice(2)}`;
  list.innerHTML = columns.map((value) => `<option value="${escapeHtml(String(value))}"></option>`).join("");
  input.setAttribute("list", list.id);
  input.after(list);
}

function bindBranchField(node, branchIndex, field) {
  const input = node.querySelector(`[data-field='${field}']`);
  input.value = builderBranches[branchIndex][field] || "";
  input.addEventListener("input", () => {
    builderBranches[branchIndex][field] = input.value;
    syncJsonFromBuilder();
  });
  input.addEventListener("change", syncJsonFromBuilder);
}

function bindConditionField(node, branchIndex, conditionIndex, field) {
  const input = node.querySelector(`[data-field='${field}']`);
  input.value = builderBranches[branchIndex].conditions[conditionIndex][field] ?? "";
  input.addEventListener("input", () => {
    builderBranches[branchIndex].conditions[conditionIndex][field] = input.value;
    if (field === "source") {
      builderBranches[branchIndex].conditions[conditionIndex].key = "";
      renderBranchEditor();
    }
    if (field === "value_source_source") {
      builderBranches[branchIndex].conditions[conditionIndex].value_source_key = "";
      renderBranchEditor();
    }
    if (field === "compare_mode") renderConditionCompareMode(node, builderBranches[branchIndex].conditions[conditionIndex]);
    syncJsonFromBuilder();
  });
  input.addEventListener("change", () => {
    if (["source", "value_source_source", "compare_mode"].includes(field)) renderBranchEditor();
    syncJsonFromBuilder();
  });
}

function bindSchemaKeySuggestions(node, branchIndex, conditionIndex) {
  const keyInput = node.querySelector("[data-field='key']");
  const source = builderBranches[branchIndex].conditions[conditionIndex].source || "attribute";
  const items = schemaItemsForSource(source);
  if (!items.length) {
    keyInput.removeAttribute("list");
    return;
  }
  const list = document.createElement("datalist");
  list.id = `schema-options-${branchIndex}-${conditionIndex}`;
  list.innerHTML = items
    .map((item) => `<option value="${escapeHtml(item.name)}" label="${escapeHtml([item.type, item.dimension].filter(Boolean).join(" / "))}"></option>`)
    .join("");
  keyInput.setAttribute("list", list.id);
  keyInput.after(list);
}

function bindValueSourceSuggestions(node, branchIndex, conditionIndex) {
  const keyInput = node.querySelector("[data-field='value_source_key']");
  const source = builderBranches[branchIndex].conditions[conditionIndex].value_source_source || "attribute";
  const items = schemaItemsForSource(source);
  if (!items.length) {
    keyInput.removeAttribute("list");
    return;
  }
  const list = document.createElement("datalist");
  list.id = `value-source-options-${branchIndex}-${conditionIndex}`;
  list.innerHTML = items
    .map((item) => `<option value="${escapeHtml(item.name)}" label="${escapeHtml([item.type, item.dimension].filter(Boolean).join(" / "))}"></option>`)
    .join("");
  keyInput.setAttribute("list", list.id);
  keyInput.after(list);
}

function renderConditionCompareMode(node, condition) {
  const mode = condition.compare_mode || "value";
  node.classList.toggle("field-mode", mode === "field");
  node.classList.toggle("value-mode", mode !== "field");
}

function syncJsonFromBuilder() {
  clearInvalid();
  try {
    const draft = document.querySelector("#builder-mode").value === "graph" ? graphFromBuilder() : draftFromBuilder();
    validateDraft(draft);
    document.querySelector("#rule-draft").value = JSON.stringify(draft, null, 2);
    renderRuleGraph();
    renderRuleInspector();
    editorOutput.textContent = `Draft synced${formatSchemaWarnings(schemaReferenceWarnings(draft))}`;
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

function syncBuilderFromJson() {
  clearInvalid();
  try {
    const draft = JSON.parse(document.querySelector("#rule-draft").value);
    validateDraft(draft);
    if (draft.graph) {
      document.querySelector("#builder-mode").value = "graph";
      graphBuilder = {
        entry: draft.graph.entry || "input",
        nodes: (draft.graph.nodes || []).map((node) => ({ ...node }))
      };
      renderBuilderMode();
    } else {
      document.querySelector("#builder-mode").value = "branches";
      document.querySelector("#fallback-result").value = draft.fallback?.result || "deferred";
      document.querySelector("#fallback-outputs").value = JSON.stringify(draft.fallback?.outputs || {});
      builderBranches = (draft.branches || []).map((branch, index) => branchToBuilder(branch, index));
      if (builderBranches.length === 0) builderBranches = [newBranch(1)];
      renderBranchEditor();
      renderBuilderMode();
    }
    renderRuleInspector();
    editorOutput.textContent = "Builder synced";
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

function draftFromBuilder() {
  return {
    fallback: {
      result: document.querySelector("#fallback-result").value.trim() || "deferred",
      outputs: parseJsonField(document.querySelector("#fallback-outputs"), "Fallback outputs")
    },
    branches: builderBranches.map((branch, index) => {
      const conditions = branch.conditions.map(conditionFromBuilder);
      const when = conditions.length === 1 ? conditions[0] : { [branch.logic || "all"]: conditions };
      return {
        id: slug(branch.id || `branch_${index + 1}`),
        label: branch.id || `Branch ${index + 1}`,
        when,
        result: branch.result || "eligible",
        outputs: parseJsonField(null, `Outputs for ${branch.id || `branch_${index + 1}`}`, branch.outputs || "{}")
      };
    })
  };
}

function conditionFromBuilder(condition) {
  const output = {
    source: condition.source || "attribute",
    key: condition.key || "",
    operator: condition.operator || "equals"
  };
  if (!["is_blank", "is_not_blank"].includes(output.operator)) {
    if (condition.compare_mode === "field") {
      output.value_source = {
        source: condition.value_source_source || "attribute",
        key: condition.value_source_key || ""
      };
    } else {
      output.value = condition.operator === "in" || condition.operator === "not_in"
        ? String(condition.value || "").split(",").map((item) => parseLiteral(item.trim()))
        : parseLiteral(String(condition.value ?? "").trim());
    }
  }
  return output;
}

function branchToBuilder(branch, index) {
  const group = branch.when?.all ? "all" : branch.when?.any ? "any" : "all";
  const conditions = branch.when?.all || branch.when?.any || (branch.when ? [branch.when] : []);
  return {
    id: branch.id || `branch_${index + 1}`,
    result: branch.result || "eligible",
    outputs: JSON.stringify(branch.outputs || {}),
    logic: group,
    conditions: conditions.map((condition) => ({
      source: condition.source || "attribute",
      key: condition.key || "",
      operator: condition.operator || "equals",
      value: Array.isArray(condition.value) ? condition.value.join(", ") : condition.value ?? "",
      compare_mode: condition.value_source ? "field" : "value",
      value_source_source: condition.value_source?.source || "attribute",
      value_source_key: condition.value_source?.key || ""
    }))
  };
}

function parseJsonField(input, label, raw = input?.value) {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("must be an object");
    return parsed;
  } catch {
    input?.classList.add("invalid");
    throw new Error(`${label} must be valid JSON object syntax`);
  }
}

function parseJsonSafe(raw, fallback = {}) {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseJsonStrict(raw, label = "JSON") {
  try {
    return JSON.parse(raw || "null");
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function validateDraft(draft) {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) throw new Error("Draft must be a JSON object");
  if (draft.graph) {
    validateGraphDraft(draft.graph);
    return;
  }
  if (!Array.isArray(draft.branches)) throw new Error("Draft must include a branches array");
  if (draft.branches.length === 0) throw new Error("Draft needs at least one branch");
  draft.branches.forEach((branch, index) => {
    if (!branch.id) throw new Error(`Branch ${index + 1} needs an ID`);
    if (!branch.result) throw new Error(`Branch ${branch.id} needs a result`);
    validateConditionGroup(branch.when, `Branch ${branch.id}`, 1);
  });
}

function validateGraphDraft(graph) {
  if (!graph || typeof graph !== "object" || Array.isArray(graph)) throw new Error("Graph must be a JSON object");
  if (!graph.entry) throw new Error("Graph needs an entry node");
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) throw new Error("Graph needs at least one node");
  const ids = new Set();
  graph.nodes.forEach((node) => {
    if (!node.id) throw new Error("Every graph node needs an ID");
    if (ids.has(node.id)) throw new Error(`Duplicate graph node ID: ${node.id}`);
    ids.add(node.id);
  });
  if (!ids.has(graph.entry)) throw new Error(`Graph entry node does not exist: ${graph.entry}`);
  graph.nodes.forEach((node) => {
    graphNodeEdges(node).forEach((target) => {
      if (!ids.has(target)) throw new Error(`Graph node ${node.id} routes to missing node: ${target}`);
    });
  });
}

function validateConditionGroup(group, label, depth) {
  if (!group || typeof group !== "object" || Array.isArray(group)) throw new Error(`${label} needs a condition`);
  if (depth > 3) throw new Error(`${label} exceeds 3 condition levels`);
  if (group.all || group.any) {
    const children = group.all || group.any;
    if (!Array.isArray(children) || children.length === 0) throw new Error(`${label} has an empty condition group`);
    children.forEach((child) => validateConditionGroup(child, label, depth + 1));
    return;
  }
  if (!group.source || !group.key || !group.operator) throw new Error(`${label} has an incomplete condition`);
  if (group.value_source && (!group.value_source.source || !group.value_source.key)) {
    throw new Error(`${label} has an incomplete compare field`);
  }
}

function schemaItemsForSource(source) {
  const kind = source === "attribute" ? "attribute" : source === "segment" ? "segment" : source === "context" ? "context" : null;
  return kind ? cachedSchema.filter((item) => item.kind === kind) : [];
}

function schemaReferenceWarnings(draft) {
  if (!draft || draft.graph) return [];
  const warnings = [];
  for (const branch of draft.branches || []) collectSchemaWarnings(branch.when, branch.id || branch.label || "branch", warnings);
  return [...new Set(warnings)];
}

function collectSchemaWarnings(group, label, warnings) {
  if (!group || typeof group !== "object" || Array.isArray(group)) return;
  for (const key of ["all", "any"]) {
    if (Array.isArray(group[key])) {
      group[key].forEach((child) => collectSchemaWarnings(child, label, warnings));
      return;
    }
  }
  if (group.not) {
    collectSchemaWarnings(group.not, label, warnings);
    return;
  }
  if (group.expression) return;
  const items = schemaItemsForSource(group.source);
  if (items.length && !items.some((item) => item.name === group.key)) {
    warnings.push(`${label}: ${group.source}.${group.key || "(empty)"} is not in cached schema`);
  }
  if (group.value_source) {
    const valueItems = schemaItemsForSource(group.value_source.source);
    if (valueItems.length && !valueItems.some((item) => item.name === group.value_source.key)) {
      warnings.push(`${label}: ${group.value_source.source}.${group.value_source.key || "(empty)"} is not in cached schema`);
    }
  }
}

function formatSchemaWarnings(warnings) {
  return warnings.length ? `\n\nSchema warnings:\n${warnings.map((item) => `- ${item}`).join("\n")}` : "";
}

function clearInvalid() {
  document.querySelectorAll(".invalid").forEach((item) => item.classList.remove("invalid"));
}

function slug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "branch";
}

function openLookupDetail() {
  if (!lookupDetailModal) return;
  lookupDetailModal.hidden = false;
}

function closeLookupDetail() {
  if (!lookupDetailModal) return;
  lookupDetailModal.hidden = true;
}

function newLookup(options = {}) {
  selectedLookupId = null;
  document.querySelector("#lookup-id").value = "reference_table";
  document.querySelector("#lookup-id").disabled = false;
  document.querySelector("#lookup-name").value = "Reference Table";
  document.querySelector("#lookup-key-column").value = "key";
  document.querySelector("#lookup-rows").value = JSON.stringify(
    [
      { key: "A", label: "Segment A", priority: 80 },
      { key: "B", label: "Segment B", priority: 40 }
    ],
    null,
    2
  );
  renderReferenceGrid();
  document.querySelector("#lookup-csv").value = "";
  loadLookupVersions(null);
  renderLookupInspector();
  lookupOutput.textContent = "Ready for a new reference table";
  if (!options.silent) openLookupDetail();
}

function referenceRowsFromJson() {
  const rowsInput = document.querySelector("#lookup-rows");
  try {
    const rows = JSON.parse(rowsInput.value || "[]");
    if (!Array.isArray(rows)) throw new Error("Rows JSON must be an array");
    return rows.map((rowItem) => rowItem && typeof rowItem === "object" && !Array.isArray(rowItem) ? rowItem : {});
  } catch (error) {
    rowsInput.classList.add("invalid");
    throw error;
  }
}

function referenceColumns(rows = referenceRowsFromJson()) {
  return referenceColumnsFromRows(rows);
}

function referenceColumnsFromRows(rows) {
  const keyColumn = document.querySelector("#lookup-key-column").value.trim() || "key";
  const discovered = [...new Set((rows || []).flatMap((rowItem) => Object.keys(rowItem || {})))];
  return [keyColumn, ...discovered.filter((column) => column !== keyColumn)];
}

function renderReferenceGrid() {
  clearInvalid();
  let rows;
  try {
    rows = referenceRowsFromJson();
  } catch (error) {
    referenceGrid.innerHTML = `<div class="grid-empty">${escapeHtml(error.message)}</div>`;
    return;
  }
  const columns = referenceColumns(rows);
  const headerCells = columns
    .map((column) => `
      <div class="reference-header-cell">
        <input data-column-name="${escapeHtml(column)}" value="${escapeHtml(column)}" />
        <button type="button" data-remove-column="${escapeHtml(column)}">Remove</button>
      </div>
    `)
    .join("");
  const bodyRows = rows
    .map((rowItem, rowIndex) => `
      <div class="reference-grid-row">
        ${columns.map((column) => `
          <input data-row-index="${rowIndex}" data-column="${escapeHtml(column)}" value="${escapeHtml(formatReferenceCell(rowItem[column]))}" />
        `).join("")}
        <button type="button" data-remove-row="${rowIndex}">Remove</button>
      </div>
    `)
    .join("");
  referenceGrid.style.setProperty("--reference-columns", `repeat(${Math.max(columns.length, 1)}, minmax(130px, 1fr)) 82px`);
  referenceGrid.innerHTML = `
    <div class="reference-grid-row header-row">${headerCells}<div></div></div>
    ${bodyRows || `<div class="grid-empty">No rows yet. Add a row or paste CSV.</div>`}
  `;
  referenceGrid.querySelectorAll("[data-row-index]").forEach((input) => {
    input.addEventListener("input", syncReferenceJsonFromGrid);
  });
  referenceGrid.querySelectorAll("[data-column-name]").forEach((input) => {
    input.addEventListener("change", renameReferenceColumn);
  });
  referenceGrid.querySelectorAll("[data-remove-row]").forEach((button) => {
    button.addEventListener("click", () => removeReferenceRow(Number(button.dataset.removeRow)));
  });
  referenceGrid.querySelectorAll("[data-remove-column]").forEach((button) => {
    button.addEventListener("click", () => removeReferenceColumn(button.dataset.removeColumn));
  });
  renderLookupInspector(rows);
}

function renderLookupInspector(rows = null) {
  if (!lookupInspectorSummary) return;
  let currentRows = rows;
  try {
    currentRows = currentRows || referenceRowsFromJson();
  } catch {
    currentRows = [];
  }
  const columns = referenceColumnsFromRows(currentRows);
  const keyColumn = document.querySelector("#lookup-key-column").value.trim() || "key";
  const tableId = document.querySelector("#lookup-id").value.trim() || "reference_table";
  const firstReturnColumn = columns.find((column) => column !== keyColumn) || keyColumn;
  lookupInspectorSummary.innerHTML = [
    statusItem("Rows", formatNumber(currentRows.length)),
    statusItem("Columns", formatNumber(columns.length)),
    statusItem("Match column", keyColumn),
    statusItem("Version", selectedLookupId ? "current" : "new")
  ].join("");
  lookupHelpTable.textContent = tableId;
  lookupHelpKey.textContent = keyColumn;
  lookupHelpExpression.textContent = `=lookup("${tableId}", attributes.${keyColumn}, "${firstReturnColumn}")`;
}

function formatReferenceCell(value) {
  if (value == null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function parseReferenceCell(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (!Number.isNaN(Number(trimmed)) && /^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function syncReferenceJsonFromGrid() {
  const rows = [];
  referenceGrid.querySelectorAll(".reference-grid-row:not(.header-row)").forEach((rowNode) => {
    const rowItem = {};
    rowNode.querySelectorAll("[data-column]").forEach((input) => {
      rowItem[input.dataset.column] = parseReferenceCell(input.value);
    });
    if (Object.values(rowItem).some((value) => value !== "")) rows.push(rowItem);
  });
  document.querySelector("#lookup-rows").value = JSON.stringify(rows, null, 2);
}

function syncReferenceGridFromJson() {
  renderReferenceGrid();
  lookupOutput.textContent = "Reference grid synced from JSON";
}

function addReferenceRow() {
  const rows = referenceRowsFromJson();
  const columns = referenceColumns(rows);
  rows.push(Object.fromEntries(columns.map((column) => [column, ""])));
  document.querySelector("#lookup-rows").value = JSON.stringify(rows, null, 2);
  renderReferenceGrid();
}

function addReferenceColumn() {
  const rows = referenceRowsFromJson();
  const nextColumn = uniqueColumnName(referenceColumns(rows), "new_field");
  const nextRows = rows.length ? rows.map((rowItem) => ({ ...rowItem, [nextColumn]: "" })) : [{ [document.querySelector("#lookup-key-column").value.trim() || "key"]: "", [nextColumn]: "" }];
  document.querySelector("#lookup-rows").value = JSON.stringify(nextRows, null, 2);
  renderReferenceGrid();
}

function uniqueColumnName(columns, base) {
  if (!columns.includes(base)) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base}_${index}`;
    if (!columns.includes(candidate)) return candidate;
  }
  return `${base}_${Date.now()}`;
}

function renameReferenceColumn(event) {
  const oldName = event.target.dataset.columnName;
  const newName = slug(event.target.value || oldName);
  const rows = referenceRowsFromJson().map((rowItem) => {
    if (oldName === newName) return rowItem;
    const next = {};
    for (const [key, value] of Object.entries(rowItem)) next[key === oldName ? newName : key] = value;
    return next;
  });
  if (document.querySelector("#lookup-key-column").value.trim() === oldName) {
    document.querySelector("#lookup-key-column").value = newName;
  }
  document.querySelector("#lookup-rows").value = JSON.stringify(rows, null, 2);
  renderReferenceGrid();
}

function removeReferenceRow(index) {
  const rows = referenceRowsFromJson().filter((_, rowIndex) => rowIndex !== index);
  document.querySelector("#lookup-rows").value = JSON.stringify(rows, null, 2);
  renderReferenceGrid();
}

function removeReferenceColumn(column) {
  const keyColumn = document.querySelector("#lookup-key-column").value.trim() || "key";
  if (column === keyColumn) {
    lookupOutput.textContent = "The match column cannot be removed. Change the match column first.";
    return;
  }
  const rows = referenceRowsFromJson().map((rowItem) => {
    const next = { ...rowItem };
    delete next[column];
    return next;
  });
  document.querySelector("#lookup-rows").value = JSON.stringify(rows, null, 2);
  renderReferenceGrid();
}

function loadLookup(id, tables) {
  const table = tables.find((item) => item.id === id);
  if (!table) {
    lookupOutput.textContent = `Reference table not found: ${id}`;
    return;
  }
  selectedLookupId = id;
  document.querySelector("#lookup-id").value = table.id;
  document.querySelector("#lookup-id").disabled = true;
  document.querySelector("#lookup-name").value = table.name;
  document.querySelector("#lookup-key-column").value = table.key_column;
  document.querySelector("#lookup-rows").value = JSON.stringify(table.rows || [], null, 2);
  renderReferenceGrid();
  document.querySelector("#lookup-csv").value = "";
  loadLookupVersions(id);
  renderLookupInspector();
  lookupOutput.textContent = `Loaded ${id}`;
  openLookupDetail();
}

async function loadLookupVersion(id, version) {
  try {
    const body = await api(`/v1/lookup-tables/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}`);
    const table = body.lookup_table;
    document.querySelector("#lookup-name").value = table.name;
    document.querySelector("#lookup-key-column").value = table.key_column;
    document.querySelector("#lookup-rows").value = JSON.stringify(table.rows || [], null, 2);
    renderReferenceGrid();
    renderLookupInspector();
    lookupOutput.textContent = `Loaded ${id} version ${version} into the editor. Save Reference Table to restore it as the current version.`;
  } catch (error) {
    lookupOutput.textContent = error.message;
  }
}

async function saveLookup(event) {
  event.preventDefault();
  clearInvalid();
  try {
    const id = selectedLookupId || document.querySelector("#lookup-id").value.trim();
    syncReferenceJsonFromGrid();
    const rowsInput = document.querySelector("#lookup-rows");
    const rows = JSON.parse(rowsInput.value || "[]");
    if (!Array.isArray(rows)) {
      rowsInput.classList.add("invalid");
      throw new Error("Rows JSON must be an array of objects");
    }
    for (const rowItem of rows) {
      if (rowItem == null || typeof rowItem !== "object" || Array.isArray(rowItem)) {
        rowsInput.classList.add("invalid");
        throw new Error("Every lookup row must be an object");
      }
    }
    const body = await api(`/v1/lookup-tables/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({
        name: document.querySelector("#lookup-name").value.trim() || id,
        key_column: document.querySelector("#lookup-key-column").value.trim() || "key",
        rows
      })
    });
    selectedLookupId = body.lookup_table.id;
    document.querySelector("#lookup-id").disabled = true;
    lookupOutput.textContent = JSON.stringify(body, null, 2);
    await loadLookups();
    await loadLookupVersions(selectedLookupId);
    renderLookupInspector(rows);
  } catch (error) {
    lookupOutput.textContent = error.message;
  }
}

async function exportLookupCsv() {
  if (!selectedLookupId) {
    lookupOutput.textContent = "Select or save a reference table before exporting CSV.";
    return;
  }
  try {
    const response = await fetch(`/v1/lookup-tables/${encodeURIComponent(selectedLookupId)}/export?format=csv`, {
      headers: { authorization: `Bearer ${tokenInput.value}` }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text);
    lookupOutput.textContent = text;
  } catch (error) {
    lookupOutput.textContent = error.message;
  }
}

function importLookupCsv() {
  clearInvalid();
  try {
    const csvInput = document.querySelector("#lookup-csv");
    const rows = parseCsv(csvInput.value);
    if (rows.length === 0) throw new Error("CSV must include a header row and at least one data row");
    document.querySelector("#lookup-rows").value = JSON.stringify(rows, null, 2);
    const headers = Object.keys(rows[0]);
    if (!headers.includes(document.querySelector("#lookup-key-column").value)) {
      document.querySelector("#lookup-key-column").value = headers[0] || "key";
    }
    renderReferenceGrid();
    renderLookupInspector(rows);
    lookupOutput.textContent = `Imported ${rows.length} CSV rows`;
  } catch (error) {
    document.querySelector("#lookup-csv").classList.add("invalid");
    lookupOutput.textContent = error.message;
  }
}

function parseCsv(source) {
  const rows = [];
  let field = "";
  let rowBuffer = [];
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (quoted && char === "\"" && next === "\"") {
      field += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      rowBuffer.push(field);
      field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      rowBuffer.push(field);
      if (rowBuffer.some((value) => value.trim() !== "")) rows.push(rowBuffer);
      rowBuffer = [];
      field = "";
    } else {
      field += char;
    }
  }
  rowBuffer.push(field);
  if (rowBuffer.some((value) => value.trim() !== "")) rows.push(rowBuffer);
  if (quoted) throw new Error("CSV has an unclosed quoted field");
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => slug(header).replaceAll("_", "_"));
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, parseLiteral((values[index] || "").trim())]))
  );
}

function renderEvaluateRuleOptions() {
  const select = document.querySelector("#eval-rule-key");
  const current = select.value || "next_best_offer";
  select.innerHTML = cachedRuleSets
    .map((ruleSet) => `<option value="${escapeHtml(ruleSet.decision_key)}">${escapeHtml(ruleSet.name)} (${escapeHtml(ruleSet.decision_key)})</option>`)
    .join("");
  if (cachedRuleSets.some((ruleSet) => ruleSet.decision_key === current)) select.value = current;
  else if (cachedRuleSets[0]) select.value = cachedRuleSets[0].decision_key;
}

function loadEvaluatePreset() {
  const preset = document.querySelector("#eval-preset")?.value || "nbo_green";
  const request = preset === "rule_default"
    ? evaluatePresetForRule(selectedEvaluateRule())
    : preset === "experiment_holdout"
      ? experimentEvaluatePreset(selectedEvaluateRule(), { holdout: true })
      : evaluatePreset(preset);
  document.querySelector("#eval-rule-key").value = request.decision_key;
  document.querySelector("#eval-profile-key").value = request.profile_key;
  evalInput.value = JSON.stringify(request, null, 2);
  renderEvaluateModeLabels();
  renderEvaluateValidation(request);
}

function loadEvaluatePresetForSelectedRule() {
  const previous = readEvaluateInputSafe();
  const rule = selectedEvaluateRule();
  const request = evaluatePresetForRule(rule);
  const currentProfileKey = document.querySelector("#eval-profile-key").value.trim() || previous.profile_key || "";
  if (currentProfileKey && !currentProfileKey.startsWith("preset-")) request.profile_key = currentProfileKey;
  document.querySelector("#eval-profile-key").value = request.profile_key;
  syncEvaluatePresetSelect(rule);
  evalInput.value = JSON.stringify(request, null, 2);
  renderEvaluateModeLabels();
  renderEvaluationSummary(null, document.querySelector("#eval-mode").value);
  renderEvaluationOutputSummary(null);
  evalTrace.innerHTML = "";
  evalOutput.textContent = "";
  renderEvaluateValidation(request);
}

async function loadEvaluationProfiles() {
  try {
    const body = await api("/v1/evaluation-profiles");
    cachedEvaluationProfiles = body.profiles || [];
    renderSavedEvaluateProfiles();
  } catch {
    cachedEvaluationProfiles = readSavedEvaluateProfiles();
    renderSavedEvaluateProfiles();
  }
}

function renderSavedEvaluateProfiles() {
  if (!evalSavedProfile) return;
  const profiles = cachedEvaluationProfiles.length ? cachedEvaluationProfiles : readSavedEvaluateProfiles();
  evalSavedProfile.innerHTML = [
    `<option value="">No saved profile selected</option>`,
    ...profiles.map((profile) => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name)} · ${escapeHtml(profile.decision_key || "any rule")}</option>`)
  ].join("");
}

function readSavedEvaluateProfiles() {
  try {
    const profiles = JSON.parse(localStorage.getItem(savedProfileStorageKey) || "[]");
    return Array.isArray(profiles) ? profiles : [];
  } catch {
    return [];
  }
}

function writeSavedEvaluateProfiles(profiles) {
  localStorage.setItem(savedProfileStorageKey, JSON.stringify(profiles.slice(0, 50)));
}

async function saveEvaluateProfile() {
  try {
    const request = readEvaluateInput();
    const validation = renderEvaluateValidation(request);
    if (validation.errors.length) throw new Error(`Profile cannot be saved: ${validation.errors.join("; ")}`);
    const name = window.prompt("Saved profile name", `${request.decision_key} · ${request.profile_key}`);
    if (!name) return;
    const id = `${request.decision_key}:${request.profile_key}:${name}`.toLowerCase().replace(/[^a-z0-9:_-]+/g, "_");
    const payload = {
      name,
      decision_key: request.decision_key,
      profile_key: request.profile_key,
      request
    };
    try {
      const response = await api(`/v1/evaluation-profiles/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      await loadEvaluationProfiles();
      evalSavedProfile.value = response.profile.id;
    } catch {
      const profiles = readSavedEvaluateProfiles();
      const next = profiles.filter((profile) => profile.id !== id);
      next.unshift({ id, ...payload, updated_at: new Date().toISOString() });
      writeSavedEvaluateProfiles(next);
      cachedEvaluationProfiles = [];
      renderSavedEvaluateProfiles();
      evalSavedProfile.value = id;
    }
    renderEvaluateValidation(request, "Saved profile is ready for reuse.");
  } catch (error) {
    renderEvaluateValidation(null, error.message);
  }
}

async function deleteEvaluateProfile() {
  const id = evalSavedProfile?.value;
  if (!id) return;
  try {
    await api(`/v1/evaluation-profiles/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadEvaluationProfiles();
  } catch {
    writeSavedEvaluateProfiles(readSavedEvaluateProfiles().filter((profile) => profile.id !== id));
    cachedEvaluationProfiles = [];
    renderSavedEvaluateProfiles();
  }
  renderSavedEvaluateProfiles();
  renderEvaluateValidation(null, "Saved profile deleted.");
}

function loadSavedEvaluateProfile() {
  const id = evalSavedProfile?.value;
  if (!id) return;
  const profile = [...cachedEvaluationProfiles, ...readSavedEvaluateProfiles()].find((item) => item.id === id);
  if (!profile) return;
  const request = structuredClone(profile.request);
  if (cachedRuleSets.some((ruleSet) => ruleSet.decision_key === request.decision_key)) {
    document.querySelector("#eval-rule-key").value = request.decision_key;
  }
  document.querySelector("#eval-profile-key").value = request.profile_key || "";
  syncEvaluatePresetSelect(selectedEvaluateRule());
  evalInput.value = JSON.stringify(request, null, 2);
  renderEvaluateModeLabels();
  renderEvaluateValidation(request, "Loaded saved profile.");
}

function syncEvaluatePresetSelect(rule = {}) {
  const presetSelect = document.querySelector("#eval-preset");
  if (!presetSelect) return;
  if (rule.decision_key === "next_best_offer") {
    if (!presetSelect.value.startsWith("nbo_")) presetSelect.value = "nbo_green";
    return;
  }
  if (rule.type === "experiment" && presetSelect.value !== "experiment_holdout") {
    presetSelect.value = "rule_default";
    return;
  }
  presetSelect.value = rule.decision_key === "loan_eligibility" ? "loan" : "rule_default";
}

function openEvalPayload() {
  if (!evalPayloadModal) return;
  evalPayloadModal.hidden = false;
}

function closeEvalPayload() {
  if (!evalPayloadModal) return;
  evalPayloadModal.hidden = true;
}

function readEvaluateInput() {
  const body = JSON.parse(evalInput.value || "{}");
  body.decision_key = document.querySelector("#eval-rule-key").value || body.decision_key;
  body.profile_key = document.querySelector("#eval-profile-key").value.trim() || body.profile_key;
  return body;
}

function readEvaluateInputSafe() {
  try {
    return JSON.parse(evalInput.value || "{}");
  } catch {
    return {};
  }
}

function renderEvaluateValidation(request = null, notice = "") {
  if (!evalValidation) return { errors: [], warnings: [] };
  let body = request;
  const errors = [];
  const warnings = [];
  if (!body) {
    try {
      body = readEvaluateInput();
    } catch (error) {
      errors.push(`Payload JSON is invalid: ${error.message}`);
    }
  }
  if (body) {
    if (!body.decision_key) errors.push("decision_key is required");
    if (!body.profile_key) errors.push("profile_key is required");
    if (!Array.isArray(body.identifiers)) errors.push("identifiers must be an array");
    if (!body.attributes || typeof body.attributes !== "object" || Array.isArray(body.attributes)) warnings.push("attributes should be an object of Meiro attribute arrays");
    if (!body.context || typeof body.context !== "object" || Array.isArray(body.context)) warnings.push("context should be an object");
    const selected = selectedEvaluateRule();
    if (selected?.input_schema?.properties || selected?.input_schema?.attributes) {
      const required = Object.keys(selected.input_schema.properties || selected.input_schema.attributes || {});
      const missing = required.filter((key) => !(key in (body.attributes || {})) && !(key in (body.context || {})) && !(key in (body.segments || {})));
      if (missing.length) warnings.push(`schema fields not present in payload: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`);
    }
    const mode = document.querySelector("#eval-mode").value;
    if (mode === "draft" && selected?.status === "archived") warnings.push("selected rule is archived; draft tests may not reflect a published route");
  }
  const className = errors.length ? "error" : warnings.length ? "warning" : "ok";
  const items = errors.length ? errors : warnings.length ? warnings : [notice || "Request shape looks ready."];
  evalValidation.className = `eval-validation ${className}`;
  evalValidation.innerHTML = `
    <strong>${errors.length ? "Fix before running" : warnings.length ? "Review before running" : "Ready"}</strong>
    <span>${escapeHtml(items.join(" · "))}</span>
  `;
  return { errors, warnings };
}

function formatDecisionOutput(body) {
  return JSON.stringify({
    summary: {
      result: body.result,
      offer_id: body.outputs?.offer_id,
      offer_tier: body.outputs?.offer_tier,
      promotion_category: body.outputs?.promotion_category,
      suppression_reason: body.outputs?.suppression_reason,
      matched_rules: body.matched_rules,
      trace: body.trace,
      errors: body.errors,
      tested_version: body.tested_version || "published"
    },
    response: body
  }, null, 2);
}

function renderEvaluateModeLabels() {
  const mode = document.querySelector("#eval-mode").value;
  evalEndpointLabel.textContent = mode === "draft" ? "/v1/rule-sets/:key/test" : "/v1/evaluate";
  evalAuditLabel.textContent = mode === "draft" ? "No, draft test" : "Yes, published mode";
}

function evaluateModeLabel(mode) {
  if (mode === "draft") return "Draft";
  if (mode === "compare") return "Compare";
  return "Published";
}

function renderEvaluationSummary(body, mode, error) {
  if (!evalSummary) return;
  if (error) {
    evalSummary.innerHTML = [
      statusItem("Status", "Error"),
      statusItem("Mode", evaluateModeLabel(mode)),
      statusItem("Result", "-"),
      statusItem("Matched", "-")
    ].join("");
    return;
  }
  if (!body) {
    evalSummary.innerHTML = [
      statusItem("Status", "Ready"),
      statusItem("Mode", evaluateModeLabel(mode)),
      statusItem("Result", "-"),
      statusItem("Matched", "-")
    ].join("");
    return;
  }
  evalSummary.innerHTML = [
    statusItem("Status", body.errors?.length ? "Warning" : "OK"),
    statusItem("Mode", evaluateModeLabel(mode)),
    statusItem("Result", body.result || "-"),
    statusItem("Matched", body.matched_rules?.join(", ") || "fallback")
  ].join("");
}

function renderEvaluationOutputSummary(body, error = null) {
  if (!evalOutputSummary) return;
  if (error) {
    evalOutputSummary.innerHTML = `<div class="eval-empty-state">Evaluation failed. Review the response panel for details.</div>`;
    return;
  }
  if (!body) {
    evalOutputSummary.innerHTML = `<div class="eval-empty-state">Run an evaluation to inspect outputs, matched rules, and response warnings.</div>`;
    return;
  }
  const outputEntries = Object.entries(body.outputs || {});
  const errors = Array.isArray(body.errors) ? body.errors : [];
  evalOutputSummary.innerHTML = `
    <div class="eval-output-card primary">
      <span>Result</span>
      <strong>${escapeHtml(body.result || "-")}</strong>
      <small>${escapeHtml(body.decision_key || "decision")}</small>
    </div>
    <div class="eval-output-card">
      <span>Matched rules</span>
      <strong>${escapeHtml(body.matched_rules?.join(", ") || "fallback")}</strong>
      <small>${escapeHtml(body.rule_version ? `version ${body.rule_version}` : body.tested_version ? "draft test" : "published")}</small>
    </div>
    ${outputEntries.length
      ? outputEntries.map(([key, value]) => `
        <div class="eval-output-card">
          <span>${escapeHtml(key)}</span>
          <strong>${escapeHtml(formatDecisionValue(value))}</strong>
        </div>
      `).join("")
      : `<div class="eval-output-card"><span>Outputs</span><strong>No outputs</strong></div>`}
    ${errors.length
      ? `<div class="eval-output-card warning"><span>Errors</span><strong>${escapeHtml(errors.join(", "))}</strong></div>`
      : ""}
  `;
}

function formatDecisionValue(value) {
  if (value == null) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function renderEvaluationTrace(body) {
  const trace = Array.isArray(body.trace) ? body.trace : [];
  if (!trace.length) {
    evalTrace.innerHTML = "";
    return;
  }
  const graphTrace = trace.filter((item) => item.type === "graph_node");
  const title = graphTrace.length ? "Graph Path" : "Branch Evaluation";
  const badge = graphTrace.length ? `${graphTrace.length} nodes` : `${trace.length} checks`;
  evalTrace.innerHTML = `
    <div class="trace-card">
      <div class="trace-card-header">
        <strong>${escapeHtml(title)}</strong>
        <span class="trace-badge">${escapeHtml(badge)}</span>
      </div>
      <div class="trace-path">
        ${trace.map(traceStepHtml).join("")}
      </div>
    </div>
  `;
}

function traceStepHtml(step) {
  if (step.type === "graph_node") {
    return `
      <div class="trace-step">
        <strong>${escapeHtml(step.node_id || "node")}</strong>
        <span>${escapeHtml(traceGraphStepMeta(step))}</span>
      </div>
    `;
  }
  if (step.type === "branch") {
    return `
      <div class="trace-step">
        <strong>${escapeHtml(step.id || "branch")}</strong>
        <span>${escapeHtml(step.matched ? `matched / ${step.result || "result"}` : "not matched")}</span>
      </div>
    `;
  }
  if (step.type === "fallback") {
    return `
      <div class="trace-step">
        <strong>fallback</strong>
        <span>${escapeHtml(step.result || "deferred")}</span>
      </div>
    `;
  }
  return `
    <div class="trace-step">
      <strong>${escapeHtml(step.type || "trace")}</strong>
      <span>${escapeHtml(step.message || "")}</span>
    </div>
  `;
}

function traceGraphStepMeta(step) {
  if (step.terminal) return `${step.node_type} / ${step.result || "terminal"}`;
  if (step.node_type === "condition") return `${step.passed ? "true" : "false"} -> ${step.next || "-"}`;
  if (step.node_type === "score") return `${step.score_label}: ${step.score_total} -> ${step.next || "-"}`;
  if (step.node_type === "lookup") return `${step.output_key || step.column || "lookup"} -> ${step.next || "-"}`;
  if (step.node_type === "frequency_cap") return `${step.event_count}/${step.max} ${step.capped ? "capped" : "allowed"} -> ${step.next || "-"}`;
  return `${step.node_type || "node"} -> ${step.next || "-"}`;
}

function evaluatePreset(name) {
  const nboBase = {
    decision_key: "next_best_offer",
    profile_key: `preset-${name}`,
    identifiers: [{ typeId: "email", value: "user@example.com" }],
    attributes: {
      lead_score: [{ value: 82 }],
      web_engagement_score: [{ value: 71 }],
      interacted_promotions: [{ value: [] }],
      customer_lifetime_value: [{ value: 12400 }],
      monetary_rfm: [{ value: 5 }],
      churn_risk_score: [{ value: 0.2 }],
      outstanding_balance_tier: [{ value: "low" }],
      late_payments_count_12m: [{ value: 0 }],
      survey_nps_latest: [{ value: 8 }],
      sustainability_score: [{ value: 91 }]
    },
    segments: {},
    context: { channel: "email", request_source: "dee_ui" }
  };
  const presets = {
    nbo_green: nboBase,
    nbo_credit: mergeAttributes(nboBase, {
      outstanding_balance_tier: [{ value: "high" }]
    }),
    nbo_retention: mergeAttributes(nboBase, {
      churn_risk_score: [{ value: 0.82 }],
      sustainability_score: [{ value: 20 }],
      customer_lifetime_value: [{ value: 1000 }],
      monetary_rfm: [{ value: 2 }]
    }),
    nbo_premium: mergeAttributes(nboBase, {
      sustainability_score: [{ value: 20 }]
    }),
    nbo_fallback: mergeAttributes(nboBase, {
      lead_score: [{ value: 10 }],
      web_engagement_score: [{ value: 10 }],
      customer_lifetime_value: [{ value: 100 }],
      monetary_rfm: [{ value: 1 }],
      churn_risk_score: [{ value: 0.1 }],
      sustainability_score: [{ value: 10 }],
      survey_nps_latest: [{ value: 4 }]
    }),
    loan: {
      decision_key: "loan_eligibility",
      profile_key: "preset-loan",
      identifiers: [{ typeId: "email", value: "user@example.com" }],
      attributes: {
        lifetime_revenue: [{ value: 8400 }],
        plan_tier: [{ value: "gold" }]
      },
      segments: { vip_customers: true },
      context: { channel: "web", request_source: "dee_ui" }
    }
  };
  return structuredClone(presets[name] || nboBase);
}

function selectedEvaluateRule() {
  const key = document.querySelector("#eval-rule-key").value;
  return cachedRuleSets.find((ruleSet) => ruleSet.decision_key === key) || { decision_key: key };
}

function evaluatePresetForRule(rule = {}) {
  const key = rule.decision_key || "next_best_offer";
  if (key === "loan_eligibility") return evaluatePreset("loan");
  if (key === "next_best_offer") {
    const selectedPreset = document.querySelector("#eval-preset")?.value || "nbo_green";
    return evaluatePreset(selectedPreset.startsWith("nbo_") ? selectedPreset : "nbo_green");
  }
  if (rule.type === "inapp_message") return inAppEvaluatePreset(rule);
  if (rule.type === "experiment") return experimentEvaluatePreset(rule);
  return genericEvaluatePreset(rule);
}

function genericEvaluatePreset(rule) {
  const key = rule.decision_key || "selected_rule";
  return {
    decision_key: key,
    profile_key: `preset-${key}`,
    identifiers: [{ typeId: "email", value: "user@example.com" }],
    attributes: sampleAttributesFromSchema(rule.input_schema),
    segments: {},
    context: {
      channel: rule.surface ? "web" : "email",
      request_source: "dee_ui",
      ...(rule.surface ? { surface: rule.surface } : {})
    }
  };
}

function sampleAttributesFromSchema(schema = {}) {
  const properties = schema.properties || schema.attributes || {};
  return Object.fromEntries(Object.keys(properties).map((key) => [key, [{ value: sampleValueForSchema(properties[key]) }]]));
}

function sampleValueForSchema(schema = {}) {
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  if (schema.type === "number" || schema.type === "integer") return 1;
  if (schema.type === "boolean") return true;
  if (schema.type === "array") return [];
  if (schema.type === "object") return {};
  return "sample";
}

function inAppEvaluatePreset(rule) {
  return {
    decision_key: rule.decision_key,
    profile_key: `preset-${rule.decision_key}`,
    identifiers: [{ typeId: "email", value: "user@example.com" }],
    attributes: sampleAttributesFromSchema(rule.input_schema),
    segments: {},
    context: {
      channel: "web",
      request_source: "dee_ui",
      surface: rule.surface || "homepage_hero",
      placement: rule.surface || "homepage_hero"
    }
  };
}

function experimentEvaluatePreset(rule, options = {}) {
  return {
    decision_key: rule.decision_key,
    profile_key: `preset-${rule.decision_key}`,
    identifiers: [{ typeId: "email", value: "user@example.com" }],
    attributes: {
      lead_score: [{ value: 68 }],
      web_engagement_score: [{ value: 61 }],
      customer_lifetime_value: [{ value: 5400 }]
    },
    segments: {},
    context: {
      channel: "web",
      request_source: "dee_ui",
      surface: rule.surface || "default",
      ...(options.holdout ? { force_holdout: true } : {})
    }
  };
}

function mergeAttributes(base, attributes) {
  const request = structuredClone(base);
  request.profile_key = `preset-${Object.keys(attributes)[0] || "custom"}`;
  request.attributes = { ...request.attributes, ...attributes };
  return request;
}

async function loadSettings() {
  try {
    const body = await api("/v1/settings");
    const settings = body.settings || {};
    cachedSettings = { settings, runtime: body.runtime || {} };
    topbarEnv.textContent = settings.environment_label || "local";
    document.querySelector("#setting-environment-label").value = settings.environment_label || "";
    document.querySelector("#setting-audit-retention-days").value = settings.audit_retention_days || "";
    document.querySelector("#setting-client-event-retention-days").value = settings.client_event_retention_days || "";
    document.querySelector("#setting-bootstrap-tokens-enabled").value = settings.bootstrap_tokens_enabled === false ? "false" : "true";
    document.querySelector("#setting-meiro-url").value = settings.meiro_url || "";
    document.querySelector("#setting-meiro-source-slug").value = settings.meiro_source_slug || "";
    document.querySelector("#setting-meiro-api-url").value = settings.meiro_api_url || "";
    document.querySelector("#setting-meiro-api-token").value = "";
    document.querySelector("#setting-meiro-api-token").placeholder = settings.meiro_api_token_configured ? "Configured" : "";
    document.querySelector("#setting-meiro-profile-cache-ttl").value = settings.meiro_profile_cache_ttl_seconds ?? 300;
    document.querySelector("#setting-meiro-feedback-url").value = settings.meiro_feedback_url || "";
    document.querySelector("#setting-meiro-skill-url").value = settings.meiro_skill_url || "";
    document.querySelector("#setting-meiro-cli-url").value = settings.meiro_cli_url || settings.meiro_url || "";
    document.querySelector("#setting-meiro-cli-token").value = "";
    document.querySelector("#setting-meiro-cli-token").placeholder = settings.meiro_cli_token_configured ? "Configured" : "Separate mpcli token";
    document.querySelector("#setting-schema-sync-interval").value = settings.schema_sync_interval_minutes || 15;
    document.querySelector("#schema-sync-identifier-type").value = settings.schema_sync_identifier_type || "";
    document.querySelector("#schema-sync-identifier-value").value = settings.schema_sync_identifier_value || "";
    renderSchemaSyncStatus(settings, body.runtime?.schema_sync || {});
    renderSettingsSummary(settings, body.runtime || {});
    renderMeiroDeliveries(body.runtime?.meiro_deliveries || []);
    settingsOutput.textContent = JSON.stringify(body, null, 2);
    renderIntegration();
    await loadTokens();
  } catch (error) {
    settingsOutput.textContent = error.message;
    renderSettingsSummary(null, null, error);
  }
}

async function testMeiroConnection(target) {
  try {
    if (meiroTestOutput) meiroTestOutput.textContent = `Testing ${target} connection...`;
    const body = {
      target,
      meiro_url: document.querySelector("#setting-meiro-url").value.trim(),
      meiro_source_slug: document.querySelector("#setting-meiro-source-slug").value.trim(),
      meiro_api_url: document.querySelector("#setting-meiro-api-url").value.trim(),
      meiro_api_token: document.querySelector("#setting-meiro-api-token").value.trim(),
      meiro_profile_cache_ttl_seconds: Number(document.querySelector("#setting-meiro-profile-cache-ttl").value || 0),
      meiro_feedback_url: document.querySelector("#setting-meiro-feedback-url").value.trim(),
      meiro_skill_url: document.querySelector("#setting-meiro-skill-url").value.trim(),
      meiro_cli_url: document.querySelector("#setting-meiro-cli-url").value.trim(),
      meiro_cli_token: document.querySelector("#setting-meiro-cli-token").value.trim(),
      identifier_type: document.querySelector("#schema-sync-identifier-type").value.trim(),
      identifier_value: document.querySelector("#schema-sync-identifier-value").value.trim()
    };
    const response = await api("/v1/settings/test-connection", {
      method: "POST",
      body: JSON.stringify(body)
    });
    if (meiroTestOutput) meiroTestOutput.textContent = JSON.stringify(response, null, 2);
    await loadMeiroDeliveries();
  } catch (error) {
    if (meiroTestOutput) meiroTestOutput.textContent = error.message;
  }
}

async function saveSettings(event) {
  event.preventDefault();
  try {
    const payload = {
      environment_label: document.querySelector("#setting-environment-label").value.trim(),
      audit_retention_days: Number(document.querySelector("#setting-audit-retention-days").value || 90),
      client_event_retention_days: Number(document.querySelector("#setting-client-event-retention-days").value || 180),
      bootstrap_tokens_enabled: document.querySelector("#setting-bootstrap-tokens-enabled").value !== "false",
      meiro_url: document.querySelector("#setting-meiro-url").value.trim(),
      meiro_source_slug: document.querySelector("#setting-meiro-source-slug").value.trim(),
      meiro_api_url: document.querySelector("#setting-meiro-api-url").value.trim(),
      meiro_feedback_url: document.querySelector("#setting-meiro-feedback-url").value.trim(),
      meiro_skill_url: document.querySelector("#setting-meiro-skill-url").value.trim(),
      meiro_cli_url: document.querySelector("#setting-meiro-cli-url").value.trim(),
      meiro_profile_cache_ttl_seconds: Number(document.querySelector("#setting-meiro-profile-cache-ttl").value || 0),
      schema_sync_interval_minutes: Number(document.querySelector("#setting-schema-sync-interval").value || 15),
      schema_sync_identifier_type: document.querySelector("#schema-sync-identifier-type").value.trim(),
      schema_sync_identifier_value: document.querySelector("#schema-sync-identifier-value").value.trim()
    };
    const apiToken = document.querySelector("#setting-meiro-api-token").value.trim();
    if (apiToken) payload.meiro_api_token = apiToken;
    const cliToken = document.querySelector("#setting-meiro-cli-token").value.trim();
    if (cliToken) payload.meiro_cli_token = cliToken;
    const body = await api("/v1/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    cachedSettings = { ...cachedSettings, settings: body.settings || {} };
    renderSchemaSyncStatus(body.settings || {}, body.runtime?.schema_sync || {});
    renderSettingsSummary(body.settings || {}, body.runtime || {});
    renderIntegration();
    settingsOutput.textContent = JSON.stringify(body, null, 2);
  } catch (error) {
    settingsOutput.textContent = error.message;
  }
}

async function syncSchemaFromMeiro() {
  try {
    const body = await api("/v1/schema/sync", {
      method: "POST",
      body: JSON.stringify({
        meiro_api_url: document.querySelector("#setting-meiro-api-url").value.trim(),
        meiro_api_token: document.querySelector("#setting-meiro-api-token").value.trim(),
        identifier_type: document.querySelector("#schema-sync-identifier-type").value.trim(),
        identifier_value: document.querySelector("#schema-sync-identifier-value").value.trim()
      })
    });
    cachedSchema = [
      ...(body.imported?.attributes || []),
      ...(body.imported?.segments || []),
      ...(body.imported?.context || [])
    ];
    await loadSettings();
    renderBranchEditor();
    schemaOutput.textContent = JSON.stringify(body, null, 2);
    renderSchemaDiagnostics(body.diagnostics);
  } catch (error) {
    await loadSettings();
    schemaOutput.textContent = error.message;
  }
}

async function syncMeiroMetadata() {
  try {
    schemaOutput.textContent = "Syncing Meiro metadata...";
    const body = await api("/v1/meiro/metadata/sync", {
      method: "POST",
      body: JSON.stringify({
        meiro_skill_url: document.querySelector("#setting-meiro-skill-url").value.trim(),
        meiro_cli_url: document.querySelector("#setting-meiro-cli-url").value.trim(),
        meiro_cli_token: document.querySelector("#setting-meiro-cli-token").value.trim(),
        meiro_api_url: document.querySelector("#setting-meiro-api-url").value.trim(),
        meiro_api_token: document.querySelector("#setting-meiro-api-token").value.trim(),
        identifier_type: document.querySelector("#schema-sync-identifier-type").value.trim(),
        identifier_value: document.querySelector("#schema-sync-identifier-value").value.trim()
      })
    });
    cachedSchema = [
      ...(body.imported?.attributes || []),
      ...(body.imported?.segments || []),
      ...(body.imported?.context || [])
    ];
    await loadSettings();
    renderBranchEditor();
    schemaOutput.textContent = JSON.stringify(body, null, 2);
    renderSchemaDiagnostics(body.diagnostics?.profile_api?.diagnostics || body.diagnostics);
  } catch (error) {
    await loadSettings();
    schemaOutput.textContent = error.message;
  }
}

function renderSchemaSyncStatus(settings, runtime) {
  const target = document.querySelector("#schema-sync-status");
  if (!target) return;
  const status = settings.schema_last_sync_status || "never";
  const lastSync = settings.schema_last_synced_at ? formatTime(settings.schema_last_synced_at) : "never";
  const nextRun = runtime.configured && runtime.next_run_at ? formatTime(runtime.next_run_at) : "not scheduled";
  const count = Number(settings.schema_last_sync_count || 0);
  const error = settings.schema_last_sync_error ? ` Error: ${settings.schema_last_sync_error}` : "";
  target.textContent = `Status: ${status}. Last sync: ${lastSync}. Imported: ${count}. Next sync: ${nextRun}.${error}`;
}

async function loadMeiroDeliveries() {
  try {
    const body = await api("/v1/meiro-deliveries?limit=10");
    renderMeiroDeliveries(body.deliveries || []);
  } catch (error) {
    if (meiroDeliveryStatus) meiroDeliveryStatus.innerHTML = row([error.message, "", "", "", ""]);
  }
}

function renderMeiroDeliveries(deliveries = []) {
  if (!meiroDeliveryStatus) return;
  meiroDeliveryStatus.innerHTML = header(["Time", "Target", "Status", "Endpoint", "Message"]);
  if (!deliveries.length) {
    meiroDeliveryStatus.innerHTML += row(["No delivery attempts yet", "", "", "", ""]);
    return;
  }
  meiroDeliveryStatus.innerHTML += deliveries
    .map((item) => row([
      item.attempted_at ? formatTime(item.attempted_at) : "-",
      item.target || "-",
      `${item.ok ? "OK" : "Failed"} · ${item.status || 0}`,
      item.endpoint || "-",
      item.error || item.response_preview || "-"
    ]))
    .join("");
}

function renderSchemaDiagnostics(diagnostics = null) {
  if (!schemaImportDiagnostics) return;
  if (!diagnostics) {
    schemaImportDiagnostics.innerHTML = "";
    return;
  }
  const summary = diagnostics.summary || {};
  const kinds = [
    ["Attributes", diagnostics.attributes],
    ["Segments", diagnostics.segments],
    ["Context", diagnostics.context]
  ];
  schemaImportDiagnostics.innerHTML = `
    <div class="schema-diagnostic-summary">
      ${statusItem("Imported", formatNumber(summary.imported || 0))}
      ${statusItem("Skipped", formatNumber(summary.skipped || 0))}
      ${statusItem("Failed", formatNumber(summary.failed || 0))}
    </div>
    <div class="schema-diagnostic-details">
      ${kinds.map(([label, detail = {}]) => `
        <div>
          <strong>${escapeHtml(label)}</strong>
          <span>${formatNumber(detail.imported || 0)} imported</span>
          ${(detail.skipped || []).map((item) => `<small>Skipped ${escapeHtml(item.name || `#${item.index}`)}: ${escapeHtml(item.reason)}</small>`).join("")}
          ${(detail.failed || []).map((item) => `<small>Failed ${escapeHtml(item.name || `#${item.index ?? "-"}`)}: ${escapeHtml(item.reason)}</small>`).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function renderSettingsSummary(settings, runtime, error = null) {
  if (!settingsHealthSummary) return;
  if (error) {
    settingsHealthSummary.innerHTML = `<div class="settings-health-item warn"><strong>Settings unavailable</strong><span>${escapeHtml(error.message)}</span></div>`;
    return;
  }
  const schemaRuntime = runtime?.schema_sync || {};
  const profileCache = runtime?.profile_cache || {};
  const collectorConfigured = Boolean(settings?.meiro_url && settings?.meiro_source_slug);
  const feedbackConfigured = Boolean(settings?.meiro_feedback_url);
  const apiConfigured = Boolean(settings?.meiro_api_url && settings?.meiro_api_token_configured);
  const metadataConfigured = Boolean((settings?.meiro_cli_url || settings?.meiro_url) && settings?.meiro_cli_token_configured);
  const schemaStatus = settings?.schema_last_sync_status || "never";
  const schemaHealthy = ["ok", "success"].includes(schemaStatus);
  const schemaDetail = settings?.schema_last_synced_at
    ? `${formatTime(settings.schema_last_synced_at)} · ${Number(settings.schema_last_sync_count || 0)} fields`
    : "No schema sync completed yet";
  const nextRun = schemaRuntime.configured && schemaRuntime.next_run_at ? formatTime(schemaRuntime.next_run_at) : "Not scheduled";
  const items = [
    {
      label: "Environment",
      value: settings?.environment_label || "local",
      detail: `${Number(settings?.audit_retention_days || 90)}d audit · ${Number(settings?.client_event_retention_days || 180)}d client events`,
      ok: true
    },
    {
      label: "Meiro Collector",
      value: collectorConfigured ? "Configured" : "Incomplete",
      detail: collectorConfigured ? [settings.meiro_url, "collect", settings.meiro_source_slug].join("/") : "Set Meiro URL and source slug",
      ok: collectorConfigured
    },
    {
      label: "Feedback Endpoint",
      value: feedbackConfigured ? "Configured" : "Incomplete",
      detail: feedbackConfigured ? settings.meiro_feedback_url : "Set explicit feedback endpoint",
      ok: feedbackConfigured
    },
    {
      label: "Profile API",
      value: apiConfigured ? "Configured" : "Incomplete",
      detail: apiConfigured ? `${settings.meiro_api_url} · ${Number(settings.meiro_profile_cache_ttl_seconds || 0)}s profile TTL` : "Set Profile API URL and token for schema import and client enrichment",
      ok: apiConfigured
    },
    {
      label: "Profile Cache",
      value: `${Math.round((profileCache.hit_rate || 0) * 100)}% hit rate`,
      detail: `${formatNumber(profileCache.entries || 0)} entries · ${formatNumber(profileCache.errors || 0)} lookup errors`,
      ok: Number(profileCache.errors || 0) === 0
    },
    {
      label: "Meiro Metadata",
      value: metadataConfigured ? "Configured" : "CLI token missing",
      detail: metadataConfigured ? (settings.meiro_cli_url || settings.meiro_url) : "Add separate mpcli token for catalog and audience sync",
      ok: metadataConfigured
    },
    {
      label: "Schema Sync",
      value: schemaStatus,
      detail: `${schemaDetail}. Next: ${nextRun}`,
      ok: schemaHealthy
    },
    {
      label: "Bootstrap Tokens",
      value: settings?.bootstrap_tokens_enabled === false ? "Disabled" : "Enabled",
      detail: settings?.bootstrap_tokens_enabled === false ? "DB tokens are required" : "Static admin token remains accepted",
      ok: settings?.bootstrap_tokens_enabled === false
    }
  ];
  settingsHealthSummary.innerHTML = items
    .map((item) => `
      <div class="settings-health-item ${item.ok ? "ok" : "warn"}">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </div>
    `)
    .join("");
}

async function importSchema() {
  try {
    const body = await api("/v1/schema/import", {
      method: "POST",
      body: document.querySelector("#schema-import").value || "{}"
    });
    cachedSchema = [
      ...(body.imported?.attributes || []),
      ...(body.imported?.segments || []),
      ...(body.imported?.context || [])
    ];
    renderBranchEditor();
    schemaOutput.textContent = JSON.stringify(body, null, 2);
    renderSchemaDiagnostics(body.diagnostics);
  } catch (error) {
    schemaOutput.textContent = error.message;
  }
}

async function loadSchema({ silent = false } = {}) {
  try {
    const body = await api("/v1/schema");
    cachedSchema = body.schema || [];
    renderBranchEditor();
    if (!silent) schemaOutput.textContent = JSON.stringify(body, null, 2);
  } catch (error) {
    if (!silent) schemaOutput.textContent = error.message;
  }
}

async function loadConditionBlocks({ silent = false } = {}) {
  try {
    const body = await api("/v1/condition-blocks");
    cachedConditionBlocks = body.condition_blocks || [];
    conditionBlocksLoaded = true;
    renderConditionBlockManager();
    renderBranchEditor();
    if (!selectedConditionBlockId && cachedConditionBlocks[0]) editConditionBlock(cachedConditionBlocks[0].id);
  } catch (error) {
    cachedConditionBlocks = [];
    conditionBlocksLoaded = false;
    renderConditionBlockManager();
    if (!silent && conditionBlockOutput) conditionBlockOutput.textContent = error.message;
  }
}

function renderConditionBlockManager() {
  if (!conditionBlockList) return;
  const blocks = availableConditionBlocks();
  conditionBlockList.innerHTML = blocks.length
    ? blocks.map((block) => `
      <button type="button" class="condition-block-card ${block.id === selectedConditionBlockId ? "active" : ""}" data-condition-block-id="${escapeHtml(block.id)}">
        <strong>${escapeHtml(block.name || block.id)}</strong>
        <span>${escapeHtml(`${block.conditions?.length || 0} conditions · ${block.description || block.id}`)}</span>
      </button>
    `).join("")
    : `<div class="status-line">No reusable blocks yet.</div>`;
  conditionBlockList.querySelectorAll("[data-condition-block-id]").forEach((button) => {
    button.addEventListener("click", () => editConditionBlock(button.dataset.conditionBlockId));
  });
}

function editConditionBlock(id) {
  const block = availableConditionBlocks().find((item) => item.id === id);
  if (!block) return;
  selectedConditionBlockId = block.id;
  document.querySelector("#condition-block-id").value = block.id || "";
  document.querySelector("#condition-block-name").value = block.name || "";
  document.querySelector("#condition-block-description").value = block.description || "";
  document.querySelector("#condition-block-conditions").value = JSON.stringify(block.conditions || [], null, 2);
  renderConditionBlockManager();
  if (conditionBlockOutput) conditionBlockOutput.textContent = "";
}

function newConditionBlock() {
  selectedConditionBlockId = null;
  document.querySelector("#condition-block-id").value = "";
  document.querySelector("#condition-block-name").value = "";
  document.querySelector("#condition-block-description").value = "";
  document.querySelector("#condition-block-conditions").value = JSON.stringify([
    { source: "attribute", key: "", operator: "equals", value: "" }
  ], null, 2);
  renderConditionBlockManager();
  if (conditionBlockOutput) conditionBlockOutput.textContent = "Create a reusable block, then save it.";
}

async function saveConditionBlock() {
  try {
    const id = slug(document.querySelector("#condition-block-id").value || document.querySelector("#condition-block-name").value);
    if (!id) throw new Error("Block ID or name is required");
    const conditions = parseJsonStrict(document.querySelector("#condition-block-conditions").value || "[]", "Conditions JSON");
    const payload = {
      id,
      name: document.querySelector("#condition-block-name").value.trim() || id,
      description: document.querySelector("#condition-block-description").value.trim(),
      conditions
    };
    const body = await api(`/v1/condition-blocks/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    selectedConditionBlockId = body.condition_block?.id || id;
    await loadConditionBlocks({ silent: true });
    if (conditionBlockOutput) conditionBlockOutput.textContent = JSON.stringify(body, null, 2);
  } catch (error) {
    if (conditionBlockOutput) conditionBlockOutput.textContent = error.message;
  }
}

async function deleteConditionBlock() {
  try {
    const id = selectedConditionBlockId || document.querySelector("#condition-block-id").value.trim();
    if (!id) throw new Error("Select a condition block first");
    await api(`/v1/condition-blocks/${encodeURIComponent(id)}`, { method: "DELETE" });
    selectedConditionBlockId = null;
    await loadConditionBlocks({ silent: true });
    newConditionBlock();
    if (conditionBlockOutput) conditionBlockOutput.textContent = "Condition block deleted.";
  } catch (error) {
    if (conditionBlockOutput) conditionBlockOutput.textContent = error.message;
  }
}

async function loadIntegration() {
  try {
    const body = await api("/v1/settings");
    cachedSettings = { settings: body.settings || {}, runtime: body.runtime || {} };
    renderSettingsSummary(body.settings || {}, body.runtime || {});
    renderIntegration();
  } catch (error) {
    if (integrationResponse) integrationResponse.textContent = error.message;
  }
}

function renderIntegration() {
  if (!integrationTemplate || !integrationResponse) return;
  const settings = cachedSettings.settings || {};
  const runtime = cachedSettings.runtime || {};
  const endpoint = `${runtime.docker_url || "http://localhost:8090"}/v1/evaluate`;
  const collectorEndpoint = [settings.meiro_url, "collect", settings.meiro_source_slug].filter(Boolean).join("/");
  const feedbackEndpoint = settings.meiro_feedback_url || collectorEndpoint;
  document.querySelector("#integration-endpoint").value = endpoint;
  document.querySelector("#integration-meiro-url").value = feedbackEndpoint || "";
  integrationTemplate.value = [
    "POST " + endpoint,
    "Authorization: Bearer <DEE_EVALUATE_TOKEN>",
    "Content-Type: application/json",
    "",
    JSON.stringify(evaluatePreset("nbo_green"), null, 2)
  ].join("\n");
  integrationResponse.textContent = JSON.stringify({
    decision_key: "next_best_offer",
    profile_key: "meiro-profile-key",
    rule_version: 1,
    result: "eligible",
    outputs: {
      offer_id: "solar_green_energy",
      offer_tier: "premium",
      promotion_category: "green_energy",
      suppression_reason: null,
      priority: 80
    },
    matched_rules: ["green_energy_offer"],
    errors: []
  }, null, 2) + `\n\nForward this result to Meiro:\nPOST ${feedbackEndpoint || "<MEIRO_FEEDBACK_ENDPOINT>"}`;
}

async function loadTokens() {
  const target = document.querySelector("#token-list");
  target.innerHTML = header(["Name", "Scopes", "Allowed decisions", "Last used", "Status"]);
  try {
    const body = await api("/v1/tokens");
    target.innerHTML += body.tokens
      .map((token) =>
        row(
          [
            token.name,
            token.scopes.join(", "),
            token.decision_keys?.length ? token.decision_keys.join(", ") : "All",
            token.last_used_at || "-",
            token.revoked_at ? "revoked" : "active"
          ],
          { tokenId: token.id }
        )
      )
      .join("");
    document.querySelectorAll("[data-token-id]").forEach((element) => {
      element.addEventListener("click", () => revokeToken(element.dataset.tokenId));
    });
  } catch (error) {
    target.innerHTML += row([error.message, "", "", "", ""]);
  }
}

async function createToken(event) {
  event.preventDefault();
  try {
    const body = await api("/v1/tokens", {
      method: "POST",
      body: JSON.stringify({
        name: document.querySelector("#token-name").value.trim() || "API token",
        scopes: document.querySelector("#token-scopes").value.split(","),
        decision_keys: document
          .querySelector("#token-decision-keys")
          .value.split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      })
    });
    tokenOutput.textContent = `Copy this token now. It will not be shown again.\n\n${JSON.stringify(body, null, 2)}`;
    await loadTokens();
  } catch (error) {
    tokenOutput.textContent = error.message;
  }
}

async function revokeToken(id) {
  if (!id) return;
  try {
    const body = await api(`/v1/tokens/${encodeURIComponent(id)}`, { method: "DELETE" });
    tokenOutput.textContent = JSON.stringify(body, null, 2);
    await loadTokens();
  } catch (error) {
    tokenOutput.textContent = error.message;
  }
}

const tokenInput = document.querySelector("#token");
const evalInput = document.querySelector("#eval-input");
const evalOutput = document.querySelector("#eval-output");
const evalTrace = document.querySelector("#eval-trace");
const editorOutput = document.querySelector("#rule-editor-output");
const branchEditor = document.querySelector("#branch-editor");
const ruleGraph = document.querySelector("#rule-graph");
const graphEditor = document.querySelector("#graph-editor");
const graphNodeEditor = document.querySelector("#graph-node-editor");
const lookupOutput = document.querySelector("#lookup-output");
const messageOutput = document.querySelector("#message-output");
const referenceGrid = document.querySelector("#reference-grid");
const auditDetail = document.querySelector("#audit-detail");
const versionList = document.querySelector("#version-list");
const lookupVersionList = document.querySelector("#lookup-version-list");
const settingsOutput = document.querySelector("#settings-output");
const tokenOutput = document.querySelector("#token-output");
const schemaOutput = document.querySelector("#schema-output");
const integrationTemplate = document.querySelector("#integration-template");
const integrationResponse = document.querySelector("#integration-response");
const metricCards = document.querySelector("#metric-cards");
const ruleDetailPanel = document.querySelector("#metrics-rule-detail");
const clientEventsPanel = document.querySelector("#metrics-client-events");
let selectedRuleKey = null;
let selectedLookupId = null;
let selectedMessageId = null;
let builderBranches = [];
let graphBuilder = { entry: "input", nodes: [] };
let cachedRuleSets = [];
let cachedLookupTables = [];
let cachedSettings = {};
let cachedSchema = [];

document.querySelectorAll("nav button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("nav button, .view").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.view}`).classList.add("active");
    if (button.dataset.view === "overview") loadMetrics();
  });
});

document.querySelector("#refresh-metrics").addEventListener("click", loadMetrics);
document.querySelector("#refresh-rules").addEventListener("click", loadRules);
document.querySelector("#rule-filter-search").addEventListener("input", renderRuleList);
document.querySelector("#rule-filter-status").addEventListener("change", renderRuleList);
document.querySelector("#rule-filter-type").addEventListener("change", renderRuleList);
document.querySelector("#rule-filter-tag").addEventListener("input", renderRuleList);
document.querySelector("#refresh-audit").addEventListener("click", loadAudit);
document.querySelector("#refresh-lookups").addEventListener("click", loadLookups);
document.querySelector("#refresh-messages").addEventListener("click", loadMessages);
document.querySelector("#export-lookup-csv").addEventListener("click", exportLookupCsv);
document.querySelector("#refresh-settings").addEventListener("click", loadSettings);
document.querySelector("#refresh-integration").addEventListener("click", loadIntegration);
document.querySelector("#export-audit-csv").addEventListener("click", exportAuditCsv);
document.querySelector("#import-schema").addEventListener("click", importSchema);
document.querySelector("#refresh-schema").addEventListener("click", loadSchema);
document.querySelector("#sync-schema").addEventListener("click", syncSchemaFromMeiro);
document.querySelector("#run-eval").addEventListener("click", runEvaluate);
document.querySelector("#load-preset").addEventListener("click", loadEvaluatePreset);
document.querySelector("#eval-rule-key").addEventListener("change", () => {
  const body = readEvaluateInput();
  body.decision_key = document.querySelector("#eval-rule-key").value;
  evalInput.value = JSON.stringify(body, null, 2);
});
document.querySelector("#eval-profile-key").addEventListener("input", () => {
  const body = readEvaluateInput();
  body.profile_key = document.querySelector("#eval-profile-key").value.trim() || body.profile_key;
  evalInput.value = JSON.stringify(body, null, 2);
});
document.querySelector("#new-rule").addEventListener("click", newRule);
document.querySelector("#new-lookup").addEventListener("click", newLookup);
document.querySelector("#new-message").addEventListener("click", newMessage);
document.querySelector("#export-config").addEventListener("click", exportConfig);
document.querySelector("#sync-json").addEventListener("click", syncJsonFromBuilder);
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
document.querySelector("#graph-entry").addEventListener("input", () => {
  graphBuilder.entry = document.querySelector("#graph-entry").value.trim();
  renderRuleGraph();
  syncJsonFromBuilder();
});
document.querySelector("#publish-rule").addEventListener("click", publishSelectedRule);
document.querySelector("#rule-editor").addEventListener("submit", saveDraft);
document.querySelector("#rule-draft").addEventListener("change", syncBuilderFromJson);
document.querySelector("#fallback-result").addEventListener("input", syncJsonFromBuilder);
document.querySelector("#fallback-outputs").addEventListener("change", syncJsonFromBuilder);
document.querySelector("#lookup-editor").addEventListener("submit", saveLookup);
document.querySelector("#message-editor").addEventListener("submit", saveMessage);
document.querySelector("#import-lookup-csv").addEventListener("click", importLookupCsv);
document.querySelector("#add-reference-row").addEventListener("click", addReferenceRow);
document.querySelector("#add-reference-column").addEventListener("click", addReferenceColumn);
document.querySelector("#sync-reference-json").addEventListener("click", syncReferenceGridFromJson);
document.querySelector("#lookup-rows").addEventListener("change", syncReferenceGridFromJson);
document.querySelector("#lookup-key-column").addEventListener("change", renderReferenceGrid);
document.querySelector("#settings-form").addEventListener("submit", saveSettings);
document.querySelector("#token-form").addEventListener("submit", createToken);

loadMetrics();
loadRules();
newRule();
newLookup();
newMessage();
loadLookups();
loadMessages();
loadSettings();
loadSchema({ silent: true });
loadEvaluatePreset();
loadIntegration();

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

async function loadRules() {
  try {
    const body = await api("/v1/rule-sets");
    cachedRuleSets = body.rule_sets;
    renderEvaluateRuleOptions();
    renderRuleList();
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
  const events = metrics.client_events || {};
  metricCards.innerHTML = [
    metricCard("Requests 24h", formatNumber(requests.last_24h), `${formatNumber(requests.total)} total`),
    metricCard("Unique Profiles", formatNumber(requests.unique_profiles), "Seen in audit log"),
    metricCard("Published Rules", formatNumber(rules.published), `${formatNumber(rules.draft)} drafts`),
    metricCard("Schema Items", formatNumber(schema.total), `${schema.last_sync_status || "never"} sync`),
    metricCard("Client Cache", `${Math.round((cache.hit_rate || 0) * 100)}%`, `${formatNumber(cache.entries || 0)} active entries`),
    metricCard("Client Events", formatNumber(events.last_24h || 0), `${formatNumber(events.total || 0)} total`)
  ].join("");

  renderRuleUsage(metrics.rule_usage || []);
  loadClientEventMetrics();
  renderTable("#metrics-result-distribution", ["Result", "Count", "Share", "", ""], resultDistributionRows(metrics));
  renderTable("#metrics-rule-inventory", ["Status", "Count", "", "", ""], [
    ["Published", formatNumber(rules.published), "", "", ""],
    ["Draft", formatNumber(rules.draft), "", "", ""],
    ["Archived", formatNumber(rules.archived), "", "", ""],
    ["Total", formatNumber(rules.total), "", "", ""]
  ]);
  document.querySelector("#metrics-schema-health").innerHTML = [
    statusItem("Attributes", formatNumber(schema.attributes || 0)),
    statusItem("Segments", formatNumber(schema.segments || 0)),
    statusItem("Context keys", formatNumber(schema.context || 0)),
    statusItem("Last sync", schema.last_synced_at ? formatTime(schema.last_synced_at) : "never"),
    statusItem("Imported last sync", formatNumber(schema.last_sync_count || 0)),
    statusItem("Reference tables", formatNumber(metrics.lookups?.total || 0)),
    statusItem("Cache hits", formatNumber(cache.hits || 0)),
    statusItem("Cache misses", formatNumber(cache.misses || 0)),
    ...clientEventStatusItems(events.by_type || [])
  ].join("");
  if (ruleDetailPanel && !ruleDetailPanel.textContent.trim()) {
    ruleDetailPanel.innerHTML = `<div class="status-line">Select a rule in Rule Usage to inspect recent decisions, fallback rate, and matched branch frequency.</div>`;
  }
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
    <div class="overview-grid">
      ${clientEventGroup("Rules", metrics.by_rule)}
      ${clientEventGroup("Variants", metrics.by_variant)}
      ${clientEventGroup("Messages", metrics.by_message)}
      ${clientEventGroup("Surfaces", metrics.by_surface)}
    </div>
    <div>
      <div class="editor-title">Recent Events</div>
      <div class="table compact-table">${header(["Time", "Type", "Rule", "Profile", "Variant"])}${clientEventRows(metrics.recent_events)}</div>
    </div>
  `;
}

function clientEventGroup(title, items = []) {
  return `
    <div>
      <div class="editor-title">${escapeHtml(title)}</div>
      <div class="table compact-table">${header(["Key", "Type", "Count", "Profiles", "Last seen"])}${
        items.length
          ? items.map((item) => row([
              item.key,
              item.event_type,
              formatNumber(item.count),
              formatNumber(item.unique_profiles),
              item.last_seen_at ? formatTime(item.last_seen_at) : "-"
            ])).join("")
          : row(["No data", "", "", "", ""])
      }</div>
    </div>
  `;
}

function clientEventRows(items = []) {
  return items.length
    ? items.map((item) => row([
        item.occurred_at ? formatTime(item.occurred_at) : "-",
        item.event_type,
        item.decision_key,
        item.profile_key,
        item.variant_key || item.message_id || "-"
      ])).join("")
    : row(["No events yet", "", "", "", ""]);
}

function clientEventStatusItems(items) {
  const counts = Object.fromEntries(items.map((item) => [item.event_type, item.count]));
  return [
    statusItem("Exposures", formatNumber(counts.exposure || 0)),
    statusItem("Impressions", formatNumber(counts.impression || 0))
  ];
}

function renderRuleUsage(items) {
  const target = document.querySelector("#metrics-rule-usage");
  target.innerHTML = header(["Rule", "Requests", "24h", "Profiles", "Last seen"]);
  target.innerHTML += items.length
    ? items.map((item) => row(
        [
          item.decision_key,
          formatNumber(item.requests),
          formatNumber(item.requests_24h),
          formatNumber(item.unique_profiles),
          item.last_evaluated_at ? formatTime(item.last_evaluated_at) : "-"
        ],
        { metricRuleKey: item.decision_key }
      )).join("")
    : row(["No data yet", "", "", "", ""]);
  target.querySelectorAll("[data-metric-rule-key]").forEach((element) => {
    element.addEventListener("click", () => loadRuleMetrics(element.dataset.metricRuleKey));
  });
}

async function loadRuleMetrics(key) {
  try {
    const body = await api(`/v1/metrics/rule/${encodeURIComponent(key)}`);
    renderRuleMetricsDetail(body.metrics);
  } catch (error) {
    ruleDetailPanel.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
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

function metricCard(label, value, meta) {
  return `<div class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><small>${escapeHtml(meta)}</small></div>`;
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

function statusItem(label, value) {
  return `<div class="status-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function renderRuleList() {
  const target = document.querySelector("#rule-list");
  target.innerHTML = header(["Name", "Decision key", "Status", "Version", "Actions"]);
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
      `${item.status} / ${item.type || "decision"}`,
      item.version ?? "-",
      actions
    ],
    { key: item.decision_key, rawColumns: [4] }
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
    document.querySelector("#rule-name").value = body.rule_set.name;
    document.querySelector("#rule-key").value = body.rule_set.decision_key;
    document.querySelector("#rule-key").disabled = true;
    document.querySelector("#rule-type").value = body.rule_set.type || "decision";
    document.querySelector("#rule-priority").value = body.rule_set.priority || 0;
    document.querySelector("#rule-surface").value = body.rule_set.surface || "";
    document.querySelector("#rule-client-ttl").value = body.rule_set.cache_policy?.client_ttl ?? "";
    document.querySelector("#rule-cache-scope").value = body.rule_set.cache_policy?.scope || (body.rule_set.cache_policy?.client_ttl ? "profile" : "none");
    document.querySelector("#rule-description").value = body.rule_set.description || "";
    document.querySelector("#rule-draft").value = JSON.stringify(
      body.draft || body.version?.definition || { fallback: { result: "deferred", outputs: {} }, branches: [] },
      null,
      2
    );
    syncBuilderFromJson();
    await loadVersions(key);
    editorOutput.textContent = `Loaded ${key}`;
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

function newRule() {
  selectedRuleKey = null;
  document.querySelector("#rule-name").value = "New Eligibility Rule";
  document.querySelector("#rule-key").value = "new_eligibility_rule";
  document.querySelector("#rule-key").disabled = false;
  document.querySelector("#rule-type").value = "decision";
  document.querySelector("#rule-priority").value = 0;
  document.querySelector("#rule-surface").value = "";
  document.querySelector("#rule-client-ttl").value = "";
  document.querySelector("#rule-cache-scope").value = "none";
  document.querySelector("#rule-description").value = "";
  document.querySelector("#fallback-result").value = "ineligible";
  document.querySelector("#fallback-outputs").value = "{}";
  versionList.innerHTML = row(["No published versions yet", "", "", ""]);
  document.querySelector("#builder-mode").value = "branches";
  graphBuilder = starterGraphBuilder();
  builderBranches = [newBranch(1)];
  renderBranchEditor();
  renderBuilderMode();
  syncJsonFromBuilder();
  editorOutput.textContent = "Ready for a new draft";
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
    if (warnings.length) throw new Error(`Cannot publish with broken schema references:\n${warnings.map((item) => `- ${item}`).join("\n")}`);
    const body = await api(`/v1/rule-sets/${encodeURIComponent(selectedRuleKey)}/publish`, { method: "POST", body: "{}" });
    editorOutput.textContent = JSON.stringify(body, null, 2);
    await loadRules();
    await loadVersions(selectedRuleKey);
  } catch (error) {
    editorOutput.textContent = error.message;
  }
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
    editorOutput.textContent = JSON.stringify(body, null, 2);
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

async function loadAudit() {
  const target = document.querySelector("#audit-list");
  target.innerHTML = header(["Time", "Decision", "Profile", "Result", "Matched"]);
  try {
    const params = auditParams();
    const body = await api(`/v1/audit${params.toString() ? `?${params}` : ""}`);
    target.innerHTML += body.audit
      .map((item, index) => row([item.evaluated_at, item.decision_key, item.profile_key, item.result, item.matched_rules.join(", ")], { auditIndex: index }))
      .join("");
    document.querySelectorAll("[data-audit-index]").forEach((element) => {
      element.addEventListener("click", () => {
        auditDetail.textContent = JSON.stringify(body.audit[Number(element.dataset.auditIndex)], null, 2);
      });
    });
    auditDetail.textContent = body.audit[0] ? JSON.stringify(body.audit[0], null, 2) : "No audit entries match the current filters";
  } catch (error) {
    target.innerHTML += row([error.message, "", "", "", ""]);
    auditDetail.textContent = error.message;
  }
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
  target.innerHTML = header(["Name", "ID", "Match column", "Rows", "Version"]);
  try {
    const body = await api("/v1/lookup-tables");
    cachedLookupTables = body.lookup_tables || [];
    target.innerHTML += body.lookup_tables
      .map((item) => row([item.name, item.id, item.key_column, item.rows.length, item.version], { lookupId: item.id }))
      .join("");
    document.querySelectorAll("[data-lookup-id]").forEach((element) => {
      element.addEventListener("click", () => loadLookup(element.dataset.lookupId, body.lookup_tables));
    });
    renderBranchEditor();
  } catch (error) {
    target.innerHTML += row([error.message, "", "", "", ""]);
  }
}

async function loadMessages() {
  const target = document.querySelector("#message-list");
  target.innerHTML = header(["Name", "ID", "Surface", "Status", "Updated"]);
  try {
    const body = await api("/v1/messages");
    target.innerHTML += body.messages.length
      ? body.messages.map((item) => row([item.name, item.id, item.surface || "-", item.status, item.updated_at], { messageId: item.id })).join("")
      : row(["No messages", "", "", "", ""]);
    document.querySelectorAll("[data-message-id]").forEach((element) => {
      element.addEventListener("click", () => loadMessage(element.dataset.messageId, body.messages));
    });
  } catch (error) {
    target.innerHTML += row([error.message, "", "", "", ""]);
  }
}

function newMessage() {
  selectedMessageId = null;
  document.querySelector("#message-id").value = "hero_offer";
  document.querySelector("#message-id").disabled = false;
  document.querySelector("#message-name").value = "Hero Offer";
  document.querySelector("#message-surface").value = "homepage_hero";
  document.querySelector("#message-status").value = "active";
  document.querySelector("#message-content").value = JSON.stringify({
    title: "Special offer",
    body: "A personalized offer is ready.",
    cta_label: "View offer",
    image_url: ""
  }, null, 2);
  document.querySelector("#message-schema").value = JSON.stringify({
    title: "string",
    body: "string",
    cta_label: "string",
    image_url: "url"
  }, null, 2);
  document.querySelector("#message-metadata").value = JSON.stringify({}, null, 2);
  messageOutput.textContent = "Ready for a new message";
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
  messageOutput.textContent = `Loaded ${id}`;
}

async function saveMessage(event) {
  event.preventDefault();
  try {
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
    const mode = document.querySelector("#eval-mode").value;
    const path = mode === "draft"
      ? `/v1/rule-sets/${encodeURIComponent(request.decision_key)}/test`
      : "/v1/evaluate";
    const body = await api(path, {
      method: "POST",
      body: JSON.stringify(request)
    });
    renderEvaluationTrace(body);
    evalOutput.textContent = formatDecisionOutput(body);
    loadAudit();
    loadMetrics();
  } catch (error) {
    evalTrace.innerHTML = "";
    evalOutput.textContent = error.message;
  }
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

function readEditorPayload() {
  return {
    name: document.querySelector("#rule-name").value.trim(),
    decision_key: document.querySelector("#rule-key").value.trim(),
    description: document.querySelector("#rule-description").value.trim(),
    type: document.querySelector("#rule-type").value,
    priority: Number(document.querySelector("#rule-priority").value || 0),
    surface: document.querySelector("#rule-surface").value.trim(),
    cache_policy: readCachePolicy(),
    draft: JSON.parse(document.querySelector("#rule-draft").value),
    tags: []
  };
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
    bindOutputFieldEditor(node, branchIndex);
    bindLookupOutputHelper(node, branchIndex);
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
        value: ""
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

    const conditions = node.querySelector("[data-role='conditions']");
    branch.conditions.forEach((condition, conditionIndex) => {
      const conditionNode = document.querySelector("#condition-template").content.firstElementChild.cloneNode(true);
      bindConditionField(conditionNode, branchIndex, conditionIndex, "source");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "key");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "operator");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "value");
      bindSchemaKeySuggestions(conditionNode, branchIndex, conditionIndex);
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
  const cards = nodes.map((node) => {
    const edges = graphNodeEdges(node);
    return `
      <button type="button" class="graph-node branch-node" data-graph-node="${escapeHtml(node.id)}">
        <span class="graph-kicker">${escapeHtml(node.type || "node")}${node.id === graphBuilder.entry ? " / entry" : ""}</span>
        <strong>${escapeHtml(node.id || "node")}</strong>
        <span>${escapeHtml(graphNodeSummary(node))}</span>
        <small>${escapeHtml(edges.length ? `Routes to ${edges.join(", ")}` : "Terminal node")}</small>
      </button>
    `;
  }).join("");
  ruleGraph.innerHTML = `
    <div class="graph-stage">
      <div class="graph-node input-node">
        <span class="graph-kicker">Entry</span>
        <strong>${escapeHtml(graphBuilder.entry || "input")}</strong>
        <span>${escapeHtml(nodes.length)} node${nodes.length === 1 ? "" : "s"}</span>
      </div>
      <div class="graph-lane">
        ${cards || '<div class="graph-empty">Create a graph template or add a node.</div>'}
      </div>
      <div class="graph-node fallback-node">
        <span class="graph-kicker">Validation</span>
        <strong>${escapeHtml(graphReachabilitySummary())}</strong>
        <span>Draft JSON remains the source of truth.</span>
      </div>
    </div>
  `;
  ruleGraph.querySelectorAll("[data-graph-node]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = graphNodeEditor.querySelector(`[data-node-id="${cssEscape(button.dataset.graphNode)}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("highlight");
      setTimeout(() => target?.classList.remove("highlight"), 900);
    });
  });
}

function renderGraphBuilder() {
  document.querySelector("#graph-entry").value = graphBuilder.entry || "";
  graphNodeEditor.innerHTML = (graphBuilder.nodes || []).map((node, index) => graphNodeEditorCard(node, index)).join("");
  graphNodeEditor.querySelectorAll("[data-graph-field]").forEach((input) => {
    input.addEventListener("input", () => updateGraphNodeField(Number(input.dataset.nodeIndex), input.dataset.graphField, input.value));
    input.addEventListener("change", syncJsonFromBuilder);
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
  const field = (name, label, value = node[name] ?? "") => `
    <label>
      ${label}
      <input data-node-index="${index}" data-graph-field="${name}" value="${escapeHtml(formatOutputValue(value))}" />
    </label>
  `;
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
      field("table", "Reference table"),
      field("key_expression", "Key expression"),
      field("column", "Field to return"),
      field("output_key", "Store as context")
    ].join("");
  }
  if (node.type === "frequency_cap") {
    return [
      field("max", "Max events"),
      field("window_days", "Window days"),
      field("message_id", "Message ID"),
      field("surface", "Surface"),
      field("capped", "Capped route"),
      field("output_key", "Store count as")
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
  if (field === "type") Object.assign(node, graphNodeDefaults(node.type, node.id));
  renderRuleGraph();
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
  if (type === "lookup") return { ...base, table: "", key_expression: "\"\"", column: "", output_key: id, next: "" };
  if (type === "frequency_cap") return { ...base, max: 3, window_days: 7, next: "", capped: "" };
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
    syncJsonFromBuilder();
  });
  input.addEventListener("change", () => {
    if (field === "source") renderBranchEditor();
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

function syncJsonFromBuilder() {
  clearInvalid();
  try {
    const draft = document.querySelector("#builder-mode").value === "graph" ? graphFromBuilder() : draftFromBuilder();
    validateDraft(draft);
    document.querySelector("#rule-draft").value = JSON.stringify(draft, null, 2);
    renderRuleGraph();
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
    output.value = condition.operator === "in" || condition.operator === "not_in"
      ? String(condition.value || "").split(",").map((item) => parseLiteral(item.trim()))
      : parseLiteral(String(condition.value ?? "").trim());
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
      value: Array.isArray(condition.value) ? condition.value.join(", ") : condition.value ?? ""
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

function newLookup() {
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
  lookupOutput.textContent = "Ready for a new reference table";
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
  const keyColumn = document.querySelector("#lookup-key-column").value.trim() || "key";
  const discovered = [...new Set(rows.flatMap((rowItem) => Object.keys(rowItem || {})))];
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
  lookupOutput.textContent = `Loaded ${id}`;
}

async function loadLookupVersion(id, version) {
  try {
    const body = await api(`/v1/lookup-tables/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}`);
    const table = body.lookup_table;
    document.querySelector("#lookup-name").value = table.name;
    document.querySelector("#lookup-key-column").value = table.key_column;
    document.querySelector("#lookup-rows").value = JSON.stringify(table.rows || [], null, 2);
    renderReferenceGrid();
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
}

function loadEvaluatePreset() {
  const preset = document.querySelector("#eval-preset")?.value || "nbo_green";
  const request = evaluatePreset(preset);
  document.querySelector("#eval-rule-key").value = request.decision_key;
  document.querySelector("#eval-profile-key").value = request.profile_key;
  evalInput.value = JSON.stringify(request, null, 2);
}

function readEvaluateInput() {
  const body = JSON.parse(evalInput.value || "{}");
  body.decision_key = document.querySelector("#eval-rule-key").value || body.decision_key;
  body.profile_key = document.querySelector("#eval-profile-key").value.trim() || body.profile_key;
  return body;
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
    document.querySelector("#setting-environment-label").value = settings.environment_label || "";
    document.querySelector("#setting-audit-retention-days").value = settings.audit_retention_days || "";
    document.querySelector("#setting-client-event-retention-days").value = settings.client_event_retention_days || "";
    document.querySelector("#setting-bootstrap-tokens-enabled").value = settings.bootstrap_tokens_enabled === false ? "false" : "true";
    document.querySelector("#setting-meiro-url").value = settings.meiro_url || "";
    document.querySelector("#setting-meiro-source-slug").value = settings.meiro_source_slug || "";
    document.querySelector("#setting-meiro-api-url").value = settings.meiro_api_url || "";
    document.querySelector("#setting-meiro-api-token").value = "";
    document.querySelector("#setting-meiro-api-token").placeholder = settings.meiro_api_token_configured ? "Configured" : "";
    document.querySelector("#setting-schema-sync-interval").value = settings.schema_sync_interval_minutes || 15;
    document.querySelector("#schema-sync-identifier-type").value = settings.schema_sync_identifier_type || "";
    document.querySelector("#schema-sync-identifier-value").value = settings.schema_sync_identifier_value || "";
    renderSchemaSyncStatus(settings, body.runtime?.schema_sync || {});
    settingsOutput.textContent = JSON.stringify(body, null, 2);
    renderIntegration();
    await loadTokens();
  } catch (error) {
    settingsOutput.textContent = error.message;
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
      schema_sync_interval_minutes: Number(document.querySelector("#setting-schema-sync-interval").value || 15),
      schema_sync_identifier_type: document.querySelector("#schema-sync-identifier-type").value.trim(),
      schema_sync_identifier_value: document.querySelector("#schema-sync-identifier-value").value.trim()
    };
    const apiToken = document.querySelector("#setting-meiro-api-token").value.trim();
    if (apiToken) payload.meiro_api_token = apiToken;
    const body = await api("/v1/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    cachedSettings = { ...cachedSettings, settings: body.settings || {} };
    renderSchemaSyncStatus(body.settings || {}, body.runtime?.schema_sync || {});
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
  } catch (error) {
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

async function loadIntegration() {
  try {
    const body = await api("/v1/settings");
    cachedSettings = { settings: body.settings || {}, runtime: body.runtime || {} };
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
  document.querySelector("#integration-endpoint").value = endpoint;
  document.querySelector("#integration-meiro-url").value = collectorEndpoint || "";
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
  }, null, 2) + `\n\nForward this result to Meiro:\nPOST ${collectorEndpoint || "<MEIRO_COLLECTOR_ENDPOINT>"}`;
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

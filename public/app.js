const tokenInput = document.querySelector("#token");
const evalInput = document.querySelector("#eval-input");
const evalOutput = document.querySelector("#eval-output");
const editorOutput = document.querySelector("#rule-editor-output");
const branchEditor = document.querySelector("#branch-editor");
const lookupOutput = document.querySelector("#lookup-output");
const auditDetail = document.querySelector("#audit-detail");
const versionList = document.querySelector("#version-list");
const lookupVersionList = document.querySelector("#lookup-version-list");
const settingsOutput = document.querySelector("#settings-output");
const tokenOutput = document.querySelector("#token-output");
const schemaOutput = document.querySelector("#schema-output");
const integrationTemplate = document.querySelector("#integration-template");
const integrationResponse = document.querySelector("#integration-response");
let selectedRuleKey = null;
let selectedLookupId = null;
let builderBranches = [];
let cachedRuleSets = [];
let cachedSettings = {};
let cachedSchema = [];

document.querySelectorAll("nav button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("nav button, .view").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.view}`).classList.add("active");
  });
});

document.querySelector("#refresh-rules").addEventListener("click", loadRules);
document.querySelector("#rule-filter-search").addEventListener("input", renderRuleList);
document.querySelector("#rule-filter-status").addEventListener("change", renderRuleList);
document.querySelector("#rule-filter-type").addEventListener("change", renderRuleList);
document.querySelector("#rule-filter-tag").addEventListener("input", renderRuleList);
document.querySelector("#refresh-audit").addEventListener("click", loadAudit);
document.querySelector("#refresh-lookups").addEventListener("click", loadLookups);
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
document.querySelector("#export-config").addEventListener("click", exportConfig);
document.querySelector("#sync-json").addEventListener("click", syncJsonFromBuilder);
document.querySelector("#add-branch").addEventListener("click", () => {
  builderBranches.push(newBranch(builderBranches.length + 1));
  renderBranchEditor();
  syncJsonFromBuilder();
});
document.querySelector("#publish-rule").addEventListener("click", publishSelectedRule);
document.querySelector("#rule-editor").addEventListener("submit", saveDraft);
document.querySelector("#rule-draft").addEventListener("change", syncBuilderFromJson);
document.querySelector("#fallback-result").addEventListener("input", syncJsonFromBuilder);
document.querySelector("#fallback-outputs").addEventListener("change", syncJsonFromBuilder);
document.querySelector("#lookup-editor").addEventListener("submit", saveLookup);
document.querySelector("#import-lookup-csv").addEventListener("click", importLookupCsv);
document.querySelector("#settings-form").addEventListener("submit", saveSettings);
document.querySelector("#token-form").addEventListener("submit", createToken);

loadRules();
newRule();
newLookup();
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
  document.querySelector("#rule-description").value = "";
  document.querySelector("#fallback-result").value = "ineligible";
  document.querySelector("#fallback-outputs").value = "{}";
  versionList.innerHTML = row(["No published versions yet", "", "", ""]);
  builderBranches = [newBranch(1)];
  renderBranchEditor();
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
  target.innerHTML = header(["Name", "ID", "Key column", "Rows", "Version"]);
  try {
    const body = await api("/v1/lookup-tables");
    target.innerHTML += body.lookup_tables
      .map((item) => row([item.name, item.id, item.key_column, item.rows.length, item.version], { lookupId: item.id }))
      .join("");
    document.querySelectorAll("[data-lookup-id]").forEach((element) => {
      element.addEventListener("click", () => loadLookup(element.dataset.lookupId, body.lookup_tables));
    });
  } catch (error) {
    target.innerHTML += row([error.message, "", "", "", ""]);
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
    evalOutput.textContent = formatDecisionOutput(body);
    loadAudit();
  } catch (error) {
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
    Number.isInteger(options.auditIndex) ? `data-audit-index="${options.auditIndex}"` : "",
    options.tokenId ? `data-token-id="${escapeHtml(options.tokenId)}"` : ""
  ].filter(Boolean).join(" ");
  const className = options.key || options.lookupId || Number.isInteger(options.auditIndex) || options.tokenId ? "row actionable" : "row";
  return `<div class="${className}" ${attrs}>${values.map((value, index) => `<div>${options.rawColumns?.includes(index) ? String(value ?? "") : escapeHtml(String(value ?? ""))}</div>`).join("")}</div>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function readEditorPayload() {
  return {
    name: document.querySelector("#rule-name").value.trim(),
    decision_key: document.querySelector("#rule-key").value.trim(),
    description: document.querySelector("#rule-description").value.trim(),
    type: document.querySelector("#rule-type").value,
    priority: Number(document.querySelector("#rule-priority").value || 0),
    surface: document.querySelector("#rule-surface").value.trim(),
    draft: JSON.parse(document.querySelector("#rule-draft").value),
    tags: []
  };
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
    bindBranchField(node, branchIndex, "id");
    bindBranchField(node, branchIndex, "result");
    bindBranchField(node, branchIndex, "outputs");
    bindBranchField(node, branchIndex, "logic");
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
}

function bindLookupOutputHelper(node, branchIndex) {
  const branch = builderBranches[branchIndex];
  const targetInput = node.querySelector("[data-helper='target']");
  const tableInput = node.querySelector("[data-helper='table']");
  const keyInput = node.querySelector("[data-helper='key']");
  const columnInput = node.querySelector("[data-helper='column']");
  const outputs = parseJsonSafe(branch.outputs || "{}");
  targetInput.value = "offer_tier";
  tableInput.value = "offer_tiers";
  keyInput.value = typeof outputs.offer_id === "string" ? JSON.stringify(outputs.offer_id) : "";
  columnInput.value = "offer_tier";
  node.querySelector("[data-action='apply-lookup-output']").addEventListener("click", () => {
    try {
      const target = slug(targetInput.value || columnInput.value);
      const table = tableInput.value.trim();
      const keyExpression = keyInput.value.trim();
      const column = columnInput.value.trim();
      if (!target || !table || !keyExpression || !column) throw new Error("Lookup output needs target, table, key expression, and column");
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
    const draft = draftFromBuilder();
    validateDraft(draft);
    document.querySelector("#rule-draft").value = JSON.stringify(draft, null, 2);
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
    document.querySelector("#fallback-result").value = draft.fallback?.result || "deferred";
    document.querySelector("#fallback-outputs").value = JSON.stringify(draft.fallback?.outputs || {});
    builderBranches = (draft.branches || []).map((branch, index) => branchToBuilder(branch, index));
    if (builderBranches.length === 0) builderBranches = [newBranch(1)];
    renderBranchEditor();
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

function parseJsonSafe(raw) {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function validateDraft(draft) {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) throw new Error("Draft must be a JSON object");
  if (draft.graph) return;
  if (!Array.isArray(draft.branches)) throw new Error("Draft must include a branches array");
  if (draft.branches.length === 0) throw new Error("Draft needs at least one branch");
  draft.branches.forEach((branch, index) => {
    if (!branch.id) throw new Error(`Branch ${index + 1} needs an ID`);
    if (!branch.result) throw new Error(`Branch ${branch.id} needs a result`);
    validateConditionGroup(branch.when, `Branch ${branch.id}`, 1);
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
  document.querySelector("#lookup-id").value = "offer_tiers";
  document.querySelector("#lookup-id").disabled = false;
  document.querySelector("#lookup-name").value = "Offer Tiers";
  document.querySelector("#lookup-key-column").value = "offer_id";
  document.querySelector("#lookup-rows").value = JSON.stringify(
    [
      { offer_id: "solar_green_energy", offer_tier: "premium", priority: 80 },
      { offer_id: "retention_discount", offer_tier: "save", priority: 90 }
    ],
    null,
    2
  );
  document.querySelector("#lookup-csv").value = "";
  loadLookupVersions(null);
  lookupOutput.textContent = "Ready for a new lookup table";
}

function loadLookup(id, tables) {
  const table = tables.find((item) => item.id === id);
  if (!table) {
    lookupOutput.textContent = `Lookup table not found: ${id}`;
    return;
  }
  selectedLookupId = id;
  document.querySelector("#lookup-id").value = table.id;
  document.querySelector("#lookup-id").disabled = true;
  document.querySelector("#lookup-name").value = table.name;
  document.querySelector("#lookup-key-column").value = table.key_column;
  document.querySelector("#lookup-rows").value = JSON.stringify(table.rows || [], null, 2);
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
    lookupOutput.textContent = `Loaded ${id} version ${version} into the editor. Save Lookup to restore it as the current version.`;
  } catch (error) {
    lookupOutput.textContent = error.message;
  }
}

async function saveLookup(event) {
  event.preventDefault();
  clearInvalid();
  try {
    const id = selectedLookupId || document.querySelector("#lookup-id").value.trim();
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
    lookupOutput.textContent = "Select or save a lookup table before exporting CSV.";
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
      errors: body.errors,
      tested_version: body.tested_version || "published"
    },
    response: body
  }, null, 2);
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
    document.querySelector("#setting-meiro-url").value = settings.meiro_url || "";
    document.querySelector("#setting-meiro-source-slug").value = settings.meiro_source_slug || "";
    document.querySelector("#setting-meiro-api-url").value = settings.meiro_api_url || "";
    document.querySelector("#setting-meiro-api-token").value = "";
    document.querySelector("#setting-meiro-api-token").placeholder = settings.meiro_api_token_configured ? "Configured" : "";
    document.querySelector("#setting-schema-sync-interval").value = settings.schema_sync_interval_minutes || 15;
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
      meiro_url: document.querySelector("#setting-meiro-url").value.trim(),
      meiro_source_slug: document.querySelector("#setting-meiro-source-slug").value.trim(),
      meiro_api_url: document.querySelector("#setting-meiro-api-url").value.trim(),
      schema_sync_interval_minutes: Number(document.querySelector("#setting-schema-sync-interval").value || 15)
    };
    const apiToken = document.querySelector("#setting-meiro-api-token").value.trim();
    if (apiToken) payload.meiro_api_token = apiToken;
    const body = await api("/v1/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    cachedSettings = { ...cachedSettings, settings: body.settings || {} };
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
    renderBranchEditor();
    schemaOutput.textContent = JSON.stringify(body, null, 2);
  } catch (error) {
    schemaOutput.textContent = error.message;
  }
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
  target.innerHTML = header(["Name", "Scopes", "Created", "Last used", "Status"]);
  try {
    const body = await api("/v1/tokens");
    target.innerHTML += body.tokens
      .map((token) =>
        row(
          [
            token.name,
            token.scopes.join(", "),
            token.created_at,
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
        scopes: document.querySelector("#token-scopes").value.split(",")
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

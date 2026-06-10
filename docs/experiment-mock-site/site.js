const storageKey = "dee_mock_site_settings";

const state = {
  sdk: null,
  decisions: new Map(),
  modifications: new Map(),
  lastPayload: null,
  eventCount: 0,
  evaluationRuns: 0,
  editor: {
    enabled: new URLSearchParams(location.search).get("dee_editor") === "1",
    selected: null,
    selector: "",
    modifications: [],
    snapshots: new Map(),
    variant: new URLSearchParams(location.search).get("dee_editor_variant") || "treatment",
    ruleKey: new URLSearchParams(location.search).get("dee_editor_rule") || "",
    token: new URLSearchParams(location.search).get("dee_editor_token") || ""
  }
};

const elements = {
  runtimeForm: document.querySelector("#runtime-form"),
  baseUrl: document.querySelector("#dee-base-url"),
  token: document.querySelector("#dee-token"),
  configDecisionKey: document.querySelector("#config-decision-key"),
  domDecisionKey: document.querySelector("#dom-decision-key"),
  heroDecisionKey: document.querySelector("#hero-decision-key"),
  offerDecisionKey: document.querySelector("#offer-decision-key"),
  messageDecisionKey: document.querySelector("#message-decision-key"),
  requestSurface: document.querySelector("#request-surface"),
  profileKey: document.querySelector("#profile-key"),
  identifierEmail: document.querySelector("#identifier-email"),
  enrichment: document.querySelector("#profile-enrichment"),
  qaOverride: document.querySelector("#qa-override"),
  leadScore: document.querySelector("#lead-score"),
  sustainabilityScore: document.querySelector("#sustainability-score"),
  sendLocalPayload: document.querySelector("#send-local-payload"),
  autoExposure: document.querySelector("#auto-exposure"),
  connectionState: document.querySelector("#connection-state"),
  newVisitor: document.querySelector("#new-visitor"),
  evaluateAll: document.querySelector("#evaluate-all"),
  sendExposure: document.querySelector("#send-exposure"),
  sendImpression: document.querySelector("#send-impression"),
  sendConversion: document.querySelector("#send-conversion"),
  clearLog: document.querySelector("#clear-log"),
  copyPayload: document.querySelector("#copy-payload"),
  decisionList: document.querySelector("#decision-list"),
  modificationList: document.querySelector("#modification-list"),
  modificationSummary: document.querySelector("#modification-summary"),
  rawOutput: document.querySelector("#raw-output"),
  eventLog: document.querySelector("#event-log"),
  metrics: {
    placements: document.querySelector("#metric-placements"),
    decisions: document.querySelector("#metric-decisions"),
    events: document.querySelector("#metric-events"),
    result: document.querySelector("#metric-result")
  }
};

restoreSettings();
ensureVisitor();
bindEvents();
initializeSdk({ autoEvaluate: false });
initializeVisualEditorOverlay();
renderDiagnostics();
logEvent("ready", "Mock site loaded. Apply runtime setup to evaluate all placements.");

function bindEvents() {
  elements.runtimeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    saveSettings();
    initializeSdk({ autoEvaluate: false });
    await evaluateAllPlacements();
  });

  elements.newVisitor.addEventListener("click", () => {
    createVisitor();
    saveSettings();
    state.decisions.clear();
    state.modifications.clear();
    renderDiagnostics();
    logEvent("visitor", `New profile ${elements.profileKey.value}`);
  });

  elements.evaluateAll.addEventListener("click", () => evaluateAllPlacements());
  elements.sendExposure.addEventListener("click", () => sendEventForAll("exposure"));
  elements.sendImpression.addEventListener("click", () => sendEventForAll("impression"));
  elements.sendConversion.addEventListener("click", () => sendEventForAll("conversion", {
    event: { name: "mock_purchase", value: 149, currency: "EUR", order_id: `order-${Date.now()}` }
  }));
  elements.clearLog.addEventListener("click", () => {
    elements.eventLog.replaceChildren();
    state.eventCount = 0;
    renderMetrics();
  });
  elements.copyPayload.addEventListener("click", async () => {
    if (!state.lastPayload) return;
    await navigator.clipboard?.writeText(JSON.stringify(state.lastPayload, null, 2)).catch(() => {});
    logEvent("copy", "Copied latest payload to clipboard when browser permissions allow it.");
  });

  document.querySelectorAll("[data-evaluate-placement]").forEach((button) => {
    button.addEventListener("click", () => evaluatePlacement(document.querySelector(button.dataset.evaluatePlacement)));
  });

  document.addEventListener("dee:decision", (event) => {
    const placement = event.target?.dataset?.deePlacement || "unknown";
    rememberDecision(event.target, event.detail?.decision, { rendered: event.detail?.rendered, diagnostics: event.detail?.diagnostics || [] });
    logEvent("decision", `${placement} rendered=${event.detail?.rendered !== false}`);
  }, true);

  document.addEventListener("dee:modifications", (event) => {
    rememberModifications(event.target, event.detail || {});
  }, true);

  document.addEventListener("dee:event", (event) => {
    const placement = event.target?.dataset?.deePlacement || "unknown";
    state.eventCount += 1;
    state.lastPayload = {
      event_type: event.detail?.type,
      payload: event.detail?.payload,
      response: event.detail?.response
    };
    elements.rawOutput.textContent = JSON.stringify(state.lastPayload, null, 2);
    logEvent(event.detail?.type || "event", `${placement}: ${event.detail?.response?.duplicate ? "duplicate" : "accepted"}`);
    renderMetrics();
  }, true);
}

function initializeVisualEditorOverlay() {
  if (!state.editor.enabled) return;
  const panel = document.createElement("aside");
  panel.className = "visual-editor-overlay";
  panel.innerHTML = `
    <div class="visual-editor-head">
      <div>
        <strong>DEE Visual Editor</strong>
        <span>${escapeHtml(state.editor.ruleKey || "Draft experiment")} · ${escapeHtml(state.editor.variant)}</span>
      </div>
      <button type="button" data-editor-close>Close</button>
    </div>
    <label>
      Selected selector
      <input data-editor-selector readonly placeholder="Click an element on the page" />
    </label>
    <div class="visual-editor-quality" data-editor-quality>
      <strong>No element selected</strong>
      <span>Click a page element to generate a selector and preview a modification.</span>
    </div>
    <div class="visual-editor-grid">
      <label>
        Type
        <select data-editor-type>
          <option value="change_text">Change text</option>
          <option value="change_attribute">Change attribute</option>
          <option value="change_style">Change style</option>
          <option value="insert_html">Insert HTML</option>
          <option value="remove">Remove</option>
        </select>
      </label>
      <label>
        Attribute / CSS property
        <input data-editor-attribute placeholder="href, src, color" />
      </label>
    </div>
    <label>
      Value / HTML
      <textarea data-editor-value placeholder="New text, URL, CSS value, or safe HTML"></textarea>
    </label>
    <div class="visual-editor-actions">
      <button type="button" data-editor-preview>Preview</button>
      <button type="button" data-editor-add>Add change</button>
      <button type="button" data-editor-reset>Reset preview</button>
      <button type="button" data-editor-copy>Copy JSON</button>
      <button type="button" data-editor-save>Save draft</button>
    </div>
    <div class="visual-editor-status" data-editor-status>
      ${state.editor.token && state.editor.ruleKey ? "Ready to save changes to DEE draft." : "Open from DEE to enable draft save."}
    </div>
    <div class="visual-editor-inventory">
      <div>
        <strong>Changes</strong>
        <span data-editor-count>0 queued</span>
      </div>
      <ol data-editor-inventory></ol>
    </div>
    <pre data-editor-output></pre>
  `;
  document.body.append(panel);
  document.body.classList.add("visual-editor-active");
  panel.querySelector("[data-editor-close]").addEventListener("click", () => {
    state.editor.enabled = false;
    panel.remove();
    document.body.classList.remove("visual-editor-active");
    clearEditorSelection();
  });
  panel.querySelector("[data-editor-preview]").addEventListener("click", () => {
    const modification = currentEditorModification(panel);
    previewEditorModification(modification);
    panel.querySelector("[data-editor-output]").textContent = JSON.stringify(editorOutput(modification), null, 2);
  });
  panel.querySelector("[data-editor-add]").addEventListener("click", () => {
    const modification = currentEditorModification(panel);
    if (!modification.selector) return;
    state.editor.modifications.push({ ...modification, id: uniqueModificationId(modification) });
    previewEditorModification(modification);
    renderEditorPanel(panel);
    logEvent("editor", `Queued ${modification.type} for ${modification.selector}.`);
  });
  panel.querySelector("[data-editor-reset]").addEventListener("click", () => {
    resetEditorPreview();
    renderEditorPanel(panel);
    logEvent("editor", "Reset visual editor preview changes.");
  });
  panel.querySelector("[data-editor-copy]").addEventListener("click", async () => {
    const modification = currentEditorModification(panel);
    const payload = editorOutput(modification.selector ? modification : null);
    panel.querySelector("[data-editor-output]").textContent = JSON.stringify(payload, null, 2);
    await navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).catch(() => {});
    logEvent("editor", "Copied visual editor modification JSON.");
  });
  panel.querySelector("[data-editor-save]").addEventListener("click", async () => {
    await saveEditorDraft(panel);
  });
  panel.querySelector("[data-editor-inventory]").addEventListener("click", (event) => {
    const removeButton = event.target.closest?.("[data-editor-remove]");
    const focusButton = event.target.closest?.("[data-editor-focus]");
    if (removeButton) {
      state.editor.modifications.splice(Number(removeButton.dataset.editorRemove), 1);
      resetEditorPreview();
      applyQueuedEditorPreview();
      renderEditorPanel(panel);
      return;
    }
    if (focusButton) {
      const modification = state.editor.modifications[Number(focusButton.dataset.editorFocus)];
      const target = modification?.selector ? document.querySelector(modification.selector) : null;
      if (target) {
        clearEditorSelection();
        state.editor.selected = target;
        state.editor.selector = modification.selector;
        target.classList.add("visual-editor-selected");
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        panel.querySelector("[data-editor-selector]").value = modification.selector;
        renderSelectorQuality(panel, modification.selector);
      }
    }
  });
  panel.addEventListener("input", (event) => {
    if (event.target.closest?.("[data-editor-selector], [data-editor-type], [data-editor-attribute], [data-editor-value]")) {
      renderEditorPanel(panel);
    }
  });
  panel.addEventListener("change", (event) => {
    if (event.target.closest?.("[data-editor-type]")) renderEditorPanel(panel);
  });
  renderEditorPanel(panel);
  document.addEventListener("click", handleVisualEditorPick, true);
  logEvent("editor", "Visual editor mode active. Click a page element to build a DOM modification.");
}

async function saveEditorDraft(panel) {
  const status = panel.querySelector("[data-editor-status]");
  const button = panel.querySelector("[data-editor-save]");
  const modification = currentEditorModification(panel);
  const payload = editorOutput(modification.selector ? modification : null);
  panel.querySelector("[data-editor-output]").textContent = JSON.stringify(payload, null, 2);
  if (!state.editor.ruleKey || !state.editor.token) {
    setEditorStatus(status, "Open this page from DEE Visual Editor to save directly to a draft.", "warn");
    return;
  }
  button.disabled = true;
  setEditorStatus(status, "Saving visual changes to DEE draft...", "");
  try {
    const baseUrl = elements.baseUrl.value.trim().replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/v1/experiments/${encodeURIComponent(state.editor.ruleKey)}/editor-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        editor_token: state.editor.token,
        variant_key: state.editor.variant,
        outputs: payload.outputs
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || `Save failed with ${response.status}`);
    setEditorStatus(status, `Saved ${body.modifications_count || 0} changes to ${state.editor.variant} draft.`, "good");
    logEvent("editor", `Saved ${body.modifications_count || 0} visual changes to DEE draft.`);
  } catch (error) {
    setEditorStatus(status, error.message || "Save failed.", "bad");
    logEvent("editor", `Draft save failed: ${error.message || error}`);
  } finally {
    button.disabled = false;
  }
}

function setEditorStatus(status, message, stateName = "") {
  if (!status) return;
  status.className = `visual-editor-status ${stateName}`.trim();
  status.textContent = message;
}

function handleVisualEditorPick(event) {
  if (!state.editor.enabled) return;
  const overlay = event.target.closest?.(".visual-editor-overlay");
  if (overlay) return;
  const target = event.target.closest?.("a, button, img, h1, h2, h3, p, strong, span, div, section, article");
  if (!target || target.closest(".visual-editor-overlay")) return;
  event.preventDefault();
  event.stopPropagation();
  clearEditorSelection();
  state.editor.selected = target;
  state.editor.selector = selectorForElement(target);
  target.classList.add("visual-editor-selected");
  const panel = document.querySelector(".visual-editor-overlay");
  if (!panel) return;
  panel.querySelector("[data-editor-selector]").value = state.editor.selector;
  panel.querySelector("[data-editor-value]").value = target.tagName === "IMG"
    ? target.getAttribute("src") || ""
    : target.textContent.trim().slice(0, 300);
  panel.querySelector("[data-editor-type]").value = target.tagName === "IMG" ? "change_attribute" : "change_text";
  panel.querySelector("[data-editor-attribute]").value = "";
  if (target.tagName === "IMG") {
    panel.querySelector("[data-editor-attribute]").value = "src";
  }
  renderEditorPanel(panel);
}

function clearEditorSelection() {
  document.querySelectorAll(".visual-editor-selected").forEach((item) => item.classList.remove("visual-editor-selected"));
}

function renderEditorPanel(panel = document.querySelector(".visual-editor-overlay")) {
  if (!panel) return;
  renderSelectorQuality(panel, panel.querySelector("[data-editor-selector]").value || state.editor.selector);
  renderEditorInventory(panel);
  const modification = currentEditorModification(panel);
  panel.querySelector("[data-editor-output]").textContent = JSON.stringify(editorOutput(modification.selector ? modification : null), null, 2);
}

function renderSelectorQuality(panel, selector) {
  const quality = panel.querySelector("[data-editor-quality]");
  if (!quality) return;
  if (!selector) {
    quality.className = "visual-editor-quality";
    quality.innerHTML = "<strong>No element selected</strong><span>Click a page element to generate a selector and preview a modification.</span>";
    return;
  }
  let count = 0;
  let valid = true;
  try {
    count = document.querySelectorAll(selector).length;
  } catch {
    valid = false;
  }
  const brittle = selector.includes(":nth-child");
  const stateName = !valid || count === 0 ? "bad" : count === 1 && !brittle ? "good" : "warn";
  const title = !valid
    ? "Invalid selector"
    : count === 0
      ? "No matches"
      : count === 1
        ? brittle ? "Unique but brittle" : "Unique selector"
        : `${count} matches`;
  const detail = !valid
    ? "Check CSS syntax before copying this change."
    : count === 0
      ? "This selector will be skipped by the SDK."
      : count === 1 && !brittle
        ? "Good candidate for a page-local experiment."
        : "Prefer id, data attributes, or tighter page targeting for production.";
  quality.className = `visual-editor-quality ${stateName}`;
  quality.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span>`;
}

function renderEditorInventory(panel) {
  const list = panel.querySelector("[data-editor-inventory]");
  const count = panel.querySelector("[data-editor-count]");
  if (!list || !count) return;
  count.textContent = `${state.editor.modifications.length} queued`;
  list.innerHTML = state.editor.modifications.length
    ? state.editor.modifications.map((modification, index) => `
      <li>
        <button type="button" data-editor-focus="${index}">
          <strong>${escapeHtml(modification.type)}</strong>
          <span>${escapeHtml(modification.selector || "-")}</span>
          <small>${escapeHtml(modificationSummary(modification))}</small>
        </button>
        <button type="button" data-editor-remove="${index}" aria-label="Remove change">Remove</button>
      </li>
    `).join("")
    : `<li class="empty">No changes queued yet.</li>`;
}

function selectorForElement(element) {
  if (element.id) return `#${cssEscape(element.id)}`;
  const dataSelector = element.getAttribute("data-demo-selector") || element.getAttribute("data-feature-card") || element.getAttribute("data-config-feature");
  if (dataSelector) return `[${element.hasAttribute("data-demo-selector") ? "data-demo-selector" : element.hasAttribute("data-feature-card") ? "data-feature-card" : "data-config-feature"}="${cssEscape(dataSelector)}"]`;
  const className = [...element.classList].filter((item) => !item.startsWith("visual-editor")).slice(0, 2).map(cssEscape).join(".");
  const base = `${element.tagName.toLowerCase()}${className ? `.${className}` : ""}`;
  return uniqueSelector(base, element) || base;
}

function uniqueSelector(base, element) {
  try {
    if (document.querySelectorAll(base).length === 1) return base;
  } catch {
    return "";
  }
  const parent = element.parentElement;
  if (!parent) return "";
  const index = [...parent.children].indexOf(element) + 1;
  const parentSelector = parent.id ? `#${cssEscape(parent.id)}` : parent.tagName.toLowerCase();
  return `${parentSelector} > ${element.tagName.toLowerCase()}:nth-child(${index})`;
}

function currentEditorModification(panel) {
  const type = panel.querySelector("[data-editor-type]").value;
  const selector = panel.querySelector("[data-editor-selector]").value || state.editor.selector;
  const attribute = panel.querySelector("[data-editor-attribute]").value.trim();
  const value = panel.querySelector("[data-editor-value]").value;
  const modification = {
    id: `mod_${slugForEditor(selector || type)}`,
    type,
    selector
  };
  if (type === "change_text") modification.value = value;
  if (type === "change_attribute") {
    modification.attribute = attribute || "href";
    modification.value = value;
  }
  if (type === "change_style") {
    modification.property = attribute || "color";
    modification.value = value;
  }
  if (type === "insert_html") {
    modification.html = value;
    modification.position = "replace";
  }
  if (type === "remove") modification.mode = "collapse";
  return modification;
}

function previewEditorModification(modification) {
  const target = state.editor.selected || document.querySelector(modification.selector);
  if (!target) return;
  rememberEditorSnapshot(target, modification.selector);
  if (modification.type === "change_text") target.textContent = modification.value || "";
  if (modification.type === "change_attribute") target.setAttribute(modification.attribute || "href", modification.value || "");
  if (modification.type === "change_style") target.style[modification.property || "color"] = modification.value || "";
  if (modification.type === "insert_html") target.innerHTML = modification.html || "";
  if (modification.type === "remove") target.hidden = true;
}

function rememberEditorSnapshot(target, selector) {
  const key = selector || selectorForElement(target);
  if (!key || state.editor.snapshots.has(key)) return;
  state.editor.snapshots.set(key, {
    target,
    text: target.textContent,
    html: target.innerHTML,
    hidden: target.hidden,
    style: target.getAttribute("style"),
    attributes: [...target.attributes].reduce((memo, attribute) => {
      memo[attribute.name] = attribute.value;
      return memo;
    }, {})
  });
}

function resetEditorPreview() {
  for (const snapshot of state.editor.snapshots.values()) {
    const target = snapshot.target;
    if (!target?.isConnected) continue;
    [...target.attributes].forEach((attribute) => {
      if (!(attribute.name in snapshot.attributes)) target.removeAttribute(attribute.name);
    });
    Object.entries(snapshot.attributes).forEach(([name, value]) => target.setAttribute(name, value));
    target.innerHTML = snapshot.html;
    target.hidden = snapshot.hidden;
    if (snapshot.style == null) target.removeAttribute("style");
    else target.setAttribute("style", snapshot.style);
  }
  state.editor.snapshots.clear();
}

function applyQueuedEditorPreview() {
  for (const modification of state.editor.modifications) {
    const target = document.querySelector(modification.selector);
    if (target) {
      state.editor.selected = target;
      previewEditorModification(modification);
    }
  }
}

function editorOutput(modification = null) {
  const modifications = [...state.editor.modifications];
  if (modification?.selector && !modifications.some((item) => item.id === modification.id)) {
    modifications.push(modification);
  }
  return {
    variant: state.editor.variant,
    outputs: {
      template: "dom_modifications",
      modifications
    }
  };
}

function uniqueModificationId(modification) {
  const base = modification.id || `mod_${slugForEditor(modification.selector || modification.type)}`;
  let id = base;
  let index = 2;
  while (state.editor.modifications.some((item) => item.id === id)) {
    id = `${base}_${index}`;
    index += 1;
  }
  return id;
}

function modificationSummary(modification) {
  if (modification.type === "change_text") return String(modification.value || "").slice(0, 80);
  if (modification.type === "change_attribute") return `${modification.attribute || "href"} = ${String(modification.value || "").slice(0, 70)}`;
  if (modification.type === "change_style") return `${modification.property || "color"}: ${String(modification.value || "").slice(0, 70)}`;
  if (modification.type === "insert_html") return String(modification.html || "").replace(/\s+/g, " ").slice(0, 80);
  if (modification.type === "remove") return "Hide selected element";
  return modification.type || "Change";
}

function slugForEditor(value) {
  return String(value || "change").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "change";
}

function initializeSdk(options = {}) {
  applyPlacementSettings();
  const token = elements.token.value.trim();
  const baseUrl = elements.baseUrl.value.trim().replace(/\/$/, "");
  const profileKey = () => elements.profileKey.value.trim();
  state.sdk = window.DEEWebSDK.createClient({
    baseUrl,
    token,
    profileKey,
    identifier: identifier(),
    profileEnrichment: elements.enrichment.value,
    autoEvaluate: options.autoEvaluate === true,
    autoExposure: elements.autoExposure.checked,
    debug: true,
    fallback: "keep",
    maxItems: 8,
    renderers: {
      configuration: renderWebsiteConfiguration,
      hero: renderHero,
      message: renderMessage,
      cards: renderCards
    }
  });
  const placements = state.sdk.init(document);
  elements.connectionState.textContent = token && baseUrl ? "SDK initialized" : "Missing URL or token";
  elements.metrics.placements.textContent = String(placements.length);
}

async function evaluateAllPlacements() {
  initializeSdk({ autoEvaluate: false });
  const placements = placementsList();
  logEvent("evaluate", `Evaluating ${placements.length} SDK placements.`);
  for (const placement of placements) {
    await evaluatePlacement(placement);
  }
}

async function evaluatePlacement(element) {
  if (!element || !state.sdk) return;
  const overrides = evaluateOverrides(element);
  try {
    const request = state.sdk.buildEvaluateRequest(element, overrides);
    const decision = await state.sdk.evaluatePlacement(element, overrides);
    renderSuppressedMessage(element, decision);
    state.lastPayload = { request, response: decision };
    elements.rawOutput.textContent = JSON.stringify(state.lastPayload, null, 2);
    elements.metrics.result.textContent = decision.result || "OK";
  } catch (error) {
    elements.metrics.result.textContent = "Error";
    elements.rawOutput.textContent = error.message;
    logEvent("error", `${element.dataset.deePlacement}: ${error.message}`);
  }
  renderDiagnostics();
}

async function sendEventForAll(type, extra = {}) {
  const entries = [...state.decisions.entries()];
  if (!entries.length) {
    logEvent("event", "Evaluate at least one placement before sending feedback.");
    return;
  }
  for (const [selector, record] of entries) {
    const element = document.querySelector(selector);
    if (!element || !record.decision) continue;
    await sendEvent(element, type, record.decision, extra);
  }
}

async function sendEvent(element, type, decision, extra = {}) {
  try {
    const response = await state.sdk.sendEvent(element, type, decision, extra);
    state.lastPayload = { event_type: type, decision, response };
    elements.rawOutput.textContent = JSON.stringify(state.lastPayload, null, 2);
  } catch (error) {
    logEvent("error", `${type} failed for ${element.dataset.deePlacement}: ${error.message}`);
  }
  renderMetrics();
}

function evaluateOverrides(element) {
  const forced = elements.qaOverride.value;
  const context = {
    ...baseContext(),
    placement: element.dataset.deePlacement,
    surface: element.dataset.deeSurface || elements.requestSurface.value.trim() || element.dataset.deePlacement
  };
  if (forced === "__holdout") context.force_holdout = true;
  else if (forced) context.force_variant = forced;

  return {
    attributes: elements.sendLocalPayload.checked ? demoAttributes() : {},
    segments: elements.sendLocalPayload.checked ? { demo_site_visitor: true, high_intent_browser: Number(elements.leadScore.value || 0) >= 70 } : {},
    context
  };
}

function baseContext() {
  return {
    channel: "web",
    page_url: location.href,
    session_id: sessionId(),
    profile_enrichment: elements.enrichment.value,
    request_source: "experiment_mock_site"
  };
}

function demoAttributes() {
  return {
    lead_score: [{ value: Number(elements.leadScore.value || 0) }],
    web_engagement_score: [{ value: 68 }],
    sustainability_score: [{ value: Number(elements.sustainabilityScore.value || 0) }],
    customer_lifetime_value: [{ value: 12500 }],
    monetary_rfm: [{ value: "high" }],
    churn_risk_score: [{ value: 0.18 }],
    outstanding_balance_tier: [{ value: "none" }],
    late_payments_count_12m: [{ value: 0 }],
    interacted_promotions: [{ value: "homepage_welcome" }],
    survey_nps_latest: [{ value: 9 }]
  };
}

async function renderHero(element, decision) {
  if (decision.result !== "eligible") return false;
  const outputs = decision.outputs || {};
  const content = outputs.message_content || outputs.message?.content || outputs;
  const badge = element.querySelector(".variant-badge");
  const title = element.querySelector("h2");
  const body = element.querySelector("p");
  const link = element.querySelector("a");
  if (badge) badge.textContent = decision.experiment?.variant_key ? `Variant ${decision.experiment.variant_key}` : decision.result;
  if (title) title.textContent = content.title || content.headline || outputs.headline || title.textContent;
  if (body) body.textContent = content.body || outputs.body || body.textContent;
  if (link) {
    link.textContent = content.cta_label || outputs.cta_label || link.textContent;
    link.href = content.cta_url || outputs.cta_url || link.href;
  }
  return true;
}

async function renderMessage(element, decision) {
  if (decision.result !== "eligible") return false;
  const outputs = decision.outputs || {};
  const message = outputs.message || {};
  const content = outputs.message_content || message.content || outputs;
  const template = messageTemplateType(content.template_type || message.template_type || outputs.template || "message");
  const imageUrl = messageImageUrl(content);
  element.classList.add("message-slot-live");
  element.innerHTML = `
    <span>${escapeHtml(template)}</span>
    ${imageUrl ? `<img class="message-slot-image" src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(content.image_alt || content.alt || content.title || message.name || "Message image")}" referrerpolicy="no-referrer" />` : ""}
    ${content.title || content.headline || message.name ? `<strong>${escapeHtml(content.title || content.headline || message.name)}</strong>` : ""}
    ${content.body || content.text ? `<p>${escapeHtml(content.body || content.text)}</p>` : ""}
    ${renderMessageExtras(content, template)}
    ${content.footer ? `<small>${escapeHtml(content.footer)}</small>` : ""}
    ${hasCtas(content) ? `<div class="message-actions">
      ${renderCtas(content)}
    </div>` : ""}
  `;
  return true;
}

function renderMessageExtras(content = {}, template = "message") {
  if (template === "survey") return renderSurveyContent(content);
  if (template === "carousel" || template === "recommendation") return renderMessageItems(content);
  return "";
}

function renderSurveyContent(content = {}) {
  const survey = content.survey && typeof content.survey === "object" ? content.survey : {};
  const questions = Array.isArray(content.questions) && content.questions.length
    ? content.questions
    : Array.isArray(survey.questions) && survey.questions.length
      ? survey.questions
      : [{ label: content.question || survey.question || "How relevant is this message?", options: content.options || survey.options || ["Low", "Medium", "High"] }];
  return `
    <div class="message-survey">
      ${questions.slice(0, 6).map((question, index) => `
        <fieldset>
          <legend>${escapeHtml(question.label || question.title || `Question ${index + 1}`)}</legend>
          <div>
            ${surveyOptions(question).length
              ? surveyOptions(question).map((option) => `<button type="button" data-dee-conversion="${escapeAttribute(option.tracking)}" data-dee-survey-question="${escapeAttribute(question.id || question.tracking_name || question.label || question.title || "survey_question")}" data-dee-survey-question-label="${escapeAttribute(question.label || question.title || "Survey question")}" data-dee-survey-value="${escapeAttribute(option.value)}">${escapeHtml(option.label)}</button>`).join("")
              : `<textarea data-dee-survey-input="${escapeAttribute(question.id || question.tracking_name || `survey_question_${index + 1}`)}" aria-label="${escapeAttribute(question.label || "Survey response")}"></textarea><button type="button" data-dee-conversion="${escapeAttribute(question.tracking_name || question.id || "survey_response")}" data-dee-survey-question="${escapeAttribute(question.id || question.tracking_name || `survey_question_${index + 1}`)}" data-dee-survey-question-label="${escapeAttribute(question.label || question.title || "Survey question")}" data-dee-survey-text="true">Submit</button>`}
          </div>
        </fieldset>
      `).join("")}
    </div>
  `;
}

function surveyOptions(question = {}) {
  return (Array.isArray(question.options) ? question.options : []).slice(0, 8).map((option) => {
    const optionObject = option && typeof option === "object" ? option : {};
    const label = optionObject.label || optionObject.title || optionObject.value || option;
    const value = optionObject.value || optionObject.id || label;
    return {
      label,
      value,
      tracking: optionObject.tracking_name || question.tracking_name || question.id || "survey_response"
    };
  });
}

function renderMessageItems(content = {}) {
  const items = Array.isArray(content.items) ? content.items : Array.isArray(content.products) ? content.products : Array.isArray(content.recommendations) ? content.recommendations : [];
  if (!items.length) return "";
  return `
    <div class="message-items">
      ${items.slice(0, 6).map((item) => `
        <a href="${escapeAttribute(safeUrl(item.url || item.href || "#"))}" data-dee-conversion="${escapeAttribute(item.tracking_name || item.id || item.title || "message_item")}">
          ${item.image_url || item.image ? `<img src="${escapeAttribute(assetUrl(item.image_url || item.image))}" alt="${escapeAttribute(item.title || item.name || "Item")}" referrerpolicy="no-referrer" />` : ""}
          <span><b>${escapeHtml(item.title || item.name || item.id || "Item")}</b>${item.body || item.description || item.price ? `<em>${escapeHtml(item.body || item.description || item.price)}</em>` : ""}</span>
        </a>
      `).join("")}
    </div>
  `;
}

async function renderCards(element, decision, config) {
  const cards = cardsFromDecision(decision).slice(0, config.maxItems || 8);
  const track = element.querySelector("[data-dee-track]") || element;
  if (!cards.length) return false;
  const fragment = document.createDocumentFragment();
  cards.forEach((card) => {
    const item = document.createElement("a");
    item.className = element.dataset.deeItemClass || "meiro-banner-item";
    item.href = safeUrl(card.url || card.cta_url || "#");
    item.target = card.target || "_blank";
    item.rel = "noopener noreferrer";

    const image = document.createElement("img");
    image.src = assetUrl(card.image_url || card.image || card.src || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80");
    image.alt = card.alt || card.title || "Offer";
    image.referrerPolicy = "no-referrer";

    const text = document.createElement("p");
    text.textContent = card.title || card.text || card.cta_label || "View offer";

    item.append(image, text);
    fragment.appendChild(item);
  });
  track.replaceChildren(fragment);
  return true;
}

async function renderWebsiteConfiguration(element, decision) {
  if (decision.result !== "eligible") return false;
  const outputs = decision.outputs || {};
  const configuration = outputs.configuration || outputs.feature_flags || {};
  if (!configuration || typeof configuration !== "object") return false;
  const variantLabel = document.querySelector("#configuration-variant");
  const rationale = document.querySelector("#configuration-rationale");
  if (variantLabel) {
    variantLabel.textContent = decision.experiment?.variant_key
      ? `Variant ${decision.experiment.variant_key}`
      : "DEE configuration";
  }
  if (rationale) {
    rationale.textContent = outputs.rationale || outputs.description || "DEE returned this website feature configuration for the current profile and context.";
  }
  for (const [key, value] of Object.entries(configuration)) {
    const enabled = Boolean(value);
    document.querySelectorAll(`[data-feature-state="${cssEscape(key)}"]`).forEach((target) => {
      target.textContent = enabled ? "Visible / eligible" : "Hidden / not eligible";
    });
    document.querySelectorAll(`[data-feature-card="${cssEscape(key)}"]`).forEach((target) => {
      target.dataset.enabled = String(enabled);
    });
    document.querySelectorAll(`[data-config-feature="${cssEscape(key)}"]`).forEach((target) => {
      target.hidden = !enabled;
      target.dataset.enabled = String(enabled);
    });
  }
  document.querySelectorAll("[data-discount-price]").forEach((target) => {
    target.hidden = !Boolean(configuration.discounted_prices_visible);
  });
  document.querySelectorAll("[data-regular-price]").forEach((target) => {
    target.classList.toggle("price-struck", Boolean(configuration.discounted_prices_visible));
  });
  element.dataset.renderedVariant = decision.experiment?.variant_key || "";
  return true;
}

function cardsFromDecision(decision) {
  const outputs = decision.outputs || {};
  if (Array.isArray(outputs.cards)) return outputs.cards;
  if (Array.isArray(outputs.offers)) return outputs.offers;
  if (outputs.offer_id || outputs.cta_url || outputs.image_url) {
    return [{
      title: outputs.title || outputs.offer_tier || outputs.offer_id || "Recommended offer",
      text: outputs.body || outputs.promotion_category || "Personalized by DEE",
      url: outputs.cta_url || "#",
      image_url: outputs.image_url
    }];
  }
  return [];
}

function renderCtas(content) {
  const ctas = Array.isArray(content.ctas) ? content.ctas : [
    content.cta_label ? { label: content.cta_label, url: content.cta_url || "#" } : null
  ].filter(Boolean);
  return ctas.slice(0, 3).map((cta) => `<a href="${escapeAttribute(safeUrl(cta.url || "#"))}">${escapeHtml(cta.label || "Open")}</a>`).join("");
}

function hasCtas(content = {}) {
  return Array.isArray(content.ctas)
    ? content.ctas.some((cta) => cta?.label || cta?.url)
    : Boolean(content.cta_label || content.cta_url);
}

function messageTemplateType(value) {
  const normalized = String(value || "").trim();
  return ["banner", "alert", "modal", "inline", "toast", "card", "carousel", "survey", "recommendation", "html_fragment", "message", "inapp_message"].includes(normalized)
    ? normalized
    : "message";
}

function messageImageUrl(content = {}) {
  const image = content.image_url || content.imageUrl || content.image || content.media_url || content.media?.url || "";
  return image ? assetUrl(image) : "";
}

function rememberDecision(element, decision, meta = {}) {
  if (!element || !decision) return;
  const selector = `#${element.id}`;
  state.decisions.set(selector, { decision, meta, at: new Date().toISOString() });
  state.evaluationRuns += 1;
  renderDiagnostics();
}

function rememberModifications(element, detail = {}) {
  if (!element) return;
  const selector = `#${element.id}`;
  const diagnostics = Array.isArray(detail.diagnostics) ? detail.diagnostics : [];
  const applied = diagnostics
    .filter((item) => item.status === "applied")
    .reduce((sum, item) => sum + Math.max(1, Number(item.count || 1)), 0);
  state.modifications.set(selector, {
    decision: detail.decision || null,
    applied,
    diagnostics,
    at: new Date().toISOString()
  });
  renderModificationDiagnostics();
  logEvent("modifications", `${element.dataset.deePlacement || selector}: ${applied} targets applied across ${diagnostics.length} operations`);
}

function renderDiagnostics() {
  const rows = [...state.decisions.entries()].map(([selector, record]) => {
    const decision = record.decision || {};
    return `
      <article>
        <span>${escapeHtml(selector)}</span>
        <strong>${escapeHtml(decision.decision_key || "-")}</strong>
        <dl>
          <div><dt>Result</dt><dd>${escapeHtml(decision.result || "-")}</dd></div>
          <div><dt>Variant</dt><dd>${escapeHtml(decision.experiment?.variant_key || "-")}</dd></div>
          <div><dt>Message</dt><dd>${escapeHtml(decision.outputs?.message_id || decision.outputs?.message?.id || "-")}</dd></div>
          <div><dt>Profile cache</dt><dd>${escapeHtml(decision.profile_cache?.status || "-")}</dd></div>
          <div><dt>Diagnostics</dt><dd>${escapeHtml(renderDiagnosticSummary(record.meta?.diagnostics))}</dd></div>
          <div><dt>TTL</dt><dd>${Number.isFinite(decision.ttl_seconds) ? `${decision.ttl_seconds}s` : "-"}</dd></div>
        </dl>
      </article>
    `;
  }).join("");
  elements.decisionList.innerHTML = rows || `<p class="empty">No decisions yet. Apply runtime setup or evaluate a placement.</p>`;
  renderModificationDiagnostics();
  renderMetrics();
}

function renderModificationDiagnostics() {
  const records = [...state.modifications.entries()];
  const totals = records.reduce((summary, [, record]) => {
    summary.applied += record.applied || 0;
    summary.operations += record.diagnostics.length;
    summary.skipped += record.diagnostics.filter((item) => item.status !== "applied").length;
    return summary;
  }, { applied: 0, skipped: 0, operations: 0 });
  if (elements.modificationSummary) {
    elements.modificationSummary.textContent = totals.operations
      ? `${totals.applied} targets applied, ${totals.skipped} operations skipped`
      : "No modifications yet";
  }
  if (!elements.modificationList) return;
  const rows = records.flatMap(([selector, record]) => {
    const variant = record.decision?.experiment?.variant_key || "-";
    return record.diagnostics.map((item) => `
      <article data-status="${escapeAttribute(item.status || "unknown")}">
        <div>
          <span>${escapeHtml(selector)}</span>
          <strong>${escapeHtml(item.id || item.type || "Modification")}</strong>
        </div>
        <dl>
          <div><dt>Status</dt><dd>${escapeHtml(item.status || "-")}</dd></div>
          <div><dt>Type</dt><dd>${escapeHtml(item.type || "-")}</dd></div>
          <div><dt>Variant</dt><dd>${escapeHtml(variant)}</dd></div>
          <div><dt>Targets</dt><dd>${Number.isFinite(item.count) ? item.count : "-"}</dd></div>
          <div><dt>Selector</dt><dd>${escapeHtml(item.selector || "-")}</dd></div>
          <div><dt>Reason</dt><dd>${escapeHtml(item.reason || item.message || "-")}</dd></div>
        </dl>
      </article>
    `);
  }).join("");
  elements.modificationList.innerHTML = rows || `<p class="empty">Evaluate the DOM modification placement to inspect selector results.</p>`;
}

function renderDiagnosticSummary(diagnostics = []) {
  if (!Array.isArray(diagnostics) || !diagnostics.length) return "-";
  const applied = diagnostics.filter((item) => item.status === "applied").length;
  const skipped = diagnostics.length - applied;
  return `${applied} applied, ${skipped} skipped`;
}

function renderMetrics() {
  elements.metrics.decisions.textContent = String(state.decisions.size);
  elements.metrics.events.textContent = String(state.eventCount);
}

function logEvent(type, message) {
  const item = document.createElement("li");
  item.innerHTML = `<span>${escapeHtml(new Date().toLocaleTimeString())}</span><strong>${escapeHtml(type)}</strong><p>${escapeHtml(message)}</p>`;
  elements.eventLog.prepend(item);
  while (elements.eventLog.children.length > 30) elements.eventLog.lastElementChild.remove();
}

function restoreSettings() {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
  for (const [key, value] of Object.entries(saved)) {
    if (!elements[key]) continue;
    if (elements[key].type === "checkbox") elements[key].checked = Boolean(value);
    else elements[key].value = String(value);
  }
}

function saveSettings() {
  const saved = {
    baseUrl: elements.baseUrl.value,
    token: elements.token.value,
    configDecisionKey: elements.configDecisionKey.value,
    domDecisionKey: elements.domDecisionKey.value,
    heroDecisionKey: elements.heroDecisionKey.value,
    offerDecisionKey: elements.offerDecisionKey.value,
    messageDecisionKey: elements.messageDecisionKey.value,
    requestSurface: elements.requestSurface.value,
    profileKey: elements.profileKey.value,
    identifierEmail: elements.identifierEmail.value,
    enrichment: elements.enrichment.value,
    qaOverride: elements.qaOverride.value,
    leadScore: elements.leadScore.value,
    sustainabilityScore: elements.sustainabilityScore.value,
    sendLocalPayload: elements.sendLocalPayload.checked,
    autoExposure: elements.autoExposure.checked
  };
  localStorage.setItem(storageKey, JSON.stringify(saved));
}

function ensureVisitor() {
  if (!elements.profileKey.value) createVisitor();
  if (!elements.identifierEmail.value) elements.identifierEmail.value = `${elements.profileKey.value}@example.test`;
}

function createVisitor() {
  const id = `visitor-${Math.random().toString(36).slice(2, 9)}`;
  elements.profileKey.value = id;
  elements.identifierEmail.value = `${id}@example.test`;
  localStorage.setItem("dee_mock_session", `session-${Math.random().toString(36).slice(2, 10)}`);
}

function sessionId() {
  let id = localStorage.getItem("dee_mock_session");
  if (!id) {
    id = `session-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("dee_mock_session", id);
  }
  return id;
}

function identifier() {
  const email = elements.identifierEmail.value.trim();
  return email ? { typeId: "email", value: email } : null;
}

function placementsList() {
  return Array.from(document.querySelectorAll("[data-dee-placement][data-dee-decision-key]"));
}

function applyPlacementSettings() {
  const config = document.querySelector("#website-configuration");
  const dom = document.querySelector("#dom-modification-placement");
  const hero = document.querySelector("#hero-placement");
  const offers = document.querySelector("#offer-carousel");
  const message = document.querySelector("#message-placement");
  if (config) config.dataset.deeDecisionKey = elements.configDecisionKey.value.trim();
  if (dom) dom.dataset.deeDecisionKey = elements.domDecisionKey.value.trim();
  if (hero) hero.dataset.deeDecisionKey = elements.heroDecisionKey.value.trim();
  if (offers) offers.dataset.deeDecisionKey = elements.offerDecisionKey.value.trim();
  if (message) message.dataset.deeDecisionKey = elements.messageDecisionKey.value.trim();
  const surface = elements.requestSurface.value.trim();
  if (surface) {
    if (config) config.dataset.deeSurface = `${surface}_configuration`;
    if (dom) dom.dataset.deeSurface = `${surface}_visual_editor`;
    if (hero) hero.dataset.deeSurface = `${surface}_hero`;
    if (offers) offers.dataset.deeSurface = `${surface}_offer_carousel`;
    if (message) message.dataset.deeSurface = surface;
  }
}

function renderSuppressedMessage(element, decision) {
  if (!element || element.dataset.deeTemplate !== "message" || decision?.result === "eligible") return;
  const availability = decision?.outputs?.message?.availability;
  const reason = availability?.reason || decision?.outputs?.suppression_reason || decision?.result || "not_eligible";
  const detail = availability?.message || "DEE did not return an eligible message for this placement.";
  element.classList.remove("message-slot-live");
  element.innerHTML = `
    <span>DEE message suppressed</span>
    <strong>${escapeHtml(reason)}</strong>
    <p>${escapeHtml(detail)}</p>
    <small>Check that the rule surface, message surface, and request surface describe the same placement.</small>
  `;
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(String(value));
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function safeUrl(value) {
  try {
    return new URL(value || "#", location.href).href;
  } catch {
    return "#";
  }
}

function assetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return safeUrl(raw);
  const base = elements.baseUrl?.value?.trim().replace(/\/$/, "") || location.origin;
  try {
    return new URL(raw, `${base}/`).href;
  } catch {
    return safeUrl(raw);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

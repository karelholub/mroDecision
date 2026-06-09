const storageKey = "dee_mock_site_settings";

const state = {
  sdk: null,
  decisions: new Map(),
  modifications: new Map(),
  lastPayload: null,
  eventCount: 0,
  evaluationRuns: 0
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
  element.classList.add("message-slot-live");
  element.innerHTML = `
    <span>${escapeHtml(message.template_type || outputs.template || "DEE message")}</span>
    <strong>${escapeHtml(content.title || content.headline || message.name || "Personalized message")}</strong>
    <p>${escapeHtml(content.body || content.text || "DEE returned an eligible in-app message.")}</p>
    ${content.footer ? `<small>${escapeHtml(content.footer)}</small>` : ""}
    <div class="message-actions">
      ${renderCtas(content)}
    </div>
  `;
  return true;
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
    image.src = safeUrl(card.image_url || card.image || card.src || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80");
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
    if (offers) offers.dataset.deeSurface = `${surface}_offers`;
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

const state = {
  lastDecision: null,
  exposureSent: false,
  impressionSent: false
};

const elements = {
  form: document.querySelector("#decision-form"),
  baseUrl: document.querySelector("#dee-base-url"),
  token: document.querySelector("#dee-token"),
  decisionKey: document.querySelector("#decision-key"),
  surface: document.querySelector("#surface"),
  profileKey: document.querySelector("#profile-key"),
  forceVariant: document.querySelector("#force-variant"),
  leadScore: document.querySelector("#lead-score"),
  sessionId: document.querySelector("#session-id"),
  autoExposure: document.querySelector("#auto-exposure"),
  newProfile: document.querySelector("#new-profile"),
  sendExposure: document.querySelector("#send-exposure"),
  sendImpression: document.querySelector("#send-impression"),
  status: document.querySelector("#status-pill"),
  summary: document.querySelector("#summary"),
  output: document.querySelector("#output"),
  badge: document.querySelector("#variant-badge"),
  heroTitle: document.querySelector("#hero-title"),
  heroBody: document.querySelector("#hero-body"),
  primaryCta: document.querySelector("#primary-cta")
};

initializeVisitor();
renderSummary();

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await evaluateVariant();
});
elements.newProfile.addEventListener("click", () => {
  initializeVisitor(true);
  setStatus("New visitor ready");
});
elements.sendExposure.addEventListener("click", () => sendClientEvent("exposure"));
elements.sendImpression.addEventListener("click", () => sendClientEvent("impression"));

function initializeVisitor(force = false) {
  if (force || !elements.profileKey.value) elements.profileKey.value = `visitor-${randomId()}`;
  if (force || !elements.sessionId.value) elements.sessionId.value = `session-${randomId()}`;
  state.lastDecision = null;
  state.exposureSent = false;
  state.impressionSent = false;
  renderSummary();
}

async function evaluateVariant() {
  setStatus("Evaluating");
  state.exposureSent = false;
  state.impressionSent = false;
  const request = buildEvaluateRequest();
  try {
    const decision = await api("/v1/client/evaluate", request);
    state.lastDecision = decision;
    renderDecision(decision, request);
    setStatus(decision.experiment?.variant_key ? "Variant assigned" : "No variant");
    if (elements.autoExposure.checked && decision.experiment?.variant_key) {
      await sendClientEvent("exposure");
    }
  } catch (error) {
    state.lastDecision = null;
    setStatus("Error");
    elements.output.textContent = error.message;
    renderSummary();
  }
}

async function sendClientEvent(type) {
  if (!state.lastDecision) {
    elements.output.textContent = "Evaluate a variant before sending feedback.";
    return;
  }
  const decision = state.lastDecision;
  const variantKey = decision.experiment?.variant_key;
  if (type === "exposure" && !variantKey) {
    elements.output.textContent = "No experiment variant was assigned, so exposure feedback was not sent.";
    return;
  }

  const payload = {
    decision_key: decision.decision_key,
    profile_key: decision.profile_key,
    rule_version: decision.rule_version,
    variant_key: variantKey || "",
    message_id: messageIdFromDecision(decision),
    surface: elements.surface.value.trim(),
    context: {
      session_id: elements.sessionId.value.trim(),
      page_url: window.location.href,
      source: "experiment_mock_site"
    }
  };

  try {
    const body = await api(`/v1/client/${type}`, payload);
    if (type === "exposure") state.exposureSent = true;
    if (type === "impression") state.impressionSent = true;
    setStatus(`${type} sent`);
    elements.output.textContent = JSON.stringify({ last_decision: decision, feedback: body }, null, 2);
    renderSummary();
  } catch (error) {
    setStatus(`${type} failed`);
    elements.output.textContent = error.message;
  }
}

function buildEvaluateRequest() {
  const forceVariant = elements.forceVariant.value.trim();
  return {
    decision_key: elements.decisionKey.value.trim(),
    profile_key: elements.profileKey.value.trim(),
    identifiers: [
      { typeId: "email", value: `${elements.profileKey.value.trim()}@example.test` }
    ],
    attributes: {
      lead_score: [{ value: Number(elements.leadScore.value || 0) }],
      customer_lifetime_value: [{ value: 12500 }]
    },
    segments: {
      demo_site_visitor: true
    },
    context: {
      surface: elements.surface.value.trim(),
      channel: "web",
      session_id: elements.sessionId.value.trim(),
      request_source: "experiment_mock_site",
      ...(forceVariant ? { force_variant: forceVariant } : {})
    }
  };
}

function renderDecision(decision, request) {
  const variantKey = decision.experiment?.variant_key || "none";
  const outputs = decision.outputs || {};
  const content = outputs.message_content || outputs.message?.content || outputs;

  elements.badge.textContent = variantKey === "none" ? `Result: ${decision.result}` : `Experiment variant: ${variantKey}`;
  elements.heroTitle.textContent =
    content.title ||
    content.headline ||
    outputs.headline ||
    (variantKey === "control" ? "Reliable energy plans for every home." : "Cleaner energy, tailored to your household.");
  elements.heroBody.textContent =
    content.body ||
    outputs.body ||
    (variantKey === "control"
      ? "The control experience keeps the offer simple and direct."
      : "The treatment experience highlights personalization and greener outcomes.");
  elements.primaryCta.textContent = content.cta_label || outputs.cta_label || "Explore plans";
  elements.primaryCta.href = content.cta_url || outputs.cta_url || "#plans";
  elements.output.textContent = JSON.stringify({ request, response: decision }, null, 2);
  renderSummary();
}

function renderSummary() {
  const decision = state.lastDecision || {};
  const variant = decision.experiment?.variant_key || "-";
  elements.summary.innerHTML = [
    summaryItem("Decision", decision.decision_key || elements.decisionKey.value || "-"),
    summaryItem("Profile", decision.profile_key || elements.profileKey.value || "-"),
    summaryItem("Result", decision.result || "-"),
    summaryItem("Variant", variant),
    summaryItem("Rule version", decision.rule_version || "-"),
    summaryItem("Exposure", state.exposureSent ? "sent" : "pending"),
    summaryItem("Impression", state.impressionSent ? "sent" : "pending"),
    summaryItem("TTL", Number.isFinite(decision.ttl_seconds) ? `${decision.ttl_seconds}s` : "-")
  ].join("");
}

function summaryItem(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

async function api(path, payload) {
  const base = elements.baseUrl.value.trim().replace(/\/$/, "");
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${elements.token.value.trim()}`
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(JSON.stringify(body, null, 2) || response.statusText);
  return body;
}

function messageIdFromDecision(decision) {
  return decision.outputs?.message_id || decision.outputs?.message?.id || "";
}

function setStatus(value) {
  elements.status.textContent = value;
}

function randomId() {
  return Math.random().toString(36).slice(2, 9);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

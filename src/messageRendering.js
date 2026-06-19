export function messageRenderingContract(message = {}, outputs = {}, request = {}, availability = null) {
  const metadata = objectValue(message.metadata);
  const content = {
    ...objectValue(message.default_content),
    ...objectValue(outputs.message_content)
  };
  const templateType = normalizedTemplateType(
    content.template_type || content.type || metadata.template_type || metadata.type || "banner"
  );
  const surface = stringValue(message.surface || request.surface || request.context?.surface);
  const placement = stringValue(content.placement || metadata.placement || request.context?.placement || surface);
  const applicationId = stringValue(metadata.application_id || metadata.app_id);
  const applicationKey = stringValue(metadata.application || metadata.application_key || metadata.app_key);
  const applicationName = stringValue(metadata.application_name || applicationKey || applicationId);
  const actions = normalizeActions(content);
  const media = normalizeMedia(content);
  const survey = surveySummary(content, templateType);
  const targetDevices = stringValue(
    availability?.delivery?.targeting?.devices || metadata.target_devices || metadata.device || "any"
  ) || "any";

  return {
    template_type: templateType,
    content_type: templateContentType(templateType),
    surface,
    placement,
    application: {
      id: applicationId,
      key: applicationKey,
      name: applicationName
    },
    locale: stringValue(content.locale || metadata.locale),
    interruptive: ["modal", "alert", "toast"].includes(templateType),
    supports_rich_media: Boolean(media.image_url || media.items_count),
    actions,
    media,
    survey,
    layout: objectValue(content.layout || metadata.layout),
    theme: objectValue(content.theme || metadata.theme),
    fallback_text: {
      title: stringValue(content.title),
      body: stringValue(content.body),
      footer: stringValue(content.footer)
    },
    platform_hints: {
      channel: stringValue(request.context?.channel || metadata.channel || "inapp"),
      platform: inferredPlatform(request, metadata, surface, placement),
      target_devices: targetDevices
    }
  };
}

export function mergeMessageDeliveryIntoClientDelivery(delivery = {}, outputs = {}) {
  const base = objectValue(delivery);
  const message = objectValue(outputs.message);
  if (!message.id) return base;
  return {
    ...base,
    message: {
      ...objectValue(message.delivery),
      availability: objectValue(message.availability),
      rendering: objectValue(message.rendering)
    }
  };
}

export function surfaceCandidateSummary(result = {}, priority = 0) {
  const message = objectValue(result.outputs?.message);
  return {
    decision_key: stringValue(result.decision_key),
    priority: Number.isFinite(Number(priority)) ? Number(priority) : 0,
    result: stringValue(result.result),
    message_id: stringValue(result.outputs?.message_id || message.id),
    message: message.id ? {
      id: stringValue(message.id),
      name: stringValue(message.name),
      surface: stringValue(message.surface),
      availability: objectValue(message.availability),
      rendering: objectValue(message.rendering)
    } : null,
    delivery: objectValue(result.delivery?.message),
    matched_rules: Array.isArray(result.matched_rules) ? result.matched_rules : [],
    cache: objectValue(result.cache),
    profile_cache: objectValue(result.profile_cache),
    errors: Array.isArray(result.errors) ? result.errors : []
  };
}

function normalizeActions(content = {}) {
  const source = Array.isArray(content.ctas)
    ? content.ctas
    : Array.isArray(content.actions)
      ? content.actions
      : content.cta
        ? [content.cta]
        : [];
  return source
    .map((action, index) => ({
      id: stringValue(action.id || action.key || `cta_${index + 1}`),
      label: stringValue(action.label || action.text || action.title),
      url: stringValue(action.url || action.href),
      action: stringValue(action.action || action.type),
      style: stringValue(action.style || action.variant),
      tracking_name: stringValue(action.tracking_name || action.trackingName),
      dismiss: action.dismiss === true
    }))
    .filter((action) => action.label || action.url || action.action);
}

function normalizeMedia(content = {}) {
  const items = Array.isArray(content.items) ? content.items : [];
  return {
    image_url: stringValue(
      content.image_url || content.imageUrl || content.image?.url || content.media?.image_url || content.media?.url
    ),
    image_alt: stringValue(
      content.image_alt || content.imageAlt || content.image?.alt || content.media?.alt
    ),
    items_count: items.length
  };
}

function surveySummary(content = {}, templateType = "banner") {
  const survey = objectValue(content.survey);
  const questions = Array.isArray(content.questions) && content.questions.length
    ? content.questions
    : Array.isArray(survey.questions)
      ? survey.questions
      : [];
  if (templateType !== "survey" && !questions.length) return null;
  return {
    question_count: questions.length,
    required_count: questions.filter((question) => question?.required).length,
    question_types: [...new Set(questions.map((question) => normalizedSurveyType(question?.type)).filter(Boolean))]
  };
}

function templateContentType(templateType = "banner") {
  const rich = {
    banner: "message",
    alert: "message",
    modal: "message",
    inline: "message",
    toast: "message",
    card: "message",
    carousel: "collection",
    recommendation: "collection",
    survey: "survey",
    html_fragment: "html"
  };
  return rich[templateType] || "message";
}

function normalizedTemplateType(value = "") {
  const templateType = stringValue(value).toLowerCase();
  return [
    "banner",
    "alert",
    "modal",
    "inline",
    "toast",
    "card",
    "carousel",
    "survey",
    "recommendation",
    "html_fragment"
  ].includes(templateType)
    ? templateType
    : "banner";
}

function normalizedSurveyType(value = "") {
  const type = stringValue(value).toLowerCase();
  return ["choice", "text", "rating", "nps"].includes(type) ? type : type ? "choice" : "";
}

function inferredPlatform(request = {}, metadata = {}, surface = "", placement = "") {
  const explicit = stringValue(request.context?.platform || metadata.platform);
  if (explicit) return explicit;
  const combined = [
    metadata.application,
    metadata.application_id,
    metadata.application_name,
    surface,
    placement
  ]
    .map(stringValue)
    .join(" ")
    .toLowerCase();
  if (/(ios|android|mobile|app)/.test(combined)) return "mobile";
  return "web";
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

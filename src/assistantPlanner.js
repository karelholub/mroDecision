const wordPattern = /[a-z0-9]+/gi;

export function createAssistantPlan(input = {}, context = {}) {
  const prompt = String(input.prompt || "").trim();
  const type = normalizeType(input.type || inferType(prompt));
  const name = String(input.name || titleFromPrompt(prompt) || defaultName(type)).trim();
  const decisionKey = slug(input.decision_key || name || defaultName(type));
  const surface = String(input.surface || inferSurface(prompt) || "").trim();
  const messageId = slug(input.message_id || `${decisionKey}_message`);
  const conditions = inferConditions(input.conditions, prompt);
  const variants = normalizeVariants(input.variants || inferVariants(prompt));
  const message = ["inapp_message", "experiment"].includes(type)
    ? buildMessage({ id: messageId, name, surface, input })
    : null;
  const ruleSet = buildRuleSet({ type, name, decisionKey, surface, conditions, variants, messageId, input });
  const guardrails = guardrailsFor({ ruleSet, message, context });
  const actions = [];
  if (message) actions.push({ action: "upsert_message", id: message.id, object: message });
  actions.push({ action: context.ruleExists?.(decisionKey) ? "update_rule_draft" : "create_rule_draft", id: decisionKey, object: ruleSet });
  return {
    mode: "draft_only",
    prompt,
    summary: summaryFor({ type, name, decisionKey, surface, conditions, variants, message }),
    guardrails,
    actions
  };
}

export function applyAssistantPlan(plan = {}, store, author = "assistant") {
  if (!plan || !Array.isArray(plan.actions)) {
    badRequest("Assistant plan must include actions");
  }
  const applied = [];
  for (const item of plan.actions) {
    if (item.action === "upsert_message") {
      const message = store.upsertMessage(item.id, item.object || {}, author);
      applied.push({ action: item.action, id: message.id, status: "draft_dependency_saved" });
      continue;
    }
    if (item.action === "create_rule_draft") {
      const ruleSet = store.createRuleSet(item.object || {}, author);
      applied.push({ action: item.action, id: ruleSet.decision_key, status: "draft_created" });
      continue;
    }
    if (item.action === "update_rule_draft") {
      const ruleSet = store.updateDraft(item.id, item.object || {}, author);
      applied.push({ action: item.action, id: ruleSet.decision_key, status: "draft_updated" });
      continue;
    }
    badRequest(`Unsupported assistant action: ${item.action}`);
  }
  return { applied };
}

function buildRuleSet({ type, name, decisionKey, surface, conditions, variants, messageId, input }) {
  const branch = {
    id: "assistant_eligible",
    when: conditionGroup(conditions),
    result: "eligible",
    outputs: {}
  };
  if (type === "inapp_message") branch.outputs.message_id = messageId;
  const metadata = {};
  if (type === "experiment") {
    metadata.experiment = {
      status: "draft",
      unit: input.assignment_unit || input.unit || "profile",
      variants
    };
  }
  return {
    name,
    decision_key: decisionKey,
    description: input.description || `Assistant-generated ${type.replace("_", " ")} draft.`,
    type,
    surface,
    priority: Number(input.priority || 0),
    cache_policy: { client_ttl: Number(input.ttl_seconds || 300), scope: input.cache_scope || "profile" },
    metadata,
    tags: ["assistant_generated"],
    draft: {
      branches: [branch],
      fallback: {
        result: "ineligible",
        outputs: {}
      }
    }
  };
}

function buildMessage({ id, name, surface, input }) {
  return {
    id,
    name: input.message_name || `${name} Message`,
    surface,
    status: "active",
    content_schema: {
      title: "string",
      body: "string",
      ctas: "array"
    },
    default_content: {
      title: input.title || name,
      body: input.body || "Personalized message configured by assistant.",
      ctas: [
        {
          label: input.cta_label || "Learn more",
          url: input.cta_url || "#"
        }
      ]
    },
    metadata: {
      template_type: input.template_type || "banner",
      placement: input.placement || surface || "",
      assistant_draft: true,
      lifecycle: {
        ttl_seconds: Number(input.message_ttl_seconds || input.ttl_seconds || 300)
      }
    }
  };
}

function guardrailsFor({ ruleSet, message, context }) {
  const warnings = [];
  const errors = [];
  if (!ruleSet.decision_key) errors.push("Decision key is required.");
  if (context.ruleExists?.(ruleSet.decision_key)) warnings.push("Existing rule set will be updated as draft, not published.");
  if (ruleSet.type === "experiment") {
    const variants = ruleSet.metadata.experiment.variants || [];
    const total = variants.reduce((sum, variant) => sum + Number(variant.weight || 0), 0);
    if (Math.round(total * 1000) !== 100000) errors.push("Experiment variant allocation must sum to 100%.");
    if (variants.length < 2) warnings.push("Experiments should have at least two variants.");
  }
  if (message?.status === "active") warnings.push("Message content is saved as active but only used after a referencing rule is published.");
  warnings.push("Assistant apply creates or updates drafts only. Publishing still requires the normal publish review.");
  return {
    status: errors.length ? "blocked" : warnings.length ? "review" : "ok",
    errors,
    warnings
  };
}

function inferConditions(inputConditions, prompt) {
  if (Array.isArray(inputConditions) && inputConditions.length) return inputConditions;
  const lower = prompt.toLowerCase();
  const conditions = [];
  if (lower.includes("sustain")) conditions.push(condition("attribute", "sustainability_score", "greater_than_or_equal", 70));
  if (lower.includes("lead")) conditions.push(condition("attribute", "lead_score", "greater_than_or_equal", 70));
  if (lower.includes("high value") || lower.includes("premium")) conditions.push(condition("attribute", "customer_lifetime_value", "greater_than_or_equal", 5000));
  if (lower.includes("churn")) conditions.push(condition("attribute", "churn_risk_score", "greater_than_or_equal", 0.7));
  return conditions.length ? conditions : [condition("context", "channel", "is_not_blank", null)];
}

function condition(source, key, operator, value) {
  return value == null ? { source, key, operator } : { source, key, operator, value };
}

function conditionGroup(conditions) {
  return conditions.length === 1 ? conditions[0] : { all: conditions };
}

function inferVariants(prompt) {
  const match = prompt.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    if (first + second === 100) return variantPair(first, second);
  }
  return variantPair(50, 50);
}

function normalizeVariants(variants) {
  if (!Array.isArray(variants) || !variants.length) return variantPair(50, 50);
  return variants.map((variant, index) => ({
    key: slug(variant.key || `variant_${index + 1}`),
    weight: Number(variant.weight || 0),
    outputs: variant.outputs && typeof variant.outputs === "object" ? variant.outputs : { variant: slug(variant.key || `variant_${index + 1}`) }
  }));
}

function variantPair(controlWeight, treatmentWeight) {
  return [
    { key: "control", weight: controlWeight, outputs: { variant: "control" } },
    { key: "treatment", weight: treatmentWeight, outputs: { variant: "treatment" } }
  ];
}

function inferType(prompt) {
  const lower = prompt.toLowerCase();
  if (/(experiment|variant|a\/b|ab test|split)/.test(lower)) return "experiment";
  if (/(message|banner|modal|alert|toast|in-app|inapp)/.test(lower)) return "inapp_message";
  return "decision";
}

function normalizeType(type) {
  return ["decision", "inapp_message", "experiment"].includes(type) ? type : "decision";
}

function inferSurface(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes("homepage")) return "homepage";
  if (lower.includes("email")) return "email";
  if (lower.includes("app")) return "app";
  return "";
}

function titleFromPrompt(prompt) {
  return words(prompt).slice(0, 5).map(capitalize).join(" ");
}

function defaultName(type) {
  if (type === "experiment") return "Assistant Experiment";
  if (type === "inapp_message") return "Assistant Message";
  return "Assistant Decision";
}

function summaryFor({ type, name, decisionKey, surface, conditions, variants, message }) {
  return [
    `Create ${type.replace("_", " ")} draft "${name}" (${decisionKey}).`,
    surface ? `Target surface: ${surface}.` : "No surface restriction configured.",
    `Eligibility checks: ${conditions.length}.`,
    variants?.length ? `Variants: ${variants.map((variant) => `${variant.key} ${variant.weight}%`).join(", ")}.` : "",
    message ? `Message dependency: ${message.id}.` : ""
  ].filter(Boolean).join(" ");
}

function slug(value) {
  return words(value).join("_").slice(0, 80);
}

function words(value) {
  return String(value || "").toLowerCase().match(wordPattern) || [];
}

function capitalize(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : "";
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "bad_request";
  throw error;
}

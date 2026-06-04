import { createAssistantPlan } from "./assistantPlanner.js";

const allowedActions = new Set(["upsert_message", "create_rule_draft", "update_rule_draft"]);
const openAiBaseUrl = "https://api.openai.com/v1";

export async function createAssistantPlanWithProvider(input = {}, context = {}, settings = {}, fetcher = fetch) {
  const deterministic = isAdviceRequest(input) ? createAssistantAdvice(input, context) : createAssistantPlan(input, context);
  const providerSettings = normalizeProviderSettings(settings);
  if (!providerSettings.enabled) {
    return annotatePlan(deterministic, {
      mode: "deterministic",
      status: "disabled",
      message: "LLM planning is disabled; deterministic planner used."
    });
  }
  if (!providerSettings.base_url || !providerSettings.model || !providerSettings.api_key) {
    return annotatePlan(deterministic, {
      mode: "deterministic",
      status: "not_configured",
      message: "LLM provider is enabled but base URL, model, or API key is missing."
    });
  }
  try {
    const proposed = await requestProviderPlan(input, context, providerSettings, fetcher);
    const sanitized = sanitizeProviderPlan(proposed, deterministic);
    return annotatePlan(sanitized, {
      mode: "llm",
      status: "used",
      provider: providerSettings.provider,
      model: providerSettings.model,
      message: "LLM provider proposed a draft plan; server guardrails validated the draft-only contract."
    });
  } catch (error) {
    const fallback = annotatePlan(deterministic, {
      mode: "deterministic",
      status: "fallback",
      provider: providerSettings.provider,
      model: providerSettings.model,
      message: error.message || "LLM provider failed; deterministic planner used."
    });
    fallback.guardrails = fallback.guardrails || {};
    fallback.guardrails.warnings = [
      ...(fallback.guardrails.warnings || []),
      `LLM provider fallback: ${error.message || "provider failed"}`
    ];
    return fallback;
  }
}

export function normalizeProviderSettings(settings = {}) {
  const provider = String(settings.assistant_llm_provider || "openai").trim();
  const explicitBaseUrl = String(settings.assistant_llm_base_url || "").trim();
  return {
    enabled: settings.assistant_llm_enabled === true || settings.assistant_llm_enabled === "true",
    provider,
    base_url: provider === "openai" && !explicitBaseUrl ? openAiBaseUrl : explicitBaseUrl,
    model: String(settings.assistant_llm_model || "").trim(),
    api_key: String(settings.assistant_llm_api_key || "").trim(),
    timeout_ms: Math.max(1000, Math.min(30000, Number(settings.assistant_llm_timeout_ms || 15000)))
  };
}

export async function testAssistantProviderConnection(input = {}, storedSettings = {}, fetcher = fetch) {
  const settings = normalizeProviderSettings({
    ...storedSettings,
    assistant_llm_enabled: true,
    assistant_llm_provider: input.assistant_llm_provider || storedSettings.assistant_llm_provider,
    assistant_llm_base_url: input.assistant_llm_base_url || storedSettings.assistant_llm_base_url,
    assistant_llm_model: input.assistant_llm_model || storedSettings.assistant_llm_model,
    assistant_llm_api_key: input.assistant_llm_api_key || storedSettings.assistant_llm_api_key,
    assistant_llm_timeout_ms: input.assistant_llm_timeout_ms || storedSettings.assistant_llm_timeout_ms
  });
  if (!settings.base_url || !settings.model || !settings.api_key) {
    return {
      ok: false,
      provider: settings.provider,
      base_url: settings.base_url,
      model: settings.model,
      message: [
        !settings.base_url ? "base URL" : "",
        !settings.model ? "model" : "",
        !settings.api_key ? "API key" : ""
      ].filter(Boolean).join(", ") + " required"
    };
  }

  const startedAt = Date.now();
  try {
    const body = await requestChatCompletion(settings, fetcher, {
      model: settings.model,
      temperature: 0,
      max_tokens: 80,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return only a small JSON object for a connection test." },
        { role: "user", content: "Return JSON with ok true and service assistant_llm." }
      ]
    });
    return {
      ok: true,
      provider: settings.provider,
      base_url: settings.base_url,
      model: settings.model,
      duration_ms: Date.now() - startedAt,
      response_id: body.id || "",
      usage: body.usage || null,
      message: "Assistant provider connection succeeded."
    };
  } catch (error) {
    return {
      ok: false,
      provider: settings.provider,
      base_url: settings.base_url,
      model: settings.model,
      duration_ms: Date.now() - startedAt,
      message: error.message || "Assistant provider connection failed."
    };
  }
}

function annotatePlan(plan, provider) {
  return {
    ...plan,
    provider,
    guardrails: {
      ...(plan.guardrails || {}),
      provider
    }
  };
}

async function requestProviderPlan(input, context, settings, fetcher) {
  const body = await requestChatCompletion(settings, fetcher, {
    model: settings.model,
    temperature: 0.1,
    max_tokens: isAdviceRequest(input) ? 1600 : 2200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: providerSystemPrompt() },
      { role: "user", content: JSON.stringify(providerContext(input, context)) }
    ]
  });
  const content = body.choices?.[0]?.message?.content || body.output_text || body.plan;
  if (!content) throw new Error("LLM provider response did not include plan content");
  if (typeof content === "object") return content;
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("LLM provider plan content was not JSON");
  }
}

async function requestChatCompletion(settings, fetcher, payload) {
  const endpoint = chatCompletionsEndpoint(settings.base_url);
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${settings.api_key}`,
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(settings.timeout_ms)
  });
  const raw = await response.text();
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("LLM provider returned non-JSON response");
  }
  if (!response.ok) {
    throw new Error(body.error?.message || body.message || `LLM provider returned ${response.status}`);
  }
  return body;
}

function chatCompletionsEndpoint(baseUrl) {
  const endpoint = new URL(baseUrl);
  if (!endpoint.pathname.endsWith("/chat/completions")) {
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/chat/completions`;
  }
  return endpoint;
}

function providerSystemPrompt() {
  return [
    "You are a Meiro DEE decisioning and experimentation assistant.",
    "Return only JSON matching the existing assistant plan contract.",
    "For broad strategic questions, return mode advice with answer, recommendations, assumptions, next_steps, and no actions.",
    "For concrete configuration requests, return mode draft_only.",
    "Allowed draft actions: upsert_message, create_rule_draft, update_rule_draft.",
    "Never publish, delete, archive, create tokens, call external services, or include secrets.",
    "Prefer concise draft objects and include guardrail warnings for assumptions."
  ].join(" ");
}

function providerContext(input, context) {
  return {
    request: input,
    conversation_history: Array.isArray(input.history) ? input.history.slice(-10) : [],
    available_schema: (context.schemaItems || []).slice(0, 80),
    lookup_tables: (context.lookupTables || []).map((table) => ({
      id: table.id,
      name: table.name,
      key_column: table.key_column,
      columns: [...new Set((table.rows || []).flatMap((row) => Object.keys(row || {})))].slice(0, 20)
    })).slice(0, 30),
    deterministic_plan: isAdviceRequest(input) ? createAssistantAdvice(input, context) : createAssistantPlan(input, context)
  };
}

function sanitizeProviderPlan(plan, fallback) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) throw new Error("LLM plan must be an object");
  if (plan.mode === "advice") return sanitizeAdvicePlan(plan, fallback);
  if (plan.mode !== "draft_only") throw new Error("LLM plan mode must be draft_only");
  if (!Array.isArray(plan.actions)) throw new Error("LLM plan must include actions");
  const actions = plan.actions.map((action) => sanitizeAction(action));
  return {
    ...fallback,
    ...plan,
    mode: "draft_only",
    actions,
    guardrails: {
      ...(fallback.guardrails || {}),
      ...(plan.guardrails || {}),
      warnings: [
        ...(fallback.guardrails?.warnings || []),
        ...(plan.guardrails?.warnings || [])
      ],
      errors: [
        ...(fallback.guardrails?.errors || []),
        ...(plan.guardrails?.errors || [])
      ]
    }
  };
}

function sanitizeAdvicePlan(plan, fallback) {
  const recommendations = Array.isArray(plan.recommendations)
    ? plan.recommendations.slice(0, 8).map((item, index) => sanitizeRecommendation(item, index))
    : fallback.recommendations || [];
  return {
    ...fallback,
    mode: "advice",
    prompt: String(plan.prompt || fallback.prompt || ""),
    summary: String(plan.summary || fallback.summary || "Assistant advice"),
    answer: String(plan.answer || fallback.answer || ""),
    assumptions: Array.isArray(plan.assumptions) ? plan.assumptions.map(String).slice(0, 12) : fallback.assumptions || [],
    recommendations,
    next_steps: Array.isArray(plan.next_steps) ? plan.next_steps.map(String).slice(0, 8) : fallback.next_steps || [],
    actions: [],
    guardrails: {
      ...(fallback.guardrails || {}),
      ...(plan.guardrails || {}),
      status: plan.guardrails?.status || "review",
      warnings: [
        ...(fallback.guardrails?.warnings || []),
        ...(plan.guardrails?.warnings || [])
      ],
      errors: []
    }
  };
}

function sanitizeRecommendation(item = {}, index = 0) {
  const title = firstText(item, ["title", "name", "label", "experiment", "experiment_name", "idea", "summary"]);
  const hypothesis = firstText(item, ["hypothesis", "description", "rationale", "reason", "why", "objective", "goal"]);
  const audience = firstText(item, ["audience", "target_audience", "target_segment", "segment", "who"]);
  const surface = firstText(item, ["surface", "placement", "channel", "location", "page"]);
  const primaryMetric = firstText(item, ["primary_metric", "metric", "success_metric", "kpi", "conversion_metric"]);
  return {
    id: String(item.id || `recommendation_${index + 1}`),
    title: String(title || `Experiment idea ${index + 1}`),
    hypothesis: String(hypothesis || ""),
    audience: String(audience || ""),
    surface: String(surface || ""),
    variants: firstList(item, ["variants", "variant", "test_variants", "arms", "treatments", "messages"]).slice(0, 8),
    primary_metric: String(primaryMetric || ""),
    secondary_metrics: firstList(item, ["secondary_metrics", "metrics", "supporting_metrics"]).slice(0, 8),
    guardrails: firstList(item, ["guardrails", "risks", "constraints", "notes"]).slice(0, 8)
  };
}

function firstText(source = {}, keys = []) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value) && value.length) return value.map(String).join(" / ");
  }
  return "";
}

function firstList(source = {}, keys = []) {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).filter(Boolean);
    if (typeof value === "string" && value.trim()) return value.split(/\n|;/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function sanitizeAction(action = {}) {
  if (!allowedActions.has(action.action)) throw new Error(`LLM plan used unsupported action: ${action.action}`);
  if (!action.id) throw new Error("LLM plan action is missing id");
  if (!action.object || typeof action.object !== "object" || Array.isArray(action.object)) {
    throw new Error(`LLM plan action ${action.id} is missing object`);
  }
  return {
    action: action.action,
    id: String(action.id),
    object: action.object
  };
}

function isAdviceRequest(input = {}) {
  const prompt = String(input.prompt || "").toLowerCase();
  if (input.type || input.decision_key || input.name) return false;
  if (/(create|build|configure|draft|make|turn|convert|set up|setup|implement)/.test(prompt)) return false;
  const asksForAdvice = /(suggest|recommend|idea|ideas|what kind|which|what should|brainstorm|strategy|advise)/.test(prompt);
  const decisioningTopic = /(experiment|test|personalization|personalisation|offer|message|banner|campaign|decision)/.test(prompt);
  return asksForAdvice && decisioningTopic;
}

function createAssistantAdvice(input = {}, context = {}) {
  const prompt = String(input.prompt || "").trim();
  const schemaItems = Array.isArray(context.schemaItems) ? context.schemaItems : [];
  const hasSchema = schemaItems.length > 0;
  const recommendations = [
    {
      id: "homepage_value_prop_test",
      title: "Homepage value proposition experiment",
      hypothesis: "Visitors will engage more when the homepage hero adapts to their likely intent instead of showing one generic value proposition.",
      audience: "Known or enriched visitors with intent, industry, source, or engagement signals.",
      surface: "meiro.io homepage hero",
      variants: ["Control: current hero", "Variant A: CDP activation value prop", "Variant B: Pipes and real-time decisioning value prop"],
      primary_metric: "CTA click-through rate",
      secondary_metrics: ["Demo request rate", "Scroll depth", "Return visit rate"],
      guardrails: ["Keep assignment stable by profile or anonymous visitor id", "Exclude internal traffic", "Run until each variant reaches enough conversions"]
    },
    {
      id: "use_case_route_test",
      title: "Use-case routing experiment",
      hypothesis: "Routing visitors to industry or use-case content based on context will increase qualified engagement.",
      audience: "Visitors with inferred interest from UTM, referrer, page history, or Meiro profile attributes.",
      surface: "Homepage, product pages, and navigation CTA",
      variants: ["Control: generic CTA", "Variant: personalized CTA to relevant use case", "Variant: personalized CTA plus supporting proof point"],
      primary_metric: "Qualified content click-through rate",
      secondary_metrics: ["Demo request rate", "Time on use-case page"],
      guardrails: ["Use fallback for unknown visitors", "Avoid over-personalized copy when confidence is low"]
    },
    {
      id: "demo_cta_friction_test",
      title: "Demo CTA friction experiment",
      hypothesis: "High-intent visitors should see a lower-friction next step, while early-stage visitors should see educational content.",
      audience: "Visitors segmented by lead score, web engagement, and returning visitor status.",
      surface: "Global CTA, homepage hero, product page CTA",
      variants: ["Control: Book a demo", "Variant A: Talk to an expert", "Variant B: See example implementation"],
      primary_metric: "CTA completion rate",
      secondary_metrics: ["Form starts", "Form submissions", "Assisted conversions"],
      guardrails: ["Suppress aggressive demo prompts for low-intent visitors", "Track both immediate and assisted conversions"]
    }
  ];
  return {
    mode: "advice",
    prompt,
    summary: "Experiment ideas for meiro.io",
    answer: "I would start with experiments that use DEE where it is strongest: choosing the right message, CTA, or route for a visitor based on profile, behavior, and page context. For meiro.io, the most practical first tests are homepage value proposition personalization, use-case routing, and CTA friction reduction.",
    assumptions: [
      "The site can pass a stable visitor or profile identifier to DEE.",
      "Meiro can enrich the request with profile attributes, segments, or recent web behavior.",
      hasSchema ? "DEE has cached Meiro schema items that can later be used for concrete rule drafts." : "No cached schema was available, so the ideas avoid relying on specific field names."
    ],
    recommendations,
    next_steps: [
      "Pick one recommendation and ask the assistant to create a draft experiment for it.",
      "Confirm available profile attributes and context keys for audience targeting.",
      "Define the primary conversion event and minimum sample size before publishing.",
      "Start with a conservative 50/50 or 80/20 split and keep a fallback for unknown visitors."
    ],
    actions: [],
    guardrails: {
      status: "review",
      errors: [],
      warnings: [
        "This is advisory only; no draft was created.",
        "Convert one idea into a draft before applying changes."
      ]
    }
  };
}

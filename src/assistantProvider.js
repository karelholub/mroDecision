import { createAssistantPlan } from "./assistantPlanner.js";

const allowedActions = new Set(["upsert_message", "create_rule_draft", "update_rule_draft"]);

export async function createAssistantPlanWithProvider(input = {}, context = {}, settings = {}, fetcher = fetch) {
  const deterministic = createAssistantPlan(input, context);
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
  return {
    enabled: settings.assistant_llm_enabled === true || settings.assistant_llm_enabled === "true",
    provider: String(settings.assistant_llm_provider || "openai_compatible"),
    base_url: String(settings.assistant_llm_base_url || "").trim(),
    model: String(settings.assistant_llm_model || "").trim(),
    api_key: String(settings.assistant_llm_api_key || "").trim(),
    timeout_ms: Math.max(1000, Math.min(30000, Number(settings.assistant_llm_timeout_ms || 8000)))
  };
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
  const endpoint = new URL(settings.base_url);
  if (!endpoint.pathname.endsWith("/chat/completions")) {
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/chat/completions`;
  }
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${settings.api_key}`,
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: providerSystemPrompt() },
        { role: "user", content: JSON.stringify(providerContext(input, context)) }
      ]
    }),
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
  const content = body.choices?.[0]?.message?.content || body.output_text || body.plan;
  if (!content) throw new Error("LLM provider response did not include plan content");
  if (typeof content === "object") return content;
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("LLM provider plan content was not JSON");
  }
}

function providerSystemPrompt() {
  return [
    "You configure Meiro DEE draft plans.",
    "Return only JSON matching the existing assistant plan contract.",
    "mode must be draft_only.",
    "Allowed actions: upsert_message, create_rule_draft, update_rule_draft.",
    "Never publish, delete, archive, create tokens, call external services, or include secrets.",
    "Prefer concise draft objects and include guardrail warnings for assumptions."
  ].join(" ");
}

function providerContext(input, context) {
  return {
    request: input,
    available_schema: (context.schemaItems || []).slice(0, 80),
    lookup_tables: (context.lookupTables || []).map((table) => ({
      id: table.id,
      name: table.name,
      key_column: table.key_column,
      columns: [...new Set((table.rows || []).flatMap((row) => Object.keys(row || {})))].slice(0, 20)
    })).slice(0, 30),
    deterministic_plan: createAssistantPlan(input, context)
  };
}

function sanitizeProviderPlan(plan, fallback) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) throw new Error("LLM plan must be an object");
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

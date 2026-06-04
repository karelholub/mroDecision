import assert from "node:assert/strict";
import test from "node:test";
import {
  createAssistantPlanWithProvider,
  normalizeProviderSettings,
  testAssistantProviderConnection
} from "../src/assistantProvider.js";

test("assistant provider stays deterministic when disabled", async () => {
  const plan = await createAssistantPlanWithProvider(
    { prompt: "Create a retention offer", type: "decision", decision_key: "retention_offer" },
    {},
    { assistant_llm_enabled: false }
  );

  assert.equal(plan.mode, "draft_only");
  assert.equal(plan.provider.status, "disabled");
  assert.equal(plan.provider.mode, "deterministic");
  assert.ok(plan.actions.some((item) => item.action === "create_rule_draft"));
});

test("assistant provider accepts draft-only allowed LLM plan", async () => {
  const fetcher = async () => new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            mode: "draft_only",
            prompt: "Create a homepage banner",
            summary: "Provider draft",
            guardrails: { status: "review", warnings: [], errors: [] },
            actions: [
              {
                action: "create_rule_draft",
                id: "homepage_banner",
                object: {
                  name: "Homepage Banner",
                  decision_key: "homepage_banner",
                  type: "inapp_message",
                  surface: "homepage",
                  draft: { branches: [], fallback: { result: "ineligible", outputs: {} } }
                }
              }
            ]
          })
        }
      }
    ]
  }), { status: 200, headers: { "content-type": "application/json" } });

  const plan = await createAssistantPlanWithProvider(
    { prompt: "Create a homepage banner", type: "inapp_message", decision_key: "homepage_banner" },
    {},
    {
      assistant_llm_enabled: true,
      assistant_llm_base_url: "https://provider.example/v1",
      assistant_llm_model: "test-model",
      assistant_llm_api_key: "secret"
    },
    fetcher
  );

  assert.equal(plan.provider.status, "used");
  assert.equal(plan.provider.mode, "llm");
  assert.equal(plan.summary, "Provider draft");
  assert.deepEqual(plan.actions.map((item) => item.action), ["create_rule_draft"]);
});

test("assistant provider falls back on unsupported LLM action", async () => {
  const fetcher = async () => new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            mode: "draft_only",
            actions: [{ action: "publish_rule", id: "x", object: {} }]
          })
        }
      }
    ]
  }), { status: 200, headers: { "content-type": "application/json" } });

  const plan = await createAssistantPlanWithProvider(
    { prompt: "Create a rule", type: "decision", decision_key: "safe_rule" },
    {},
    {
      assistant_llm_enabled: true,
      assistant_llm_base_url: "https://provider.example/v1",
      assistant_llm_model: "test-model",
      assistant_llm_api_key: "secret"
    },
    fetcher
  );

  assert.equal(plan.provider.status, "fallback");
  assert.equal(plan.provider.mode, "deterministic");
  assert.ok(plan.guardrails.warnings.some((item) => item.includes("unsupported action")));
  assert.ok(plan.actions.every((item) => item.action !== "publish_rule"));
});

test("assistant provider defaults OpenAI base URL for private API keys", () => {
  const settings = normalizeProviderSettings({
    assistant_llm_enabled: true,
    assistant_llm_provider: "openai",
    assistant_llm_model: "gpt-test",
    assistant_llm_api_key: "secret"
  });

  assert.equal(settings.base_url, "https://api.openai.com/v1");
  assert.equal(settings.provider, "openai");
});

test("assistant provider test connection calls chat completions safely", async () => {
  let requestUrl = "";
  let requestBody = {};
  const fetcher = async (url, options) => {
    requestUrl = String(url);
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      id: "chatcmpl_test",
      choices: [{ message: { content: "{\"ok\":true}" } }],
      usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const result = await testAssistantProviderConnection(
    {
      assistant_llm_provider: "openai",
      assistant_llm_model: "gpt-test",
      assistant_llm_api_key: "secret"
    },
    {},
    fetcher
  );

  assert.equal(result.ok, true);
  assert.equal(result.provider, "openai");
  assert.equal(result.base_url, "https://api.openai.com/v1");
  assert.equal(result.response_id, "chatcmpl_test");
  assert.equal(requestUrl, "https://api.openai.com/v1/chat/completions");
  assert.equal(requestBody.model, "gpt-test");
  assert.equal(requestBody.response_format.type, "json_object");
});

test("assistant provider test connection reports missing private API key", async () => {
  const result = await testAssistantProviderConnection({
    assistant_llm_provider: "openai",
    assistant_llm_model: "gpt-test"
  });

  assert.equal(result.ok, false);
  assert.equal(result.provider, "openai");
  assert.equal(result.base_url, "https://api.openai.com/v1");
  assert.match(result.message, /API key required/);
});

test("assistant provider returns deterministic advice for broad experiment questions when disabled", async () => {
  const plan = await createAssistantPlanWithProvider(
    { prompt: "What kind of experiment would you suggest for meiro.io site?" },
    {},
    { assistant_llm_enabled: false }
  );

  assert.equal(plan.mode, "advice");
  assert.equal(plan.actions.length, 0);
  assert.ok(plan.answer.includes("experiments"));
  assert.ok(plan.recommendations.length >= 3);
  assert.equal(plan.provider.status, "disabled");
});

test("assistant provider accepts LLM advice without draft actions", async () => {
  const fetcher = async () => new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            mode: "advice",
            summary: "Meiro experiment advice",
            answer: "Start with homepage CTA personalization.",
            assumptions: ["Website can pass visitor context."],
            recommendations: [
              {
                title: "CTA personalization",
                hypothesis: "Intent-based CTAs improve qualified clicks.",
                audience: "Returning visitors",
                surface: "Homepage",
                variants: ["Control", "Personalized CTA"],
                primary_metric: "CTA click-through rate"
              }
            ],
            next_steps: ["Create a draft experiment for the selected idea."]
          })
        }
      }
    ]
  }), { status: 200, headers: { "content-type": "application/json" } });

  const plan = await createAssistantPlanWithProvider(
    { prompt: "What kind of experiment would you suggest for meiro.io site?" },
    {},
    {
      assistant_llm_enabled: true,
      assistant_llm_provider: "openai",
      assistant_llm_model: "gpt-test",
      assistant_llm_api_key: "secret"
    },
    fetcher
  );

  assert.equal(plan.mode, "advice");
  assert.equal(plan.actions.length, 0);
  assert.equal(plan.provider.status, "used");
  assert.equal(plan.recommendations[0].title, "CTA personalization");
});

test("assistant provider normalizes alternate LLM recommendation field names", async () => {
  const fetcher = async () => new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            mode: "advice",
            answer: "Try lifecycle-personalized offers.",
            recommendations: [
              {
                name: "High LTV homepage offer",
                description: "Show premium proof points to high lifetime value visitors.",
                target_segment: "High LTV users",
                placement: "Homepage hero",
                success_metric: "Demo CTA click-through rate",
                test_variants: ["Control", "Premium proof point"]
              }
            ]
          })
        }
      }
    ]
  }), { status: 200, headers: { "content-type": "application/json" } });

  const plan = await createAssistantPlanWithProvider(
    { prompt: "What kind of experiment would you suggest for meiro.io site?" },
    {},
    {
      assistant_llm_enabled: true,
      assistant_llm_provider: "openai",
      assistant_llm_model: "gpt-test",
      assistant_llm_api_key: "secret"
    },
    fetcher
  );

  assert.equal(plan.recommendations[0].title, "High LTV homepage offer");
  assert.equal(plan.recommendations[0].hypothesis, "Show premium proof points to high lifetime value visitors.");
  assert.equal(plan.recommendations[0].audience, "High LTV users");
  assert.equal(plan.recommendations[0].surface, "Homepage hero");
  assert.equal(plan.recommendations[0].primary_metric, "Demo CTA click-through rate");
  assert.deepEqual(plan.recommendations[0].variants, ["Control", "Premium proof point"]);
});

test("assistant provider treats follow-up draft requests as draft plans", async () => {
  const plan = await createAssistantPlanWithProvider(
    {
      prompt: "turn the first idea into a draft experiment",
      history: [
        { role: "user", content: "what kind of experiment would you suggest for meiro.io site" },
        { role: "assistant", content: "Try homepage value proposition personalization first." }
      ]
    },
    {},
    { assistant_llm_enabled: false }
  );

  assert.equal(plan.mode, "draft_only");
  assert.ok(plan.actions.some((item) => item.action === "create_rule_draft"));
  assert.equal(plan.actions[0]?.object?.type || plan.actions.at(-1)?.object?.type, "experiment");
});

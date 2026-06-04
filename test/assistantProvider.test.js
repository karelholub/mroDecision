import assert from "node:assert/strict";
import test from "node:test";
import { createAssistantPlanWithProvider } from "../src/assistantProvider.js";

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

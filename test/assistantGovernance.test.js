import assert from "node:assert/strict";
import test from "node:test";
import { createAssistantGovernanceReport } from "../src/assistantGovernance.js";

test("assistant governance passes safe draft-only actions", () => {
  const report = createAssistantGovernanceReport({
    mode: "draft_only",
    guardrails: { status: "ok", errors: [], warnings: [] },
    actions: [
      {
        action: "create_rule_draft",
        id: "safe_rule",
        object: { decision_key: "safe_rule" }
      }
    ]
  }, { mode: "llm", status: "used" });

  assert.equal(report.status, "pass");
  assert.equal(report.risk_level, "low");
  assert.equal(report.provider_mode, "llm");
  assert.equal(report.action_count, 1);
  assert.equal(report.unsupported_action_count, 0);
  assert.equal(report.secret_finding_count, 0);
});

test("assistant governance blocks unsupported actions and secret-like values", () => {
  const report = createAssistantGovernanceReport({
    mode: "draft_only",
    prompt: "use api_key=sk-testsecretvalue123456",
    guardrails: { status: "ok", errors: [], warnings: [] },
    actions: [
      {
        action: "publish_rule",
        id: "unsafe_rule",
        object: {}
      }
    ]
  }, { mode: "llm", status: "used" });

  assert.equal(report.status, "block");
  assert.equal(report.risk_level, "high");
  assert.equal(report.unsupported_action_count, 1);
  assert.equal(report.secret_finding_count, 1);
  assert.ok(report.checks.some((item) => item.key === "actions" && item.level === "error"));
  assert.ok(report.checks.some((item) => item.key === "secrets" && item.level === "error"));
});

test("assistant governance treats advice as no-action contract", () => {
  const report = createAssistantGovernanceReport({
    mode: "advice",
    guardrails: { status: "review", errors: [], warnings: ["Advisory only."] },
    actions: []
  }, { mode: "deterministic", status: "disabled" });

  assert.equal(report.contract, "advice_only");
  assert.equal(report.status, "review");
  assert.equal(report.checks.find((item) => item.key === "contract").passed, true);
});

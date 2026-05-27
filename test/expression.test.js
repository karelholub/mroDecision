import assert from "node:assert/strict";
import test from "node:test";
import { evaluateExpression } from "../src/expression.js";

const env = {
  now: new Date("2026-01-15T00:00:00.000Z"),
  attribute: (key) => ({ plan_tier: "gold", lifetime_revenue: 8400, last_purchase_date: "2026-01-10T00:00:00.000Z" })[key],
  segment: (key) => ({ vip_customers: true })[key],
  context: (key) => ({ channel: "email" })[key],
  score: (key) => ({ credit_score: 725 })[key],
  lookup: () => null
};

test("evaluates safe rule expressions", () => {
  assert.equal(evaluateExpression('attribute("plan_tier") in ["gold", "platinum"]', env), true);
  assert.equal(evaluateExpression('attribute("lifetime_revenue") >= 5000 && segment("vip_customers") == true', env), true);
  assert.equal(evaluateExpression('context("channel") == "sms"', env), false);
  assert.equal(evaluateExpression('days_since(attribute("last_purchase_date")) <= 30', env), true);
  assert.equal(evaluateExpression('score("credit_score") >= 700', env), true);
});

test("rejects unknown identifiers", () => {
  assert.throws(() => evaluateExpression("process.exit()", env), /Unexpected token|Unsupported function|Unknown identifier/);
});

const allowedActions = new Set(["upsert_message", "create_rule_draft", "update_rule_draft"]);
const blockedActionPattern = /(publish|delete|archive|token|secret|webhook|external|fetch|http|revoke|credential)/i;
const secretPattern = /(sk-[a-z0-9_-]{12,}|mppak_[a-z0-9_-]+|mpak_[a-z0-9_-]+|bearer\s+[a-z0-9._-]{12,}|api[_-]?key["'\s:=]+[a-z0-9._-]{12,})/i;

export function createAssistantGovernanceReport(plan = {}, provider = plan.provider || {}) {
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  const guardrails = plan.guardrails || {};
  const checks = [];
  const isAdvice = plan.mode === "advice";
  const unsupportedActions = actions.filter((item) => !allowedActions.has(item.action));
  const blockedIntentActions = actions.filter((item) => blockedActionPattern.test(String(item.action || "")));
  const secretFindings = findSecretLikeValues(plan);
  const validationErrors = Array.isArray(guardrails.errors) ? guardrails.errors : [];
  const validationWarnings = Array.isArray(guardrails.warnings) ? guardrails.warnings : [];

  checks.push(check({
    key: "contract",
    label: isAdvice ? "Advice-only contract" : "Draft-only contract",
    passed: isAdvice ? actions.length === 0 : plan.mode === "draft_only",
    level: isAdvice && actions.length === 0 ? "ok" : plan.mode === "draft_only" ? "ok" : "error",
    detail: isAdvice ? "Advice responses cannot apply changes." : "Assistant can create drafts only; publishing remains manual."
  }));
  checks.push(check({
    key: "actions",
    label: "Allowed actions",
    passed: unsupportedActions.length === 0,
    level: unsupportedActions.length ? "error" : "ok",
    detail: unsupportedActions.length
      ? `${unsupportedActions.length} unsupported action(s) detected.`
      : actions.length ? `${actions.length} draft action(s) checked.` : "No draft actions requested."
  }));
  checks.push(check({
    key: "side_effects",
    label: "External side effects",
    passed: blockedIntentActions.length === 0,
    level: blockedIntentActions.length ? "error" : "ok",
    detail: blockedIntentActions.length
      ? "Plan contains action names associated with publishing, external calls, or token operations."
      : "No publish, token, webhook, or external-call actions detected."
  }));
  checks.push(check({
    key: "secrets",
    label: "Secret handling",
    passed: secretFindings.length === 0,
    level: secretFindings.length ? "error" : "ok",
    detail: secretFindings.length
      ? `${secretFindings.length} secret-like value(s) detected and should be removed before sharing.`
      : "No API keys or bearer-token patterns detected in the plan payload."
  }));
  checks.push(check({
    key: "validation",
    label: "DEE validation",
    passed: validationErrors.length === 0,
    level: validationErrors.length ? "error" : validationWarnings.length ? "warn" : "ok",
    detail: validationErrors.length
      ? `${validationErrors.length} blocking validation error(s).`
      : validationWarnings.length ? `${validationWarnings.length} review warning(s).` : "No validation warnings."
  }));

  const status = checks.some((item) => item.level === "error") ? "block" : checks.some((item) => item.level === "warn") ? "review" : "pass";
  return {
    status,
    risk_level: status === "block" ? "high" : status === "review" ? "medium" : "low",
    contract: isAdvice ? "advice_only" : "draft_only",
    provider_mode: provider.mode || "deterministic",
    provider_status: provider.status || "unknown",
    provider_policy: provider.policy || "balanced",
    contract_version: provider.contract_version || "assistant-plan-v2",
    action_count: actions.length,
    unsupported_action_count: unsupportedActions.length,
    secret_finding_count: secretFindings.length,
    summary: summaryFor(status, isAdvice, actions.length),
    checks
  };
}

function summaryFor(status, isAdvice, actionCount) {
  if (status === "block") return "Assistant output needs correction before it can be applied.";
  if (status === "review") return isAdvice ? "Advice is ready for review." : "Draft is safe to review, with warnings before publishing.";
  if (isAdvice) return "Advice-only response passed governance checks.";
  return `${actionCount} draft action(s) passed governance checks.`;
}

function check({ key, label, passed, level, detail }) {
  return { key, label, passed: Boolean(passed), level, detail };
}

function findSecretLikeValues(value, path = "$", findings = []) {
  if (findings.length > 20) return findings;
  if (typeof value === "string") {
    if (secretPattern.test(value)) findings.push({ path });
    return findings;
  }
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => findSecretLikeValues(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, item] of Object.entries(value)) {
    findSecretLikeValues(item, `${path}.${key}`, findings);
  }
  return findings;
}

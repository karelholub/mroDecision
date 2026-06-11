import { evaluateDecisionAsync } from "./evaluator.js";

const terminalStopResults = ["ineligible", "suppressed"];

export function normalizeDecisionStack(input = {}, author = "system", existing = null) {
  const now = new Date().toISOString();
  const id = normalizeId(input.id || input.stack_id || input.name || existing?.id);
  if (!id) badRequest("Decision stack id is required");
  const steps = normalizeStackSteps(input.steps ?? existing?.steps ?? []);
  if (!steps.length) badRequest("Decision stack must include at least one step");
  return {
    id,
    name: String(input.name || existing?.name || id),
    description: String(input.description ?? existing?.description ?? ""),
    status: normalizeStatus(input.status || existing?.status || "draft"),
    surface: String(input.surface ?? existing?.surface ?? ""),
    ttl_seconds: Math.max(0, Math.floor(Number(input.ttl_seconds ?? existing?.ttl_seconds ?? 0) || 0)),
    metadata: isPlainObject(input.metadata) ? input.metadata : existing?.metadata || {},
    steps,
    created_at: existing?.created_at || now,
    updated_at: now,
    author
  };
}

export async function evaluateDecisionStack({ stack, request, store, lookupTables, now = new Date(), clientEventCounter = () => 0 }) {
  if (!stack || !Array.isArray(stack.steps)) badRequest("Decision stack is not configured");
  if (!request?.profile_key) badRequest("profile_key is required");
  const stackKey = stack.id || stack.stack_id;
  const outputs = {};
  const flatOutputs = {};
  const matchedRules = [];
  const errors = [];
  const steps = [];
  let finalResult = "deferred";
  let stopped = false;

  for (const step of stack.steps) {
    if (stopped) {
      steps.push(stackStepTrace(step, { status: "skipped", reason: "previous_step_stopped" }));
      continue;
    }
    const shouldRun = shouldRunStep(step, steps);
    if (!shouldRun.run) {
      steps.push(stackStepTrace(step, { status: "skipped", reason: shouldRun.reason }));
      continue;
    }

    try {
      const version = await store.getVersion(step.decision_key, step.rule_version);
      const decisionRequest = {
        identifiers: [],
        attributes: {},
        segments: {},
        context: {},
        ...request,
        decision_key: step.decision_key,
        context: {
          ...(request.context || {}),
          decision_stack: stackKey,
          decision_stack_step: step.id
        }
      };
      const result = await evaluateDecisionAsync({
        request: decisionRequest,
        version,
        lookupTables,
        now,
        clientEventCounter
      });
      const namespace = step.output_namespace || step.decision_key;
      outputs[namespace] = result.outputs || {};
      if (step.merge_outputs !== false) Object.assign(flatOutputs, result.outputs || {});
      matchedRules.push(...(result.matched_rules || []).map((rule) => `${step.decision_key}:${rule}`));
      errors.push(...(result.errors || []).map((error) => `${step.decision_key}: ${error}`));
      finalResult = result.result || finalResult;
      steps.push(stackStepTrace(step, {
        status: "evaluated",
        result: result.result,
        rule_version: result.rule_version,
        outputs: result.outputs || {},
        matched_rules: result.matched_rules || [],
        errors: result.errors || [],
        trace: result.trace || []
      }));
      if (shouldStopStep(step, result)) stopped = true;
    } catch (error) {
      errors.push(`${step.decision_key}: ${error.message}`);
      finalResult = step.on_error_result || "deferred";
      steps.push(stackStepTrace(step, { status: "error", result: finalResult, errors: [error.message] }));
      if (step.stop_on_error !== false) stopped = true;
    }
  }

  return {
    stack_id: stackKey,
    decision_key: stackKey,
    profile_key: request.profile_key,
    evaluated_at: now.toISOString(),
    result: normalizeStackResult(stack, finalResult, steps),
    outputs: {
      ...flatOutputs,
      by_step: outputs
    },
    steps,
    matched_rules: matchedRules,
    errors,
    ttl_seconds: Number(stack.ttl_seconds || 0),
    cache_scope: stack.ttl_seconds > 0 ? "profile" : null,
    stopped
  };
}

export async function decisionStackReadiness({ stack, store }) {
  if (!stack) badRequest("Decision stack is required");
  const checks = [];
  const dependencies = [];
  const stepIds = new Set();
  const namespaces = new Map();
  const steps = Array.isArray(stack.steps) ? stack.steps : [];
  if (!steps.length) {
    checks.push(readinessCheck("steps", "error", "No steps configured", "Add at least one rule step before activating the stack."));
  }
  for (const [index, step] of steps.entries()) {
    const stepLabel = step.id || `step_${index + 1}`;
    if (!step.id) checks.push(readinessCheck(stepLabel, "error", "Missing step id", "Every step needs a stable id for traceability."));
    if (step.id && stepIds.has(step.id)) checks.push(readinessCheck(stepLabel, "error", "Duplicate step id", "Step ids must be unique."));
    stepIds.add(step.id);
    if (!step.decision_key) {
      checks.push(readinessCheck(stepLabel, "error", "Missing rule set", "Select a rule set for this step."));
      continue;
    }
    const namespace = step.output_namespace || step.decision_key;
    if (namespace) {
      const count = namespaces.get(namespace) || 0;
      namespaces.set(namespace, count + 1);
    }
    const dependency = await dependencyReadiness(store, step.decision_key);
    dependencies.push({ step_id: stepLabel, decision_key: step.decision_key, ...dependency });
    if (!dependency.exists) {
      checks.push(readinessCheck(stepLabel, "error", `Rule not found: ${step.decision_key}`, "Create the rule set or select a different dependency."));
    } else {
      if (dependency.status === "archived") checks.push(readinessCheck(stepLabel, "error", `Rule is archived: ${step.decision_key}`, "Restore or replace the archived rule."));
      if (!dependency.published_version) checks.push(readinessCheck(stepLabel, "error", `Rule has no published version: ${step.decision_key}`, "Publish the rule before evaluating it in a stack."));
    }
    if (step.mode === "on_result" && !step.required_result) {
      checks.push(readinessCheck(stepLabel, "warn", "Conditional step has no required result", "Set the previous result that should trigger this step."));
    }
    if (step.mode === "on_output" && (!step.required_output || !Object.keys(step.required_output).length)) {
      checks.push(readinessCheck(stepLabel, "warn", "Output-triggered step has no output match", "Set required_output so the trigger is explicit."));
    }
    if (!Array.isArray(step.stop_on_results) || !step.stop_on_results.length) {
      checks.push(readinessCheck(stepLabel, "warn", "Step does not stop on any result", "Most journeys should stop on suppressed or ineligible outcomes."));
    }
  }
  for (const [namespace, count] of namespaces.entries()) {
    if (count > 1) {
      checks.push(readinessCheck(`namespace:${namespace}`, "warn", `Output namespace reused: ${namespace}`, "Repeated namespaces overwrite by_step output for earlier steps."));
    }
  }
  const errors = checks.filter((check) => check.level === "error").length;
  const warnings = checks.filter((check) => check.level === "warn").length;
  return {
    status: errors ? "blocked" : warnings ? "review" : "ready",
    summary: {
      steps: steps.length,
      dependencies: dependencies.length,
      errors,
      warnings
    },
    checks,
    dependencies
  };
}

function normalizeStackSteps(steps) {
  if (!Array.isArray(steps)) badRequest("Decision stack steps must be an array");
  const ids = new Set();
  return steps.map((step, index) => {
    if (!isPlainObject(step)) badRequest("Every decision stack step must be an object");
    const id = normalizeId(step.id || `step_${index + 1}`);
    if (ids.has(id)) badRequest("Decision stack step ids must be unique");
    ids.add(id);
    const decisionKey = normalizeId(step.decision_key || step.rule_key || "");
    if (!decisionKey) badRequest("Every decision stack step needs decision_key");
    const mode = ["always", "on_result", "on_output"].includes(step.mode) ? step.mode : "always";
    const normalized = {
      id,
      name: String(step.name || id),
      decision_key: decisionKey,
      mode,
      required_result: step.required_result || null,
      required_output: isPlainObject(step.required_output) ? step.required_output : null,
      rule_version: step.rule_version == null ? null : Number(step.rule_version),
      output_namespace: normalizeId(step.output_namespace || decisionKey),
      merge_outputs: step.merge_outputs !== false,
      stop_on_results: normalizeStringList(step.stop_on_results || step.stop_on || terminalStopResults),
      stop_on_error: step.stop_on_error !== false,
      on_error_result: step.on_error_result || "deferred",
      metadata: isPlainObject(step.metadata) ? step.metadata : {}
    };
    if (normalized.rule_version != null && !Number.isInteger(normalized.rule_version)) badRequest("Decision stack step rule_version must be an integer");
    return normalized;
  });
}

function shouldRunStep(step, previousSteps) {
  if (step.mode === "always") return { run: true };
  const previous = [...previousSteps].reverse().find((item) => item.status === "evaluated");
  if (!previous) return { run: false, reason: "no_previous_evaluated_step" };
  if (step.mode === "on_result") {
    return previous.result === step.required_result
      ? { run: true }
      : { run: false, reason: `previous_result_${previous.result || "none"}` };
  }
  if (step.mode === "on_output") {
    const required = step.required_output || {};
    const passed = Object.entries(required).every(([key, value]) => previous.outputs?.[key] === value);
    return passed ? { run: true } : { run: false, reason: "required_output_not_matched" };
  }
  return { run: true };
}

function shouldStopStep(step, result) {
  return step.stop_on_results.includes(result.result);
}

function normalizeStackResult(stack, finalResult, steps) {
  const policy = stack.metadata?.result_policy || "last_evaluated";
  if (policy === "any_eligible" && steps.some((step) => step.result === "eligible")) return "eligible";
  if (policy === "all_eligible") {
    const evaluated = steps.filter((step) => step.status === "evaluated");
    return evaluated.length && evaluated.every((step) => step.result === "eligible") ? "eligible" : "deferred";
  }
  return finalResult || "deferred";
}

function stackStepTrace(step, patch) {
  return {
    id: step.id,
    name: step.name || step.id,
    decision_key: step.decision_key,
    mode: step.mode || "always",
    ...patch
  };
}

async function dependencyReadiness(store, decisionKey) {
  try {
    const rule = await store.getRuleSet(decisionKey);
    if (!rule) return { exists: false, status: "missing", published_version: null, type: "" };
    const latest = Array.isArray(rule.versions) ? rule.versions.at(-1) : null;
    return {
      exists: true,
      status: rule.status || "draft",
      published_version: latest?.version || rule.version || null,
      type: rule.type || "decision",
      surface: rule.surface || ""
    };
  } catch (error) {
    return { exists: false, status: "error", published_version: null, type: "", error: error.message };
  }
}

function readinessCheck(id, level, title, detail) {
  return { id, level, title, detail };
}

function normalizeStatus(value) {
  if (["draft", "active", "archived"].includes(value)) return value;
  badRequest("Decision stack status must be draft, active, or archived");
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "bad_request";
  throw error;
}

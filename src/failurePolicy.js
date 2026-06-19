const dependencyFailureStatuses = new Set(["error", "circuit_open"]);
const failureModes = new Set(["evaluate", "fail_open", "fail_closed"]);

export function dependencyFailurePolicyDecision(ruleSet = {}, profileCache = {}) {
  if (!dependencyFailureStatuses.has(profileCache?.status)) return null;
  const policy = ruleSet.cache_policy || {};
  const mode = failureModes.has(policy.dependency_failure_mode) ? policy.dependency_failure_mode : "evaluate";
  if (mode === "evaluate") return null;
  const result = String(policy.dependency_failure_result || (mode === "fail_open" ? "eligible" : "ineligible"));
  const outputs = outputsForMode(policy, mode);
  return {
    mode,
    result,
    outputs,
    reason: profileCache.status,
    message: mode === "fail_open"
      ? "Dependency failure policy returned a fail-open decision."
      : "Dependency failure policy returned a fail-closed decision."
  };
}

export function validateDependencyFailurePolicy(policy = {}, fail = () => {}) {
  if (!isPlainObject(policy)) return;
  if (policy.dependency_failure_mode != null && !failureModes.has(policy.dependency_failure_mode)) {
    fail("cache_policy.dependency_failure_mode must be evaluate, fail_open, or fail_closed");
  }
  if (policy.dependency_failure_result != null && typeof policy.dependency_failure_result !== "string") {
    fail("cache_policy.dependency_failure_result must be a string");
  }
  for (const key of ["dependency_failure_outputs", "fail_open_outputs", "fail_closed_outputs"]) {
    if (policy[key] != null && !isPlainObject(policy[key])) {
      fail(`cache_policy.${key} must be an object`);
    }
  }
}

function outputsForMode(policy, mode) {
  if (mode === "fail_open") {
    return clone(policy.fail_open_outputs || policy.dependency_failure_outputs || {});
  }
  return clone(policy.fail_closed_outputs || policy.dependency_failure_outputs || {});
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

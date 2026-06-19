export function createCircuitBreaker(name, options = {}) {
  const failureThreshold = Math.max(1, Number(options.failureThreshold || 5));
  const cooldownMs = Math.max(1, Number(options.cooldownMs || 30000));
  const now = options.now || (() => Date.now());
  const state = {
    name,
    status: "closed",
    failures: 0,
    successes: 0,
    opened_at: "",
    next_retry_at: "",
    last_error: ""
  };

  function canRequest() {
    if (state.status !== "open") return { allowed: true, status: state.status };
    if (now() >= Date.parse(state.next_retry_at || "1970-01-01T00:00:00.000Z")) {
      state.status = "half_open";
      return { allowed: true, status: state.status };
    }
    return { allowed: false, status: state.status, next_retry_at: state.next_retry_at, reason: "circuit_open" };
  }

  function recordSuccess() {
    state.status = "closed";
    state.failures = 0;
    state.successes += 1;
    state.opened_at = "";
    state.next_retry_at = "";
    state.last_error = "";
  }

  function recordFailure(error) {
    state.failures += 1;
    state.last_error = error?.message || String(error || "request failed");
    if (state.failures >= failureThreshold || state.status === "half_open") {
      state.status = "open";
      state.opened_at = new Date(now()).toISOString();
      state.next_retry_at = new Date(now() + cooldownMs).toISOString();
    }
  }

  function metrics() {
    return {
      name,
      status: state.status,
      open: state.status === "open",
      failures: state.failures,
      successes: state.successes,
      failure_threshold: failureThreshold,
      cooldown_ms: cooldownMs,
      opened_at: state.opened_at,
      next_retry_at: state.next_retry_at,
      last_error: state.last_error
    };
  }

  function reset() {
    state.status = "closed";
    state.failures = 0;
    state.successes = 0;
    state.opened_at = "";
    state.next_retry_at = "";
    state.last_error = "";
  }

  return { canRequest, recordSuccess, recordFailure, metrics, reset };
}

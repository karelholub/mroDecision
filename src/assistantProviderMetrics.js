const maxSamples = 500;

export function createAssistantProviderMetrics() {
  const state = {
    started_at: new Date().toISOString(),
    calls: [],
    tests: [],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };

  function recordCall(event = {}) {
    const normalized = normalizeEvent(event);
    state.calls.push(normalized);
    if (state.calls.length > maxSamples) state.calls.shift();
    addUsage(event.usage);
  }

  function recordTest(event = {}) {
    const normalized = normalizeEvent(event);
    state.tests.push(normalized);
    if (state.tests.length > maxSamples) state.tests.shift();
    addUsage(event.usage);
  }

  function metrics() {
    const calls = summarize(state.calls);
    const tests = summarize(state.tests);
    const lastCall = state.calls.at(-1) || null;
    const lastTest = state.tests.at(-1) || null;
    return {
      started_at: state.started_at,
      calls,
      tests,
      usage: { ...state.usage },
      last_call: lastCall ? publicEvent(lastCall) : null,
      last_test: lastTest ? publicEvent(lastTest) : null
    };
  }

  function reset() {
    state.started_at = new Date().toISOString();
    state.calls = [];
    state.tests = [];
    state.usage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    };
  }

  function addUsage(usage = null) {
    if (!usage || typeof usage !== "object") return;
    state.usage.prompt_tokens += Number(usage.prompt_tokens || 0);
    state.usage.completion_tokens += Number(usage.completion_tokens || 0);
    state.usage.total_tokens += Number(usage.total_tokens || 0);
  }

  return { recordCall, recordTest, metrics, reset };
}

function normalizeEvent(event = {}) {
  return {
    at: event.at || new Date().toISOString(),
    mode: String(event.mode || "deterministic"),
    status: String(event.status || "unknown"),
    provider: String(event.provider || ""),
    model: String(event.model || ""),
    duration_ms: Math.max(0, Math.round(Number(event.duration_ms || 0))),
    ok: event.ok !== false,
    error: event.error ? String(event.error).slice(0, 300) : "",
    usage: sanitizeUsage(event.usage)
  };
}

function summarize(events = []) {
  const total = events.length;
  const statuses = {};
  const modes = {};
  const errors = events.filter((event) => !event.ok || event.status === "fallback" || event.status === "error").length;
  const durations = events.map((event) => event.duration_ms).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  for (const event of events) {
    statuses[event.status] = (statuses[event.status] || 0) + 1;
    modes[event.mode] = (modes[event.mode] || 0) + 1;
  }
  return {
    total,
    ok: total - errors,
    errors,
    error_rate: total ? errors / total : 0,
    statuses,
    modes,
    p50_ms: percentile(durations, 0.5),
    p95_ms: percentile(durations, 0.95),
    max_ms: durations.length ? durations.at(-1) : 0
  };
}

function percentile(values = [], p = 0.5) {
  if (!values.length) return 0;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * p) - 1));
  return values[index];
}

function sanitizeUsage(usage = null) {
  if (!usage || typeof usage !== "object") return null;
  return {
    prompt_tokens: Number(usage.prompt_tokens || 0),
    completion_tokens: Number(usage.completion_tokens || 0),
    total_tokens: Number(usage.total_tokens || 0)
  };
}

function publicEvent(event = {}) {
  return {
    at: event.at,
    mode: event.mode,
    status: event.status,
    provider: event.provider,
    model: event.model,
    duration_ms: event.duration_ms,
    ok: event.ok,
    error: event.error,
    usage: event.usage
  };
}

export const assistantProviderMetrics = createAssistantProviderMetrics();

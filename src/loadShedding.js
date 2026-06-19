const allowedModes = new Set(["off", "monitor", "shed"]);

export function createLoadShedding(options = {}) {
  const config = normalizeConfig(options);
  let allowed = 0;
  let monitored = 0;
  let shed = 0;
  let lastDecision = {
    active: false,
    enforced: false,
    reason: "not_evaluated",
    reason_detail: "",
    at: ""
  };

  function check(snapshot = {}) {
    const pressure = pressureDecision(snapshot, config);
    const enforced = config.mode === "shed" && pressure.active;
    const decision = {
      active: pressure.active,
      enforced,
      reason: pressure.reason,
      reason_detail: pressure.reason_detail,
      retry_after_seconds: config.retryAfterSeconds,
      mode: config.mode,
      at: new Date(config.now()).toISOString()
    };
    lastDecision = decision;
    if (enforced) {
      shed += 1;
    } else if (pressure.active) {
      monitored += 1;
    } else {
      allowed += 1;
    }
    return { allowed: !enforced, ...decision };
  }

  function metrics(snapshot = {}) {
    const pressure = pressureDecision(snapshot, config);
    return {
      mode: config.mode,
      active: pressure.active,
      enforced: config.mode === "shed" && pressure.active,
      reason: pressure.reason,
      reason_detail: pressure.reason_detail,
      retry_after_seconds: config.retryAfterSeconds,
      min_samples: config.minSamples,
      runtime_p95_threshold_ms: config.runtimeP95Ms,
      client_error_rate_threshold: config.clientErrorRate,
      profile_error_threshold: config.profileErrorThreshold,
      decisions: {
        allowed,
        monitored,
        shed
      },
      last_decision: lastDecision
    };
  }

  function clear() {
    allowed = 0;
    monitored = 0;
    shed = 0;
    lastDecision = {
      active: false,
      enforced: false,
      reason: "not_evaluated",
      reason_detail: "",
      at: ""
    };
  }

  return { check, metrics, clear };
}

export function pressureDecision(snapshot = {}, configInput = {}) {
  const config = normalizeConfig(configInput);
  if (config.mode === "off") {
    return { active: false, reason: "off", reason_detail: "Load shedding is disabled." };
  }

  const runtime = snapshot.runtime || {};
  const clientTraffic = snapshot.clientTraffic || {};
  const profileCache = snapshot.profileCache || {};
  const database = snapshot.database || {};
  const breakers = snapshot.breakers || {};

  if (database.ok === false) {
    return { active: true, reason: "database_not_ready", reason_detail: database.message || database.error || "Database health check is not ready." };
  }

  const runtimeSamples = Number(runtime.sample_size || runtime.total || 0);
  if (runtimeSamples >= config.minSamples && Number(runtime.p95_ms || 0) >= config.runtimeP95Ms) {
    return {
      active: true,
      reason: "runtime_latency",
      reason_detail: `Runtime p95 ${Math.round(Number(runtime.p95_ms || 0))}ms >= ${config.runtimeP95Ms}ms.`
    };
  }

  const clientSamples = Number(clientTraffic.total || 0);
  if (clientSamples >= config.minSamples && Number(clientTraffic.error_rate || 0) >= config.clientErrorRate) {
    return {
      active: true,
      reason: "client_error_rate",
      reason_detail: `Client error rate ${round(Number(clientTraffic.error_rate || 0), 4)} >= ${config.clientErrorRate}.`
    };
  }

  if (Number(profileCache.errors || 0) >= config.profileErrorThreshold) {
    return {
      active: true,
      reason: "profile_enrichment_errors",
      reason_detail: `Profile enrichment errors ${Number(profileCache.errors || 0)} >= ${config.profileErrorThreshold}.`
    };
  }

  const openBreakers = Object.entries(breakers)
    .filter(([, breaker]) => breaker?.open || breaker?.status === "open")
    .map(([dependency]) => dependency);
  if (openBreakers.length && config.shedOnOpenCircuit) {
    return {
      active: true,
      reason: "dependency_circuit_open",
      reason_detail: `Open dependency circuits: ${openBreakers.join(", ")}.`
    };
  }

  return { active: false, reason: "healthy", reason_detail: "Pressure thresholds are below configured limits." };
}

function normalizeConfig(options = {}) {
  const mode = allowedModes.has(String(options.mode || "").trim()) ? String(options.mode || "").trim() : "monitor";
  return {
    mode,
    minSamples: positiveNumber(options.minSamples, 100),
    runtimeP95Ms: positiveNumber(options.runtimeP95Ms, 1000),
    clientErrorRate: positiveNumber(options.clientErrorRate, 0.2),
    profileErrorThreshold: positiveNumber(options.profileErrorThreshold, 20),
    retryAfterSeconds: positiveNumber(options.retryAfterSeconds, 10),
    shedOnOpenCircuit: options.shedOnOpenCircuit === true,
    now: typeof options.now === "function" ? options.now : Date.now
  };
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

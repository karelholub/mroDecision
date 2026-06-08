export function meiroFeedbackEndpoint(settings = {}) {
  const explicit = String(settings.meiro_feedback_url || "").trim();
  if (explicit) return explicit;
  const base = String(settings.meiro_url || "").trim();
  if (!base) return "";
  return new URL("collect/decision-engine-feedback", base.endsWith("/") ? base : `${base}/`).toString();
}

export function buildDecisionFeedbackPayload(decision = {}, request = {}, options = {}) {
  const evaluatedAt = decision.evaluated_at || options.evaluated_at || new Date().toISOString();
  const context = request.context && typeof request.context === "object" ? request.context : {};
  const payload = {
    decision_key: decision.decision_key || request.decision_key || "",
    profile_key: decision.profile_key || request.profile_key || "",
    result: decision.result || "",
    outputs: decision.outputs || {},
    rule_version: decision.rule_version ?? request.rule_version ?? null,
    ttl_seconds: Number(decision.ttl_seconds || 0),
    cache_scope: decision.cache_scope ?? null,
    cache: decision.cache || null,
    profile_cache: decision.profile_cache || null,
    experiment: decision.experiment || null,
    matched_rules: Array.isArray(decision.matched_rules) ? decision.matched_rules : [],
    errors: Array.isArray(decision.errors) ? decision.errors : [],
    evaluated_at: evaluatedAt,
    identifiers: Array.isArray(request.identifiers) ? request.identifiers : [],
    context,
    delivery: {
      source: options.source || context.request_source || "dee",
      endpoint: options.endpoint || "",
      request_id: options.request_id || "",
      surface: options.surface || request.surface || context.surface || "",
      sync_id: options.sync_id || context.sync_id || "",
      delivered_at: new Date().toISOString()
    }
  };

  if (options.surface_result) {
    payload.surface_result = options.surface_result;
  }

  return payload;
}

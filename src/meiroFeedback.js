export function meiroFeedbackEndpoint(settings = {}) {
  const explicit = String(settings.meiro_feedback_url || "").trim();
  if (explicit) return explicit;
  const base = String(settings.meiro_url || "").trim();
  if (!base) return "";
  return new URL("collect/decision-engine-feedback", base.endsWith("/") ? base : `${base}/`).toString();
}

export function meiroCollectorEndpoint(settings = {}) {
  const base = String(settings.meiro_url || "").trim();
  const slug = String(settings.meiro_source_slug || "").trim();
  if (!base || !slug) return "";
  return new URL(["collect", slug].join("/"), base.endsWith("/") ? base : `${base}/`).toString();
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
    graph_experiments: Array.isArray(decision.graph_experiments) ? decision.graph_experiments : [],
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

export function buildDecisionCollectorEventPayload(decision = {}, request = {}, options = {}) {
  const feedback = buildDecisionFeedbackPayload(decision, request, options);
  return {
    event_type: options.event_type || "decision_result",
    event_time: feedback.evaluated_at,
    identifiers: feedback.identifiers,
    event_payload: {
      decision_key: feedback.decision_key,
      profile_key: feedback.profile_key,
      result: feedback.result,
      rule_version: feedback.rule_version,
      ttl_seconds: feedback.ttl_seconds,
      cache_scope: feedback.cache_scope,
      outputs: feedback.outputs,
      matched_rules: feedback.matched_rules,
      errors: feedback.errors,
      cache: feedback.cache,
      profile_cache: feedback.profile_cache,
      experiment: feedback.experiment,
      graph_experiments: feedback.graph_experiments,
      context: feedback.context,
      delivery: feedback.delivery,
      surface_result: feedback.surface_result || null
    }
  };
}

export function buildClientEventCollectorPayload(event = {}, options = {}) {
  const details = event.event && typeof event.event === "object" ? event.event : {};
  const context = event.context && typeof event.context === "object" ? event.context : {};
  const eventTime = event.occurred_at || options.event_time || new Date().toISOString();
  const survey = {
    question: details.survey_question || "",
    question_label: details.survey_question_label || "",
    value: details.survey_value ?? details.value ?? "",
    label: details.label || "",
    tracking_name: details.name || details.action || ""
  };
  return {
    event_type: options.event_type || (details.type === "survey_response" ? "inapp_survey_response" : "dee_client_event"),
    event_time: eventTime,
    identifiers: Array.isArray(options.identifiers) ? options.identifiers : [],
    event_payload: {
      event_id: event.event_id || "",
      event_type: event.event_type || "",
      occurred_at: eventTime,
      decision_key: event.decision_key || "",
      profile_key: event.profile_key || "",
      rule_version: event.rule_version ?? null,
      variant_key: event.variant_key || "",
      message_id: event.message_id || "",
      surface: event.surface || "",
      context,
      event: details,
      survey,
      delivery: {
        source: options.source || context.request_source || "dee_client_event",
        endpoint: options.endpoint || "",
        request_id: options.request_id || "",
        delivered_at: new Date().toISOString()
      }
    }
  };
}

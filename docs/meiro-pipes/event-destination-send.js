/**
 * Meiro Pipes Event Destination send function for DEE Next Best Offer.
 *
 * Required secrets:
 * - DEE_URL   e.g. http://dee:8080 or https://dee.internal.example.com
 * - DEE_TOKEN bearer token with evaluate scope
 *
 * Optional params:
 * - decision_key defaults to "next_best_offer"
 */
async function send({ events, params, secrets }) {
  const deeUrl = secrets.DEE_URL;
  const deeToken = secrets.DEE_TOKEN;
  const decisionKey = params.decision_key || "next_best_offer";

  for (const event of events) {
    const profile = event._profile || {};
    const payload = {
      decision_key: decisionKey,
      profile_key: profile.profileKey,
      identifiers: profile.identifiers || [],
      attributes: pickDecisionAttributes(profile.attributes || {}),
      segments: profile.segments || {},
      context: {
        channel: event.event_payload?.channel,
        campaign_id: event.event_payload?.campaign_id,
        request_source: "meiro_pipes_event_destination",
        event_type: event.event_type,
        event_time: event.event_time
      }
    };

    const response = await fetch(`${deeUrl}/v1/evaluate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${deeToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`DEE evaluation failed: ${response.status} ${await response.text()}`);
    }

    const decision = await response.json();

    await fetch(`${secrets.MEIRO_URL}/collect/${secrets.MEIRO_SOURCE_SLUG}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event_type: "decision_result",
        event_time: decision.evaluated_at,
        identifiers: profile.identifiers || [],
        event_payload: {
          decision_key: decision.decision_key,
          profile_key: decision.profile_key,
          result: decision.result,
          rule_version: decision.rule_version,
          outputs: decision.outputs,
          matched_rules: decision.matched_rules,
          errors: decision.errors
        }
      })
    });
  }
}

function pickDecisionAttributes(attributes) {
  const keys = [
    "lead_score",
    "web_engagement_score",
    "interacted_promotions",
    "customer_lifetime_value",
    "monetary_rfm",
    "churn_risk_score",
    "outstanding_balance_tier",
    "late_payments_count_12m",
    "survey_nps_latest",
    "sustainability_score"
  ];
  return Object.fromEntries(keys.map((key) => [key, attributes[key]]).filter(([, value]) => value !== undefined));
}

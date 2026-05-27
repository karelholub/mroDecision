/**
 * Meiro Pipes Profile Destination send function for DEE batch/scheduled NBO.
 *
 * Required secrets:
 * - DEE_URL
 * - DEE_TOKEN
 * - DOWNSTREAM_URL
 * - DOWNSTREAM_TOKEN
 *
 * Optional params:
 * - decision_key defaults to "next_best_offer"
 */
async function send({ profiles, params, secrets }) {
  const deeUrl = secrets.DEE_URL;
  const deeToken = secrets.DEE_TOKEN;
  const decisionKey = params.decision_key || "next_best_offer";

  for (const profile of profiles) {
    const response = await fetch(`${deeUrl}/v1/evaluate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${deeToken}`
      },
      body: JSON.stringify({
        decision_key: decisionKey,
        profile_key: profile.profileKey,
        identifiers: profile.identifiers || [],
        attributes: pickDecisionAttributes(profile.attributes || {}),
        segments: profile.segments || {},
        context: {
          request_source: "meiro_pipes_profile_destination",
          sync_id: params.sync_id
        }
      })
    });

    if (!response.ok) {
      throw new Error(`DEE evaluation failed: ${response.status} ${await response.text()}`);
    }

    const decision = await response.json();

    await fetch(secrets.DOWNSTREAM_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secrets.DOWNSTREAM_TOKEN}`
      },
      body: JSON.stringify({
        profile_key: decision.profile_key,
        eligibility_result: decision.result,
        offer_id: decision.outputs.offer_id,
        offer_tier: decision.outputs.offer_tier,
        promotion_category: decision.outputs.promotion_category,
        suppression_reason: decision.outputs.suppression_reason,
        priority: decision.outputs.priority,
        rule_version: decision.rule_version,
        evaluated_at: decision.evaluated_at
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

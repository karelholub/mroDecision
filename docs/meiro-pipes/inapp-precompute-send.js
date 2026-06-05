/**
 * Meiro Pipes Profile Destination send function for DEE in-app message precompute.
 *
 * Use this when Pipes exports a segment of profiles and DEE should return
 * eligibility plus selected in-app message content for a website surface.
 *
 * Required secrets:
 * - DEE_URL
 * - DEE_TOKEN with client scope
 * - DOWNSTREAM_URL, usually a Meiro collector/profile-update endpoint
 *
 * Optional secrets:
 * - DOWNSTREAM_TOKEN
 *
 * Optional params:
 * - surface defaults to "homepage_hero"
 * - limit defaults to 20 candidate rules per profile
 * - sync_id for downstream traceability
 */
async function send({ profiles, params, secrets }) {
  const deeUrl = String(secrets.DEE_URL || "").replace(/\/$/, "");
  const deeToken = secrets.DEE_TOKEN;
  const downstreamUrl = secrets.DOWNSTREAM_URL;
  const surface = params.surface || "homepage_hero";

  const response = await fetch(`${deeUrl}/v1/client/surface/batch`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${deeToken}`
    },
    body: JSON.stringify({
      surface,
      limit: Number(params.limit || 20),
      context: {
        channel: params.channel || "web",
        request_source: "meiro_pipes_inapp_precompute",
        sync_id: params.sync_id || ""
      },
      profiles: profiles.map(profileToDeeRequest)
    })
  });

  if (!response.ok) {
    throw new Error(`DEE in-app precompute failed: ${response.status} ${await response.text()}`);
  }

  const batch = await response.json();
  if (!downstreamUrl) return;

  for (const result of batch.results || []) {
    await fetch(downstreamUrl, {
      method: "POST",
      headers: downstreamHeaders(secrets),
      body: JSON.stringify(precomputeRecord(result, batch, params))
    });
  }
}

function profileToDeeRequest(profile) {
  return {
    profile_key: profile.profileKey || profile.profile_key || profile.id,
    identifiers: profile.identifiers || [],
    attributes: profile.attributes || {},
    segments: profile.segments || {},
    context: {
      profile_enrichment: "off"
    }
  };
}

function precomputeRecord(result, batch, params) {
  const selected = result.selected || {};
  const outputs = selected.outputs || {};
  const message = outputs.message || {};
  return {
    event_type: "inapp_message_precompute",
    profile_key: result.profile_key,
    surface: result.surface || batch.surface,
    eligible: selected.result === "eligible",
    result: selected.result || (result.error ? "error" : "not_selected"),
    decision_key: selected.decision_key || "",
    rule_version: selected.rule_version || null,
    message_id: outputs.message_id || message.id || "",
    message_content: message.content || outputs.message_content || null,
    message_metadata: message.metadata || null,
    ttl_seconds: selected.ttl_seconds || 0,
    cache_scope: selected.cache_scope || null,
    candidates: result.candidates || [],
    error: result.error || null,
    evaluated_at: selected.evaluated_at || batch.evaluated_at,
    sync_id: params.sync_id || ""
  };
}

function downstreamHeaders(secrets) {
  const headers = { "content-type": "application/json" };
  if (secrets.DOWNSTREAM_TOKEN) headers.authorization = `Bearer ${secrets.DOWNSTREAM_TOKEN}`;
  return headers;
}

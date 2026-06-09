export function profileCacheWithDiagnostics(cache = {}, originalRequest = {}, hydratedRequest = {}, schemaItems = [], errors = []) {
  return {
    ...cache,
    diagnostics: profileEnrichmentDiagnostics(cache, originalRequest, hydratedRequest, schemaItems, errors)
  };
}

export function profileEnrichmentDiagnostics(cache = {}, originalRequest = {}, hydratedRequest = {}, schemaItems = [], errors = []) {
  const originalAttributes = Object.keys(originalRequest.attributes || {});
  const hydratedAttributes = Object.keys(hydratedRequest.attributes || {});
  const originalSegments = Object.keys(originalRequest.segments || {});
  const hydratedSegments = Object.keys(hydratedRequest.segments || {});
  const originalContext = Object.keys(originalRequest.context || {});
  const hydratedContext = Object.keys(hydratedRequest.context || {});
  const schemaByKind = schemaKeysByKind(schemaItems);
  const missingAttributes = missingAttributesFromErrors(errors);
  const enriched = ["hit", "miss"].includes(cache.status);

  return {
    source: enrichmentSourceLabel(cache.status),
    enriched,
    identifier_type: cache.identifier_type || "",
    fields_added: {
      attributes: difference(hydratedAttributes, originalAttributes),
      segments: difference(hydratedSegments, originalSegments),
      context: difference(hydratedContext, originalContext)
    },
    fields_sent_locally: {
      attributes: originalAttributes,
      segments: originalSegments,
      context: originalContext
    },
    hydrated_field_counts: {
      attributes: hydratedAttributes.length,
      segments: hydratedSegments.length,
      context: hydratedContext.length
    },
    missing_required_attributes: missingAttributes,
    schema_drift: {
      profile_attributes_not_in_schema: difference(hydratedAttributes, schemaByKind.attribute).slice(0, 30),
      schema_attributes_missing_from_profile: difference(schemaByKind.attribute, hydratedAttributes).slice(0, 30),
      profile_segments_not_in_schema: difference(hydratedSegments, schemaByKind.segment).slice(0, 30),
      schema_segments_missing_from_profile: difference(schemaByKind.segment, hydratedSegments).slice(0, 30)
    },
    cache_freshness: {
      ttl_seconds: Number(cache.ttl_seconds || 0),
      expires_at: cache.expires_at || null,
      hit: cache.hit === true
    }
  };
}

function schemaKeysByKind(schemaItems = []) {
  const byKind = { attribute: [], segment: [], context: [] };
  for (const item of schemaItems || []) {
    const kind = item.kind || item.type || "";
    const name = item.name || item.key || "";
    if (byKind[kind] && name) byKind[kind].push(String(name));
  }
  return {
    attribute: [...new Set(byKind.attribute)],
    segment: [...new Set(byKind.segment)],
    context: [...new Set(byKind.context)]
  };
}

function missingAttributesFromErrors(errors = []) {
  return [...new Set((errors || [])
    .map((error) => String(error || "").match(/^Missing attribute:\s*(.+)$/)?.[1]?.trim())
    .filter(Boolean))];
}

function difference(left = [], right = []) {
  const rightSet = new Set((right || []).map(String));
  return [...new Set((left || []).map(String).filter((item) => item && !rightSet.has(item)))];
}

function enrichmentSourceLabel(status = "") {
  const labels = {
    disabled: "Enrichment disabled for this request",
    local_payload: "Local payload used; Profile API lookup skipped",
    not_configured: "Profile API not configured or no identifier available",
    hit: "Meiro profile cache hit",
    miss: "Fetched from Meiro Profile API",
    not_found: "No Meiro profile found for this identifier",
    error: "Profile API lookup failed"
  };
  return labels[status] || "Profile enrichment not used";
}

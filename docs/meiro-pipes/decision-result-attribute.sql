-- Example realtime attribute for the latest Next Best Offer decision.
-- Replace <decision_result_event_type_id> with the Meiro event type id.

SELECT
  payload->>'result' AS nbo_result,
  payload->>'rule_version' AS nbo_rule_version,
  payload->'outputs'->>'offer_id' AS nbo_offer_id,
  payload->'outputs'->>'offer_tier' AS nbo_offer_tier,
  payload->'outputs'->>'promotion_category' AS nbo_promotion_category,
  payload->'outputs'->>'suppression_reason' AS nbo_suppression_reason,
  payload->'outputs'->>'priority' AS nbo_priority,
  event_time AS nbo_evaluated_at
FROM events
WHERE event_type_id = '<decision_result_event_type_id>'
  AND payload->>'decision_key' = 'next_best_offer'
ORDER BY event_time DESC
LIMIT 1;

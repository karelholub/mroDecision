# Meiro Pipes Integration Templates

These templates call DEE with the profile attributes used by the `next_best_offer` rule set:

- `lead_score`
- `web_engagement_score`
- `interacted_promotions`
- `customer_lifetime_value`
- `monetary_rfm`
- `churn_risk_score`
- `outstanding_balance_tier`
- `late_payments_count_12m`
- `survey_nps_latest`
- `sustainability_score`

## Event Destination

Use [event-destination-send.js](event-destination-send.js) when a live event should trigger an immediate NBO decision. The function calls `/v1/evaluate` and writes the decision back into Meiro as a `decision_result` synthetic event.

For the current demo environment, Meiro expects decision feedback at:

```text
https://sse-demo.eu1.pipes.meiro.io/collect/decision-engine-feedback
```

## Profile Destination

Use [profile-destination-send.js](profile-destination-send.js) for scheduled audience/profile syncs. The function calls `/v1/evaluate` for each exported profile and forwards a compact result downstream.

## UI Templates

The embedded DEE UI includes an Integration tab that generates a ready-to-copy request template from the saved Meiro and DEE runtime settings. Use it after creating an evaluate-only API token in Settings.

The Settings > Meiro section stores the Meiro base URL, source slug, Profile API URL/token, explicit feedback endpoint, and environment label. It also includes connection tests and a recent delivery status table so operators can confirm whether Profile API, collector, and feedback webhook calls are accepted.

## Attribute Storage

Use [decision-result-attribute.sql](decision-result-attribute.sql) as a starting point for a realtime attribute that stores the latest `next_best_offer` decision on the profile.

## Expected DEE Response

```json
{
  "decision_key": "next_best_offer",
  "profile_key": "profile-123",
  "evaluated_at": "2026-05-27T00:00:00.000Z",
  "rule_version": 1,
  "result": "eligible",
  "outputs": {
    "offer_id": "solar_green_energy",
    "offer_tier": "premium",
    "promotion_category": "green_energy",
    "suppression_reason": null,
    "priority": 80
  },
  "matched_rules": ["green_energy_offer"],
  "errors": []
}
```

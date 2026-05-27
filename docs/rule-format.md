# Rule Format

DEE stores each rule set as a draft plus immutable published versions.

## Basic Branches

```json
{
  "name": "Loan eligibility",
  "decision_key": "loan_eligibility",
  "fallback": {
    "result": "ineligible",
    "outputs": { "reason": "no_branch_matched" }
  },
  "branches": [
    {
      "id": "vip_check",
      "label": "VIP and revenue threshold",
      "when": {
        "all": [
          { "source": "segment", "key": "vip_customers", "operator": "equals", "value": true },
          { "source": "attribute", "key": "lifetime_revenue", "operator": "greater_than_or_equal", "value": 5000 }
        ]
      },
      "result": "eligible",
      "outputs": {
        "offer_id": "solar_green_energy",
        "offer_tier": "=lookup(\"offer_tiers\", \"solar_green_energy\", \"offer_tier\")"
      }
    }
  ]
}
```

Condition groups support `all`, `any`, and `not`. Leaf conditions support:

- `equals`
- `not_equals`
- `greater_than`
- `greater_than_or_equal`
- `less_than`
- `less_than_or_equal`
- `in`
- `not_in`
- `contains`
- `not_contains`
- `is_blank`
- `is_not_blank`
- `matches_regex`
- `within_last_days`
- `before_date`
- `after_date`

Sources are `attribute`, `segment`, `context`, and `score`.

Output values beginning with `=` are evaluated as safe expressions. This is the preferred way to enrich a decision from lookup tables while keeping rule branches readable.

## Advanced Graph

```json
{
  "graph": {
    "entry": "input",
    "nodes": [
      { "id": "input", "type": "input", "next": "score" },
      {
        "id": "score",
        "type": "score",
        "label": "credit_score",
        "rules": [
          { "when": "attribute(\"account_age_days\") >= 365", "points": 20 }
        ],
        "next": "condition"
      },
      {
        "id": "condition",
        "type": "condition",
        "expression": "score(\"credit_score\") >= 20",
        "true": "eligible",
        "false": "fallback"
      },
      { "id": "eligible", "type": "output", "result": "eligible" },
      { "id": "fallback", "type": "output", "result": "deferred" }
    ]
  }
}
```

Expression functions:

- `attribute("name")`
- `segment("name")`
- `context("name")`
- `score("label")`
- `days_since(attribute("timestamp"))`
- `lookup("table_id", key, "column")`

The expression parser is a small safe parser. It does not use JavaScript `eval`.

## Experiment Metadata

Rule sets with `"type": "experiment"` can define deterministic variant allocation in `metadata.experiment`. Variant weights must sum to 100.

```json
{
  "type": "experiment",
  "cache_policy": {
    "client_ttl": 300,
    "scope": "profile"
  },
  "metadata": {
    "experiment": {
      "unit": "profile",
      "variants": [
        { "key": "control", "weight": 50, "outputs": { "banner": "current" } },
        { "key": "treatment", "weight": 50, "outputs": { "banner": "new" } }
      ]
    }
  }
}
```

`POST /v1/client/evaluate` returns the selected variant and merges the variant outputs into the decision outputs. For QA, pass `context.force_variant` to force a configured variant key.

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

Leaf conditions can compare to either a literal `value` or another profile/context field with `value_source`:

```json
{
  "source": "attribute",
  "key": "requested_amount",
  "operator": "less_than_or_equal",
  "value_source": { "source": "attribute", "key": "approved_limit" }
}
```

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

The UI includes a first-pass advanced graph editor for these nodes. Switch the Draft Editor to `Advanced graph`, create a template or add nodes, then wire routes with `next`, `true`, `false`, and `capped`. The service validates that every route points to an existing node, the entry node exists, reachable paths terminate in an output/fallback/error node, and no nodes are unreachable. Evaluation responses include a `trace` array, and the Evaluate panel renders it as a matched graph path.

### Frequency Cap Nodes

Graph rules can use `frequency_cap` nodes to suppress a path when the profile has already received enough client events in a time window. The first implementation counts stored `impression` events.

```json
{
  "id": "cap_hero_message",
  "type": "frequency_cap",
  "max": 3,
  "window_days": 7,
  "message_id": "hero_offer",
  "surface": "homepage",
  "output_key": "hero_impressions",
  "next": "show_message",
  "capped": "fallback"
}
```

The node continues to `next` when the event count is below `max`, otherwise it continues to `capped`. `output_key` is optional and stores the current count in context for downstream expressions.

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

`cache_policy.client_ttl` enables in-process caching for client responses. Supported scopes are `profile`, `session`, `global`, and `request`. `session` uses `context.session_id` when present, while `request` includes the full request payload in the cache key.

After rendering a message or exposing an experiment variant, clients can send feedback events to `POST /v1/client/impression` and `POST /v1/client/exposure`. Include `decision_key`, `profile_key`, and any available `rule_version`, `variant_key`, `message_id`, `surface`, or `context` values.

For in-app messages, store reusable content in the message library and return `outputs.message_id` from the rule. `POST /v1/client/evaluate` expands active library content into `outputs.message`, and optional `outputs.message_content` values override the library defaults for that decision.

Clients can call `POST /v1/client/surface` with a `surface` and profile payload to evaluate all published `inapp_message` rules for that surface. The response returns the highest-priority eligible result as `selected` plus a compact candidate list for observability.

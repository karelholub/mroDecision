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

The UI includes a first-pass advanced graph editor for these nodes. Switch the Draft Editor to `Advanced graph`, create a template or add nodes, drag nodes on the canvas if you want a clearer layout, then wire routes with `next`, `true`, `false`, and `capped`. Drag positions are saved as node `layout` metadata and do not affect evaluation. The service validates that every route points to an existing node, the entry node exists, reachable paths terminate in an output/fallback/error node, and no nodes are unreachable. Evaluation responses include a `trace` array, and the Evaluate panel renders it as a matched graph path.

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

`POST /v1/client/evaluate` returns the selected variant and merges the variant outputs into the decision outputs. For QA, pass `context.force_variant` to force a configured variant key. Pass `context.force_holdout: true` or `context.forced_holdouts[decision_key]: true` to force a no-variant holdout response; the response includes `experiment.holdout: true`.

For production website calls, prefer sending a stable identifier plus request context instead of sending every profile attribute from the browser. When Meiro Profile API settings are configured, sparse client requests are enriched before evaluation:

```json
{
  "decision_key": "homepage_hero",
  "profile_key": "karel.holub@meiro.io",
  "identifiers": [{ "typeId": "email", "value": "karel.holub@meiro.io" }],
  "attributes": {},
  "segments": {},
  "context": {
    "channel": "web",
    "surface": "homepage_hero",
    "profile_enrichment": "always"
  }
}
```

Normal request context such as `channel`, `surface`, `page_url`, and `session_id` is merged with the fetched Meiro profile and does not suppress enrichment. If you intentionally want to evaluate only a local payload, set `context.profile_enrichment` or `context.enrich_profile` to `"off"` or `false`.

`cache_policy.client_ttl` enables in-process caching for client responses. Supported scopes are `profile`, `session`, `global`, and `request`. `session` uses `context.session_id` when present, while `request` includes the full request payload in the cache key.

After rendering a message, exposing an experiment variant, or recording an outcome, clients can send feedback events to `POST /v1/client/impression`, `POST /v1/client/exposure`, and `POST /v1/client/conversion`. Include `decision_key`, `profile_key`, and any available `rule_version`, `variant_key`, `message_id`, `surface`, `context`, or conversion `event` details.

For in-app messages, store reusable content in the message library and return `outputs.message_id` from the rule. `POST /v1/client/evaluate` expands active library content into `outputs.message`, and optional `outputs.message_content` values override the library defaults for that decision.

Clients can call `POST /v1/client/surface` with a `surface` and profile payload to evaluate all published `inapp_message` rules for that surface. The response returns the highest-priority eligible result as `selected` plus a compact candidate list for observability.

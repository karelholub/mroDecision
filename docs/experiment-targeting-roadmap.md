# Experiment Targeting and Delivery Settings Roadmap

This spec evaluates common web-experiment settings from another platform and translates the useful parts into DEE product requirements. DEE should keep server-side decision logic as the source of truth, while the Web SDK handles browser-only facts such as current URL, session state, page variables, data-layer events, and display frequency.

## Current DEE Coverage

- Audience: partially covered by rule conditions over attributes, segments, and context.
- Conversion goal: partially covered by `metadata.experiment.goal.event`, reporting, lift, confidence, and winner guidance.
- Schedule: partially covered by `metadata.experiment.schedule` for planning and freeze warnings.
- Variants: covered by fixed split, forced QA variants, holdouts, and guarded bandit mode.
- Surfaces: covered by rule `surface`, SDK placements, and client feedback surface metadata.
- Feedback: covered by exposure, impression, and conversion endpoints.

## Recommended Additions

### 1. Audience Builder for Experiments

Value: high.

Product behavior:
- Add an experiment-level Audience section that reuses the rule condition builder but labels the conditions as "eligible audience".
- Support saved/reusable audience blocks backed by synced Meiro attributes, segments, and context keys.
- Show estimated eligible profile counts when Meiro segment/profile APIs can provide them; otherwise show "not estimated".
- Keep the underlying implementation as normal DEE rule conditions so runtime evaluation remains generic.

Data model:

```json
{
  "metadata": {
    "experiment": {
      "audience": {
        "mode": "rule_conditions",
        "description": "Returning high-intent visitors",
        "condition_block_ids": ["high_intent"],
        "estimated_profiles": null
      }
    }
  }
}
```

SDK impact: none required beyond continuing to send attributes, segments, and context. The SDK may expose a helper to add page context into `context` before evaluation.

### 2. Consent or Category Requirement

Value: high for regulated customers; medium where consent is not used.

Product behavior:
- Add an optional consent/category gate for experiments and messages.
- If configured, DEE should suppress the experiment unless the request context includes a matching consent/category signal.
- If consent is not configured for a customer, show Campaign/Folder grouping instead of consent in the UI.

Data model:

```json
{
  "metadata": {
    "experiment": {
      "consent": {
        "required": true,
        "category": "personalization",
        "missing_result": "suppressed"
      }
    }
  }
}
```

SDK impact:
- Add `consentProvider` option returning consent categories.
- Include consent in `context.consent`.

```js
DEEWebSDK.createClient({
  consentProvider: () => ({ personalization: true, marketing: false })
});
```

### 3. Conversion Goal Enhancements

Value: high.

Product behavior:
- Extend the current goal field with attribution window, goal type, optional value/revenue field, and primary/secondary goals.
- Use the primary goal for winner recommendations and bandit optimization.
- Keep secondary goals report-only.

Data model:

```json
{
  "metadata": {
    "experiment": {
      "goal": {
        "event": "purchase",
        "type": "conversion",
        "attribution_window_hours": 168,
        "value_field": "event.revenue",
        "secondary_events": ["add_to_cart", "signup"]
      }
    }
  }
}
```

SDK impact:
- Add `trackConversion(name, decisionOrPlacement, event)` helper so websites can send named conversion events with optional value fields.
- Keep click-to-conversion as the default convenience behavior for links.

### 4. Display Frequency Policy

Value: very high for web placements.

Product behavior:
- Add Display setting with `always`, `once`, and `once_per_session`.
- Define event semantics clearly:
  - `always`: evaluate and render whenever placement initializes.
  - `once_per_session`: render once per browser session for the profile, decision key, and placement.
  - `once`: render once for the profile, decision key, and placement until the experiment changes version or the policy is reset.
- Store display policy in experiment/message metadata and expose it in client responses.

Data model:

```json
{
  "metadata": {
    "experiment": {
      "display": {
        "mode": "once_per_session",
        "reset_on_version_change": true
      }
    }
  }
}
```

SDK impact:
- Add local/session storage display ledger keyed by profile, decision key, placement, variant, and rule version.
- Skip rendering and exposure feedback when display policy says the visitor has already seen it.
- Dispatch `dee:skipped` with reason `display_policy`.

### 5. URL Targeting

Value: high.

Product behavior:
- Add "Show on" URL rules with include/exclude matchers.
- Support exact, contains, starts-with, and regex patterns.
- Validate regex and show preview against sample URLs in the UI.
- DEE should also accept URL targeting in server evaluation for SSR/edge use cases.

Data model:

```json
{
  "metadata": {
    "experiment": {
      "targeting": {
        "url_rules": [
          { "mode": "include", "operator": "starts_with", "value": "https://example.com/offers" },
          { "mode": "exclude", "operator": "contains", "value": "preview=true" }
        ]
      }
    }
  }
}
```

SDK impact:
- Evaluate URL rules before calling DEE when rules are embedded in placement config.
- Always send `context.page_url`, `context.path`, `context.query`, and `context.referrer`.

### 6. Page Variables Targeting

Value: high for ecommerce and content sites.

Product behavior:
- Add a Project Variables catalog in Settings with variable keys, source type, and expected data type.
- Experiment targeting can require variables such as `product_category = shoes`, `cart_value > 100`, or `logged_in = true`.
- Variables are sent as `context.page_vars` so normal rule conditions can use them.

Data model:

```json
{
  "settings": {
    "web_targeting_variables": [
      { "key": "product_category", "source": "dataLayer.product.category", "type": "string" },
      { "key": "cart_value", "source": "window.app.cart.total", "type": "number" }
    ]
  }
}
```

SDK impact:
- Add `pageVariables` option supporting functions and path descriptors.
- Include collected variables under `context.page_vars`.

```js
DEEWebSDK.createClient({
  pageVariables: {
    product_category: () => window.dataLayer?.product?.category,
    cart_value: "app.cart.total"
  }
});
```

### 7. Target Devices

Value: medium-high.

Product behavior:
- Add device targeting with `any`, `desktop`, `tablet`, `mobile`, and optional custom breakpoints.
- Show the selected device targeting in experiment inventory and detail.
- Keep device as context so customer-specific definitions can be overridden.

Data model:

```json
{
  "metadata": {
    "experiment": {
      "targeting": {
        "devices": ["desktop", "mobile"]
      }
    }
  }
}
```

SDK impact:
- Add device detection and send `context.device_type`, `context.viewport_width`, and `context.viewport_height`.

### 8. Trigger Model

Value: high for advanced web personalization.

Product behavior:
- Add trigger options:
  - `page_load` default.
  - `dom_ready`.
  - `data_layer_event`.
  - `custom_event`.
  - `manual`.
- For event triggers, allow a named event and optional payload filters.
- Show trigger in experiment detail and SDK installation snippets.

Data model:

```json
{
  "metadata": {
    "experiment": {
      "trigger": {
        "type": "data_layer_event",
        "event": "product_viewed",
        "filters": [
          { "key": "category", "operator": "equals", "value": "flights" }
        ]
      }
    }
  }
}
```

SDK impact:
- Add trigger registry and delayed evaluation.
- For data-layer triggers, listen to configured event names and call `evaluatePlacement` only when the trigger matches.
- Expose manual API:

```js
dee.evaluatePlacement(document.querySelector("[data-dee-placement='hero']"), {
  context: { trigger_event: "product_viewed" }
});
```

### 9. JavaScript Conditions

Value: medium, but high risk.

Recommendation:
- Do not store arbitrary JavaScript in DEE or execute remotely authored JS in the SDK.
- Instead, support named website-owned predicates registered in SDK configuration.
- Experiment metadata references a predicate key, and the SDK calls only locally registered functions.

Data model:

```json
{
  "metadata": {
    "experiment": {
      "targeting": {
        "sdk_conditions": ["has_search_results", "cart_is_not_empty"]
      }
    }
  }
}
```

SDK impact:
- Add `conditions` option and include condition results in `context.sdk_conditions`.
- Skip evaluation or rendering when a required SDK condition fails.

```js
DEEWebSDK.createClient({
  conditions: {
    cart_is_not_empty: () => window.app.cart.items.length > 0
  }
});
```

## Priority Recommendation

1. Display Frequency Policy.
2. URL Targeting.
3. Trigger Model.
4. Page Variables Targeting.
5. Consent or Category Requirement.
6. Conversion Goal Enhancements.
7. Target Devices.
8. Audience Builder polish.
9. Named SDK Conditions.

## SDK Roadmap Summary

Implemented first pass:
- Server-side rule-set validation accepts experiment `goal`, `schedule`, `display`, `consent`, `targeting`, and `trigger` metadata.
- Client evaluate responses include `delivery` hints with display, targeting, trigger, consent, and goal settings.
- The Web SDK sends page URL/path/query/referrer, device context, page variables, consent values, named condition results, placement, surface, and trigger payload context.
- The Web SDK supports local placement prechecks for URL rules, devices, and named SDK conditions.
- The Web SDK supports page-load, DOM-ready, data-layer event, custom-event, and manual triggers.
- The Web SDK applies response-level URL/device/condition/consent/display policies before rendering.
- The Web SDK records `once` and `once_per_session` display ledgers when browser storage is available and dispatches `dee:skipped` when rendering is suppressed.
- The Web SDK exposes `trackConversion(name, placementOrDecision, event)` and keeps automatic link-click conversion tracking.

Remaining product/UI work:
- Add a Settings catalog for page variables and named SDK conditions.
- Add conversion-goal reporting by attribution window and value field.
- Add richer schedule enforcement and calendar visibility.
- Add audience-count estimation where Meiro APIs can support it.

Implemented UI follow-up:
- The rule-set experiment workbench now has form controls for display frequency, display reset behavior, target devices, URL include/exclude rules, named SDK conditions, trigger type/event, consent requirement/category, goal type, attribution window, and value field.
- URL include/exclude rules now have an in-editor preview against sample URLs, showing whether each page would show or suppress the experiment before publish.
- Publish and inspector warnings include delivery, targeting, trigger, and consent issues, plus active-experiment freeze warnings when those settings change while running.

These SDK additions should remain backward compatible. Existing placements that only use `data-dee-placement` and `data-dee-decision-key` should continue evaluating on page load and rendering with fallback behavior unchanged.

# DEE Web SDK

`dee-web-sdk.js` is a dependency-free browser helper for rendering DEE decisions into declared website placements.

It follows the recommended production pattern:

- the website owns the placement and fallback markup
- DEE returns structured decision outputs
- the SDK replaces the placement only after a valid eligible response
- impression, exposure, and conversion feedback are sent with the assigned variant and message metadata
- QA can force variants with `?dee_force_variant=control`

## Basic Setup

```html
<script src="/path/to/dee-web-sdk.js"></script>
<script>
  const dee = DEEWebSDK.createClient({
    baseUrl: "https://your-dee.example.com",
    token: "client-token-with-client-scope",
    debug: true
  });

  dee.init();
</script>
```

By default the SDK sends an `impression` event after a placement renders. Experiment variants still send `exposure` when `autoExposure` is enabled. Interruptive message templates (`modal`, `toast`, and `alert`) render an accessible dismiss button; dismissals are sent as `conversion` events with `event.name: "dismiss"` and are stored in browser storage according to the message dismiss policy (`suppress`, `cooldown`, or `ignore`).

## Carousel Placement

Keep static fallback content in the page. If DEE fails or returns no renderable cards, the fallback remains visible.

```html
<div
  class="meiro-banner"
  data-dee-placement="homepage_offer_carousel"
  data-dee-decision-key="flyin_homepage_offers"
  data-dee-template="offer_carousel"
>
  <div class="meiro-banner-track" data-dee-track>
    <a href="https://www.flyin.com/en/offers/exclusive-discounts-to-abu-dhabi" class="meiro-banner-item">
      <img src="https://ui.cltp.co/offers-ui/OfferPages/offers/cms/abu-dhabi.png" alt="Exclusive Discounts to Abu Dhabi">
      <p>Save up to 15% on your trip!</p>
    </a>
  </div>
</div>
```

The default card renderer expects:

```json
{
  "outputs": {
    "template": "offer_carousel",
    "cards": [
      {
        "title": "Dubai flight, hotel and package deals",
        "url": "https://www.flyin.com/en/offers/special-discounts-on-trips-to-dubai",
        "image_url": "https://ui.cltp.co/flyin/prod/merchandising/upload_5a8985aedd1a62dcd0497b1416ec5188.jpg",
        "alt": "Special Discounts on Trips to Dubai"
      }
    ]
  }
}
```

## QA

Force a variant without code changes:

```text
https://www.example.com/?dee_force_variant=destination_focus
```

Or force it on a single placement:

```html
<div data-dee-force-variant="control" ...>
```

## Custom Renderers

```html
<script>
  const dee = DEEWebSDK.createClient({
    baseUrl: "https://your-dee.example.com",
    token: "client-token",
    renderers: {
      hero_banner(element, decision) {
        element.querySelector("h1").textContent = decision.outputs.headline;
        element.querySelector("a").href = decision.outputs.cta_url;
        return true;
      }
    }
  });

  dee.init();
</script>
```

Return `false` from a renderer to keep the original fallback content and skip exposure tracking.

## In-Page Web Layers

DEE can render vendor-style in-page blocks such as store selectors, banners, embedded surveys, or custom offer panels. The website still declares the placement; DEE returns the fragment.

```html
<div
  data-dee-placement="store_selector_weblayer_cz"
  data-dee-decision-key="store_selector_weblayer_cz"
  data-dee-template="web_layer"
>
  <div>Vyberte prodejnu</div>
</div>
```

Decision output:

```json
{
  "outputs": {
    "template": "web_layer",
    "html": "<div id=\"dee-store-selector\" class=\"dee-store-selector\" data-dee-select><div class=\"dee-store-title\">Vyberte si svou prodejnu</div><button type=\"button\" class=\"dee-select-trigger\" data-dee-select-trigger><span data-dee-select-value>Vyberte prodejnu</span></button><div class=\"dee-select-dropdown\" data-dee-select-dropdown><input data-dee-select-search placeholder=\"Hledat pobočku...\"><ul><li data-dee-select-option data-dee-conversion=\"store_selected\" data-dee-value=\"Brno\">Brno</li><li data-dee-select-option data-dee-conversion=\"store_selected\" data-dee-value=\"Praha - Čakovice\">Praha - Čakovice</li></ul></div><div data-dee-success hidden>Vaše volba byla uložena</div></div>",
    "css": ".dee-store-selector{padding:16px;border:1px solid #d8dee8;border-radius:8px;background:#fff}.dee-select-dropdown[hidden]{display:none}.dee-select-trigger{width:100%;text-align:left}.dee-store-title{font-weight:700;margin-bottom:8px}"
  }
}
```

Supported template aliases are `html_fragment`, `web_layer`, `weblayer`, and `inpage`.

The SDK sanitizes HTML fragments before rendering:

- removes `script`, `iframe`, `object`, `embed`, `form`, `link`, `meta`, and `base`
- removes inline `on*` event attributes
- removes `javascript:` URLs
- blocks CSS containing `@import` or `javascript:`

For interactive fragments, prefer data attributes instead of remote JavaScript:

- `data-dee-select` marks a built-in dropdown/select component.
- `data-dee-select-trigger`, `data-dee-select-dropdown`, `data-dee-select-search`, `data-dee-select-value`, and `data-dee-select-option` wire basic select behavior.
- `data-dee-success` is shown after an option is selected.
- `data-dee-conversion="event_name"` sends a conversion event when clicked.
- `data-dee-value` supplies the conversion value.

## Structured DOM Modifications

For visual-editor-style web experiments, DEE can return selector-based modifications instead of a full HTML fragment. Use this when the website owns the base markup and DEE should adjust specific text, attributes, styles, inserted blocks, movement, or visibility.

```html
<section
  data-dee-placement="homepage_dom_modifications"
  data-dee-decision-key="homepage_dom_experiment"
  data-dee-template="dom_modifications"
>
  <h2 data-demo-selector="headline">Fallback headline</h2>
  <p data-demo-selector="body">Fallback body.</p>
  <div data-demo-selector="insert-target"></div>
</section>
```

Decision output:

```json
{
  "outputs": {
    "template": "dom_modifications",
    "modifications": [
      {
        "id": "headline",
        "type": "change_text",
        "selector": "[data-demo-selector='headline']",
        "value": "Member-only travel deals are live"
      },
      {
        "id": "cta_link",
        "type": "change_attribute",
        "selector": "[data-demo-selector='cta'] a",
        "attribute": "href",
        "value": "/offers/member-prices"
      },
      {
        "id": "highlight_trust",
        "type": "change_style",
        "selector": "[data-demo-selector='trust']",
        "styles": {
          "backgroundColor": "#effbf8",
          "borderColor": "#0f8f81"
        }
      },
      {
        "id": "proof_block",
        "type": "insert_html",
        "selector": "[data-demo-selector='insert-target']",
        "position": "replace",
        "html": "<strong>4.8/5 customer rating</strong><p>Updated by DEE with sanitized HTML.</p>"
      }
    ]
  }
}
```

Supported modification types:

- `change_text`: sets `textContent`.
- `change_attribute`: updates safe attributes such as `href`, `src`, `alt`, `aria-*`, and `data-*`.
- `change_style`: updates an allowlisted set of visual CSS properties.
- `insert_html`: inserts sanitized HTML at `replace`, `before`, `after`, `first_child`, or `last_child`.
- `remove`: removes, hides, or preserves the space of a selected element.
- `move`: moves a source selector relative to a target selector.

The SDK dispatches `dee:decision` with `detail.diagnostics` and also emits `dee:modifications` after applying this renderer. Exposure is sent only when at least one modification applies.

## Experiment Targeting

The SDK sends browser context with every evaluation:

- `context.page_url`, `path`, `query`, and `referrer`
- `context.device_type`, `viewport_width`, and `viewport_height`
- `context.page_vars` from configured page variables
- `context.consent` from a synchronous consent provider
- `context.sdk_conditions` from website-owned predicates

```html
<script>
  const dee = DEEWebSDK.createClient({
    baseUrl: "https://your-dee.example.com",
    token: "client-token",
    consentProvider: () => ({ personalization: true, marketing: false }),
    pageVariables: {
      product_category: "app.product.category",
      cart_value: () => window.app?.cart?.total || 0
    },
    conditions: {
      cart_is_not_empty: () => (window.app?.cart?.items || []).length > 0
    }
  });
</script>
```

Placements can also define local prechecks before calling DEE:

```html
<div
  data-dee-placement="homepage_offer_carousel"
  data-dee-decision-key="flyin_homepage_offers"
  data-dee-devices="desktop,mobile"
  data-dee-conditions="cart_is_not_empty"
  data-dee-url-rules='[
    { "mode": "include", "operator": "contains", "value": "/offers" },
    { "mode": "exclude", "operator": "contains", "value": "preview=true" }
  ]'
></div>
```

Server responses can include `delivery.display`, `delivery.targeting`, `delivery.trigger`, `delivery.consent`, and `delivery.goal`. Message decisions can also return `outputs.delivery.message` and `outputs.message.delivery`; the SDK applies those hints after the decision returns, keeps fallback content when a postcheck fails, and dispatches `dee:skipped` with the reason.

## In-App Messages

When a rule returns `message_id`, DEE attaches the message content and normalized delivery policy:

```json
{
  "outputs": {
    "message_id": "homepage_banner",
    "message": {
      "id": "homepage_banner",
      "content": {
        "template_type": "banner",
        "title": "Welcome back",
        "body": "Your personalized offer is ready.",
        "ctas": [{ "label": "View offer", "url": "/offers", "style": "primary" }]
      },
      "delivery": {
        "display": { "mode": "once_per_day" },
        "frequency": { "cooldown_seconds": 86400, "max_impressions": 3 },
        "targeting": { "devices": "desktop" },
        "trigger": { "type": "page_load" },
        "consent": { "category": "marketing", "required": true },
        "dismiss": { "behavior": "suppress" }
      }
    }
  }
}
```

The SDK includes a default `message` renderer for banner, alert, modal, inline, and toast-style content. If `outputs.message` is present and no explicit template is returned, the SDK uses the message renderer automatically. Message delivery policies share the same post-decision checks as experiments, including consent, device targeting, and browser-side display frequency.

Survey messages can be question-first. A `survey` payload does not need title or body text as long as it contains `questions`, nested `survey.questions`, or `question`:

```json
{
  "message_id": "homepage_survey",
  "template": "survey",
  "message_content": {
    "template_type": "survey",
    "questions": [
      {
        "label": "How useful is this offer?",
        "tracking_name": "survey_usefulness",
        "options": ["Low", "Medium", "High"]
      }
    ]
  }
}
```

Survey option clicks are sent as conversion events with `event.type: "survey_response"`, `event.survey_question`, `event.survey_question_label`, `event.survey_value`, and `event.value`. Free-text survey questions render a textarea plus a submit button and send the entered response through the same event fields. Required free-text questions are blocked client-side until the visitor enters an answer. After a successful response, the SDK marks the selected answer and shows a compact acknowledgement. When DEE accepts the conversion, it also forwards an `inapp_survey_response` event to the configured Meiro collector or feedback endpoint so Pipes can store the answer in profile attributes.

Message experiments can return inline variant content without creating a separate message record for every variant. The SDK treats `message_content`, `message_id`, and `message_variant` as a message render target even when `outputs.template` is a concrete message template such as `banner`, `modal`, or `card`:

```json
{
  "decision_key": "homepage_message_test",
  "result": "eligible",
  "outputs": {
    "message_id": "homepage_banner",
    "message_variant": "value_framing",
    "template": "banner",
    "message_content": {
      "template_type": "banner",
      "title": "A tailored offer is ready",
      "body": "Available for a limited time based on your current profile.",
      "ctas": [{ "label": "View my offer", "url": "/offers", "style": "primary", "tracking_name": "message_click" }]
    }
  },
  "experiment": {
    "variant_key": "value_framing"
  }
}
```

Exposure, click, and conversion feedback uses the experiment `variant_key` when present and also includes `message_variant` in the event/context payload so message-content experiments can be analyzed from both experiment and message views.

## Triggers

Placements evaluate on page load by default. Use trigger attributes for delayed or manual activation:

```html
<div
  data-dee-placement="product_detail"
  data-dee-decision-key="product_detail_experiment"
  data-dee-trigger-type="data_layer_event"
  data-dee-trigger-event="product_viewed"
></div>
```

Supported trigger types are `page_load`, `dom_ready`, `data_layer_event`, `custom_event`, and `manual`. For data-layer triggers, set `data-dee-data-layer` or the client-level `dataLayerName` option when the site does not use `window.dataLayer`.

Manual evaluation stays available:

```js
dee.evaluatePlacement(document.querySelector("[data-dee-placement='product_detail']"), {
  context: { trigger_event: "manual_preview" }
});
```

## Display Policy

DEE can return display policies in experiment metadata:

- `always`: render whenever the placement evaluates
- `once_per_session`: render once per browser session
- `once`: render once per profile, decision key, placement, variant, and version
- `once_per_day`: render once per local 24-hour window
- `once_per_week`: render once per local 7-day window

The SDK uses browser storage when available. If storage is blocked, rendering still works and only the frequency ledger is skipped.

## Conversion Tracking

Clicks on links inside rendered placements automatically send a `conversion` event named `click`. Send named conversions explicitly when the site has a stronger event:

```js
dee.trackConversion("purchase", document.querySelector("[data-dee-placement='homepage_offer_carousel']"), {
  revenue: 129.9,
  currency: "USD"
});
```

## Notes

- Use client-scoped tokens, ideally restricted to the relevant decision keys, browser origins, environment, and app id.
- Configure `DEE_CORS_ORIGINS` to allow the website origin.
- Keep images and links in structured outputs rather than raw HTML.
- Use server-side or edge-side decisioning for critical first-paint experiences where flicker is unacceptable.

# DEE Web SDK

`dee-web-sdk.js` is a dependency-free browser helper for rendering DEE decisions into declared website placements.

It follows the recommended production pattern:

- the website owns the placement and fallback markup
- DEE returns structured decision outputs
- the SDK replaces the placement only after a valid eligible response
- exposure and conversion feedback are sent with the assigned variant
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

Server responses can include `delivery.display`, `delivery.targeting`, `delivery.trigger`, `delivery.consent`, and `delivery.goal`. The SDK applies those hints after the decision returns, keeps fallback content when a postcheck fails, and dispatches `dee:skipped` with the reason.

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

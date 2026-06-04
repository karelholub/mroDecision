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

## Notes

- Use client-scoped tokens, ideally restricted to the relevant decision keys, browser origins, environment, and app id.
- Configure `DEE_CORS_ORIGINS` to allow the website origin.
- Keep images and links in structured outputs rather than raw HTML.
- Use server-side or edge-side decisioning for critical first-paint experiences where flicker is unacceptable.

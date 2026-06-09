# Visual Experiment Editor Roadmap

This roadmap translates useful patterns from Bloomreach Engagement's experiments editor into DEE product requirements. Their editor is an inline visual editor that opens directly on the customer's website and lets marketers select and modify page elements without writing code. DEE should support the same marketer workflow while keeping DEE's safer decision-engine model: explicit placements, validated mutations, SDK rendering guardrails, draft-only editing, and normal publish controls.

Source reviewed: https://documentation.bloomreach.com/engagement/docs/experiments-editor

## Product Goal

Let marketers create and preview web experiments by selecting real page elements, defining variant modifications, and saving those modifications back into DEE as structured experiment outputs. The editor should feel visual and immediate, but runtime execution should remain deterministic, auditable, and safe.

## Useful Patterns To Adopt

### 1. Inline Website Editor

Add an "Open Visual Editor" action from an experiment rule set.

Behavior:
- Opens the configured website URL with a DEE editor overlay.
- Loads the DEE SDK in editor mode.
- Lets the user browse to another page without leaving editor mode.
- Shows a persistent toolbar with variant, selector, preview, undo/redo, modification list, and save controls.

DEE-specific implementation:
- Use a signed short-lived editor token scoped to one draft rule set.
- The browser overlay can run from a static DEE editor bundle injected by snippet, bookmarklet, or proxy/editor URL.
- Saving from the website should write only draft modifications, never publish directly.

### 2. Variant Selector With Immutable Control

Adopt a clear variant switcher.

Behavior:
- Every experiment has a Control variant representing the untouched website.
- Control cannot be edited or deleted.
- Users can create, duplicate, rename, delete, and switch treatment variants.
- The current variant determines which modification set is visible in the editor.

DEE data model sketch:

```json
{
  "metadata": {
    "experiment": {
      "variants": [
        { "key": "control", "weight": 50, "baseline": true, "outputs": {} },
        {
          "key": "treatment",
          "weight": 50,
          "outputs": {
            "template": "dom_modifications",
            "modifications": []
          }
        }
      ]
    }
  }
}
```

### 3. Modification List

Add a right-side modification inventory.

Behavior:
- Lists all modifications in the current variant.
- Shows selector, modification type, short summary, personalization flag, and risk badge.
- Hover highlights the affected page element.
- Clicking reopens the relevant editor panel.
- Deleting a modification restores fallback behavior for that selector.

This solves the "where did I change things?" problem and keeps complex experiments maintainable.

### 4. Selector Picker And Selector Quality

Add element selection and selector generation.

Behavior:
- Click an element to select it.
- Shift-click supports multi-select.
- User can move selection to parent/child/similar element.
- Editor generates a CSS selector and allows manual override.
- User must confirm edited selectors.

DEE guardrails:
- Show selector quality: unique on current page, multiple matches, no matches, unstable path, page-filter recommended.
- Prefer `id`, `data-*`, and stable classes over brittle nth-child paths.
- Warn that selectors are page-local unless URL targeting is configured.
- Require page URL targeting for broad selectors.

### 5. Modification Types

Support a structured modification model before allowing raw HTML.

Initial modification types:
- `change_text`: update text content.
- `change_attribute`: update link URL, image source, alt text, ARIA label, or data attribute.
- `change_style`: update allowed CSS properties such as color, background, font size, spacing, border, display.
- `insert_html`: insert guarded HTML/web-layer fragment.
- `move`: move selected node before, after, first child, or last child of another selector.
- `remove`: hide or remove an element with collapse/preserve-space option.

Data model sketch:

```json
{
  "template": "dom_modifications",
  "modifications": [
    {
      "id": "mod_hero_title",
      "type": "change_text",
      "selector": "#homepage-hero h1",
      "value": "Book your next city break with member pricing",
      "scope": { "url_rules": [{ "mode": "include", "operator": "contains", "value": "/offers" }] }
    }
  ]
}
```

### 6. Code / HTML Editing

DEE already has guarded in-page web-layer rendering. Extend it for visual editor use.

Behavior:
- Advanced users can edit selected element HTML or insert custom HTML.
- HTML is sanitized by the SDK.
- Raw scripts are not allowed by default.
- Personalization tokens should be explicit and previewable.

Recommendation:
- Avoid arbitrary remote JavaScript in experiment modifications.
- Prefer DEE data attributes and built-in SDK behaviors for common interactions.
- If custom JavaScript is eventually needed, make it an enterprise feature flag with CSP, audit, and approval requirements.

### 7. Insert From Assets

Support inserting reusable DEE assets.

Initial insert sources:
- Message/web-layer templates from Messages.
- HTML fragments from a new "Web Layers" template category.
- Managed image assets.
- Reusable blocks such as CTA, store selector, survey, product carousel, countdown, voucher, recommendation list.

This builds on the existing message library and guarded web-layer renderer.

### 8. Mobile Preview And Responsive Checks

Add viewport preview controls.

Behavior:
- Desktop, tablet, and mobile preview widths.
- Highlight overflowing or clipped modified elements.
- Show per-variant responsive warnings.
- Reuse existing SDK device targeting metadata.

### 9. Shareable Preview Links

Add preview links valid for a short window.

Behavior:
- Link opens the website with DEE editor/preview mode and forced draft variant.
- Link does not publish or affect live traffic.
- Link includes a short-lived signed preview token.

DEE endpoints:
- `POST /v1/experiments/:key/preview-link`
- `GET /v1/preview/:token`

### 10. Save Boundary

Saving in the visual editor should return changes to DEE draft state, not publish.

Behavior:
- Save writes modification sets into the selected draft variant.
- User returns to DEE app to review validation, conflicts, traffic settings, and publish.
- Publish continues through existing validation and optional approval feature flag.

## Runtime Execution

Add a first-class SDK renderer for structured DOM modifications.

Renderer name:
- `dom_modifications`

Runtime steps:
1. Evaluate DEE decision as usual.
2. If eligible and variant output has `modifications`, apply modifications in listed order.
3. Record exposure only after at least one modification applies.
4. Emit `dee:skipped` if selectors fail, targeting fails, or sanitizer removes required content.
5. Include applied/skipped modification diagnostics in the `dee:decision` event.

Performance guardrails:
- Apply non-personalized and simple selector changes first.
- Defer expensive personalized HTML fragments.
- Limit modification count per variant.
- Warn about broad selectors and large subtree replacement.

## Implementation Phases

### Phase 1: Structured Runtime Modifications

- Add SDK `dom_modifications` renderer.
- Support `change_text`, `change_attribute`, `change_style`, `insert_html`, `remove`.
- Add modification diagnostics in browser events.
- Add docs and mock-site examples.

### Phase 2: Experiment Workbench Editor

- Add a page-level visual modification builder inside DEE app.
- User manually enters URL, selector, and modification type.
- Show selector quality checks using a sample DOM snapshot where available.
- Store modifications in variant outputs.

### Phase 3: Inline Website Overlay

- Add signed editor session endpoint.
- Add overlay bundle with toolbar, selector picker, variant switcher, modification list, undo/redo, and mobile preview.
- Save back to DEE draft via editor-token API.

### Phase 4: Preview And Collaboration

- Add short-lived preview links.
- Add reviewer preview mode for approval flow.
- Add comments on modifications.
- Add variant-diff summary: selector, type, before/after.

### Phase 5: Asset And Template Integration

- Add Web Layer asset category.
- Insert existing messages, web layers, managed images, and reusable blocks.
- Add template gallery for common marketer patterns.

## What Not To Copy Directly

- Do not allow unrestricted JavaScript by default.
- Do not save directly to live/published state from the website overlay.
- Do not rely only on generated CSS selectors without page targeting and selector quality warnings.
- Do not make Jinja-like personalization implicit inside arbitrary HTML; DEE should use explicit tokens and sample previews.

## Open Questions

- Should visual editor overlay be delivered via proxy URL, bookmarklet, or customer-installed SDK editor mode?
- Should web-layer templates live under Messages, a new Web Layers section, or both?
- How much raw HTML editing should non-admin users be allowed to save?
- Should selector snapshots be stored for drift detection across website releases?

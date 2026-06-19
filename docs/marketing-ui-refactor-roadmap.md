# Marketing UI Refactor Roadmap

This roadmap captures the next major UI workstream after production-readiness hardening. The goal is to make DEE feel like a marketer-operated decisioning product rather than an engineering console, while keeping it usable with hundreds or thousands of campaigns, rules, messages, experiments, and reference tables.

## Product Principles

- Campaigns are the primary mental model for marketing users.
- Rules, messages, experiments, surfaces, and reference data are supporting assets.
- Users should see status, impact, and next action before raw configuration.
- Raw JSON should be available for developers, but hidden behind explicit advanced drawers.
- Every large inventory needs search, filters, sorting, pagination or virtualization, and bulk actions.
- Editors should be page-level workbenches or persistent side panels, not modal-heavy flows.
- The UI should make safe defaults obvious: draft, validate, preview, publish, monitor, rollback.

## Phase UI1: Information Architecture Reset

Goal: simplify navigation around the objects marketers naturally manage.

- Make `Campaigns` the primary decisioning workspace.
- Keep `Overview` for operational health and portfolio performance.
- Keep `Evaluate` as an explicit QA workspace, but deep-link into it from campaigns, rules, messages, and experiments.
- Group advanced/admin surfaces under clearer sections:
  - Campaigns
  - Assets: Rules, Messages, Experiments, Reference Data
  - QA: Evaluate, Audit
  - Administration: Settings, Tokens, Integrations
- Add a global object switcher/search for campaigns, rules, messages, experiments, surfaces, and tables.
- Add persistent breadcrumbs and object headers with status, owner, campaign, last changed, and primary action.

## Phase UI2: Scalable Inventory Patterns

Goal: keep large workspaces usable at enterprise scale.

- Replace dense card-only inventories with hybrid table/list layouts.
- Add server-backed pagination or list virtualization for large collections.
- Add saved views for common filters, such as `Running campaigns`, `Drafts needing review`, `Low feedback`, `Broken schema`, and `Recently changed`.
- Add bulk actions for campaign/folder assignment, archive, duplicate, export, owner assignment, and review submission.
- Add column controls for operational users who need compact views.
- Add empty, loading, partial-error, and no-results states that explain the next action.
- Add keyboard-friendly search and quick-open behavior.

## Phase UI3: Campaign Workbench

Goal: make campaign setup and monitoring the main happy path.

- Campaign list: compact rows with status, channel/surface mix, active assets, traffic, conversions, review state, and last event.
- Campaign detail: sections for Summary, Assets, Performance, Conflicts, Delivery, Review, and Change history.
- Asset grouping by surface, objective, audience, and lifecycle.
- Inline add/remove/move asset actions with bulk support.
- Conflict and readiness panel at campaign level:
  - cross-surface eligibility contradictions
  - missing messages/assets
  - overlapping in-app placements
  - schema drift
  - missing feedback events
  - stale experiments or old drafts
- Campaign-level publish/review checklist that links directly to the failing asset section.

## Phase UI4: Marketer-Friendly Builders

Goal: reduce JSON and make decision setup understandable.

- Rules: visual condition builder with plain-language summaries, reusable condition blocks, and schema-aware pickers.
- Experiments: Design, Settings, Results, and QA sections with no always-visible raw payloads.
- Messages: template-first editor with layout presets, content sections, CTAs, media, personalization preview, survey builder, and delivery policy.
- Reference Data: table-first editor with validation rules, import mapping, quality checks, usage inspector, and version history.
- Decision Stacks: advanced journey-style canvas with node library, minimap, selected-node configuration below the canvas, and test journey preview.
- Developer payload drawers remain available per object, collapsed by default.

## Phase UI5: Review, Governance, And Scale

Goal: support larger teams and safer releases.

- Object ownership and last editor visibility.
- Review queue with assigned reviewer, blocking issues, comments, and publish readiness.
- Change history grouped by campaign and asset.
- Rollback previews for rules, messages, experiments, and campaign asset sets.
- Launch calendar and schedule conflicts.
- Policy badges for consent, device targeting, display frequency, TTL, fallback mode, and dependency-failure behavior.
- Environment labels for local, staging, and production.

## Phase UI6: Performance And Maintainability

Goal: make the frontend easier to evolve and faster with large datasets.

- Split the current monolithic UI into smaller modules by workspace.
- Extract shared components for:
  - object header
  - filter toolbar
  - inventory table/list
  - status chip
  - readiness panel
  - developer payload drawer
  - side panel
  - inline editor row
- Move expensive derived views into memoized selectors.
- Avoid rendering hidden workspaces.
- Add lightweight UI smoke tests for the main flows:
  - campaign list/detail
  - rule editor
  - message editor
  - experiment workbench
  - Evaluate
  - Settings integrations
- Add fixture sets for large inventories: 100, 1,000, and 10,000 objects.

## First Implementation Slice

Recommended first slice after production readiness:

1. Create a shared inventory list/table component with search, filters, sort, pagination, compact density, empty states, and row actions.
2. Apply it to Campaigns first.
3. Move Campaign detail into a page-level workbench with Summary, Assets, Conflicts, Performance, and Review sections.
4. Replace remaining campaign cards that do not carry decision-making value.
5. Add a global quick search/open command for campaigns, rules, messages, and experiments.
6. Add large-fixture UI performance checks.

Status: started. Campaigns now uses a compact campaign inventory with search, campaign sort, table-like rows, campaign-first workbench summary, direct Rules/Messages navigation, and a narrower desktop layout tuned for 1180-1440px work areas. Next: extract the inventory pattern into reusable helpers/components, add pagination or virtualization, and apply the pattern to Rules and Messages.

## Success Criteria

- A marketer can find a campaign, understand status, see problems, and open the right asset in under 30 seconds.
- Campaigns, rules, messages, experiments, and reference data remain usable with 1,000+ objects.
- JSON is not required for normal marketer setup flows.
- High-risk publish blockers are visible before publish, not only after failed validation.
- Large lists do not cause visible layout jank or slow workspace switching.

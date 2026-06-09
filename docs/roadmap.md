# DEE Implementation Roadmap

This roadmap reflects `meiro-decision-engine-spec_v2.md` and the current local implementation state.

## Current Baseline

Implemented:

- Dockerized Node service with SQLite persistence.
- Server-side `/v1/evaluate` and `/v1/evaluate/batch`.
- Rule sets with draft, publish, immutable published versions, export, and import.
- Basic branch rules, safe expressions, lookup expressions, score and lookup graph nodes.
- Generic reference data tables with JSON editing and CSV import.
- Audit log with basic filters and configurable retention.
- Client event retention controls for impressions and exposures.
- Hashed API tokens with `admin` and `evaluate` scopes.
- Expanded role scopes: `viewer`, `editor`, `publisher`, `admin`, and `evaluate`.
- Rule-set metadata fields for v2 surfaces: `type`, `priority`, `surface`, `cache_policy`, and `metadata`.
- Manual schema cache import for attributes, segments, and context keys.
- Meiro Profile API schema sync from a sample identifier.
- Scheduled Meiro Profile API schema sync when API settings and sample identifier are configured.
- Rule Builder key suggestions from cached attributes, segments, and context keys.
- Branch builder value-source comparisons for field-to-field checks.
- Visual branch summaries with reusable condition blocks and branch output TTL helpers.
- Safer publish review with changed-area diff, validation summary, affected rule preview, and warning-based publish blocking.
- Client-side broken-reference warnings with publish blocking when cached schema references are invalid.
- In-process client response caching based on rule TTL and cache scope.
- Rule-set list search/filter controls with duplicate and archive actions.
- Version history panel with published-version diff and rollback into draft.
- Audit date filtering and CSV export.
- Overview rule usage drilldown with fallback rate, matched branch distribution, and recent decisions.
- Overview anomaly baselines and alert history for selected metric windows.
- Evaluate panel trace cards for matched branch checks and graph node paths.
- Evaluate saved profile payloads, request-shape validation, and published-vs-draft comparison.
- Shared server-side saved evaluation profiles for team QA payloads.
- Message template controls for type, placement, media, footer, multiple CTAs, delivery lifecycle, priority, and TTL metadata.
- Settings connection tests for Meiro Profile API, collector, and explicit feedback endpoints, with filtered delivery drilldowns.
- Schema import diagnostics for imported, skipped, and failed fields.
- Meiro skill/mpcli metadata sync with a separate CLI/shared API token, plus Profile API fallback for condition-builder suggestions.
- Meiro webhook and feedback delivery status history with summary, filters, and payload inspectors.
- Embedded UI for rule sets, draft testing, evaluation, audit, lookups, settings, tokens, and Meiro request templates.
- Settings UI for portable config export/import across rules, reference data, messages, condition blocks, and non-secret environment settings.
- OpenAPI and Meiro Pipes integration templates.
- Guardrailed assistant planner/apply endpoints for draft-only rule, message, and experiment configuration.
- Readiness endpoint, request IDs, request logs, bootstrap-token disablement, CI checks, production Compose/nginx examples, and deployment/backup guidance.

Important gaps:

- Advanced graph editor includes a draggable canvas with a minimap, node focus actions, configurable snap-to-grid, and grid guides; deeper canvas ergonomics such as route grouping and branch folding remain optional polish.
- First client behavior exists for experiment evaluation; in-app message operations are still pending.
- First client-facing endpoint exists: `POST /v1/client/evaluate`.
- Deterministic experiment assignment exists for configured variants.
- Experiment operations dashboard with status, allocation, variant-level exposure/impression/conversion rollups, baseline/winner analysis, lift, and CSV export.
- Reusable website SDK helper for declared placements, safe fallback rendering, exposure/conversion feedback, forced-variant QA, and copy-ready install snippets from experiment detail.
- First impression/exposure feedback endpoints and event reports exist; in-app message library is still pending.
- In-app message library stores reusable content for client decisions.
- No role model beyond token scopes.

## Phase 1: Harden the Core Decision Engine

Goal: make the existing Pipes-facing decision engine closer to production-ready before adding new surfaces.

- Add rule set metadata fields needed by v2: `type`, `priority`, `surface`, `cache_policy`, and `metadata`.
- Add read-only `viewer`, `editor`, `publisher`, and `admin` scopes while preserving current `admin` and `evaluate` behavior.
- Split publish permission from edit permission.
- Add rule set search and filters by status, type, tag, and key.
- Add archive and duplicate actions.
- Add audit date range filters and CSV export.
- Add reference data CSV export and independent table version history.
- Add version diff and rollback to published version.
- Update OpenAPI to match the hardened contract.

Status: complete for the local Docker app.

## Phase 2: Meiro Schema Sync

Goal: make authoring safer by validating against Meiro attributes and audiences.

- Add settings for Meiro API URL and API token, separate from the Pipes collector URL/source slug.
- Add schema cache tables for attributes and segments.
- Add manual schema sync endpoint and Settings UI action.
- Add scheduled schema refresh configuration.
- Populate builder pickers from synced attributes, segments, and context schema.
- Show inline warnings for unknown or deleted attributes.
- Block publish when required rule references are broken.

Open decision: confirm exact Meiro Profile/Engage API endpoints and credentials available for schema and segment sync.

Status: implemented for Profile API sample-profile sync plus skill/mpcli metadata discovery. Shared API endpoints for attributes, audiences, identifier types, catalogs, and event types are wired and reported through diagnostics; they require a separate Meiro personal API token compatible with `mpcli`.

## Phase 3: Advanced Rule Authoring

Goal: support the full v2 graph model without forcing engineers to edit JSON.

- Implement nested condition groups up to 3 levels in the basic builder.
- Add value-source comparisons, such as comparing one attribute to another.
- Implement sub-decision execution with dependency depth limit and circular dependency detection.
- Add graph validation for node reachability and terminal paths.
- Build a first visual flow editor for input, condition, score, lookup, output, and fallback nodes.
- Add draft test panel with matched node path.

Open decision: ship a pragmatic graph editor first, then add deeper route grouping and branch folding only when complex customer flows require them.

Status: first-pass graph authoring is implemented with Branch/Graph mode switching, node cards for input, condition, score, lookup, frequency cap, output, fallback, and error nodes, draggable canvas positioning, visual route preview, JSON sync, route/reachability validation, draft/published evaluation trace cards, branch value-source comparisons, reusable condition blocks, branch output TTL helpers, safer publish review, guided helpers for lookup and frequency-cap nodes, a canvas minimap, and configurable snap-to-grid behavior.

## Phase 4: Client-Facing In-App and Experiment APIs

Goal: add the new v2 surface types while keeping them isolated from the server-side Pipes API.

- Add public client tokens scoped to application, environment, and allowed `decision_key` values.
- Add `POST /v1/client/evaluate`.
- Add rule set types: `decision`, `inapp_message`, and `experiment`.
- Add client-safe response shaping with `ttl_seconds`; authoring UI now captures response TTL hints in rule cache policy.
- Add in-process result cache with TTL policy.
- Add attribute/profile enrichment cache with TTL policy.
- Add deterministic bucket hashing for experiments.
- Add experiment allocation validation where weights sum to 100%.
- Add forced variant and holdout overrides.
- Add experiment freeze warnings when launched allocations or eligibility change.

Status: first-pass client evaluation is implemented with client tokens, allowed decision keys, per-token browser-origin/environment/app-id constraints, TTL response hints, deterministic experiment bucketing, forced variants, forced holdout overrides, allocation validation, in-process result caching with experiment override isolation, Meiro Profile API enrichment/cache for sparse identifier-first client requests, and active-experiment freeze warnings for allocation, variant, assignment, goal, schedule, and eligibility changes. Deeper application lifecycle governance remains.

Open decision: benchmark Profile API latency under production traffic and tune profile-cache TTLs per customer environment.

## Phase 5: In-App Message and Experiment Operations

Goal: support feedback loops and operational reporting for client surfaces.

- Add message library with content schemas and default content.
- Add in-app surface priority evaluation.
- Add frequency cap node backed by impression events.
- Add `POST /v1/client/impression`.
- Add `POST /v1/client/exposure`.
- Add `POST /v1/client/conversion`.
- Store impression, exposure, and conversion events in audit-compatible tables.
- Add exposure, impression, conversion, and conversion-rate reports by rule set, variant, message, surface, and profile.
- Add optional export format for downstream analytics or Meiro ingestion.

Status: first-pass feedback ingestion is implemented with client-scoped impression, exposure, and conversion endpoints, service metrics, event reports by rule, variant, message, surface, and profile, browser API traffic monitoring by endpoint/token/origin/environment/app, a `frequency_cap` graph node backed by impression events, a reusable message library, surface-level priority evaluation, batch in-app message precompute for Meiro Pipes segment exports, automatic best-effort Meiro feedback delivery for server, batch, website, and selected surface decisions, flexible message templates, message lifecycle/TTL metadata, an experiment operations dashboard with variant feedback, conversion-rate rollups, baseline/winner analysis, lift, CSV export, and a reusable website SDK helper for declared placements with safe fallback rendering, exposure/conversion feedback, forced-variant QA, display-frequency policies, URL/device targeting, consent/page-variable/condition context, delayed trigger support, named conversion tracking, and guarded in-page web-layer HTML fragments for vendor-style embedded experiments.

Open decision: defer mutual exclusion groups until basic experiment evaluation and exposure feedback are proven.

## Phase 6: Production Concerns

Goal: make the service deployable beyond local demo.

- Add HTTPS/reverse-proxy deployment notes.
- Add optional bootstrap-token disablement once DB admin tokens exist.
- Add health/readiness checks with database status.
- Add structured logs and request IDs.
- Add runtime request telemetry for latency, status codes, and slow routes.
- Add performance benchmark harness for p95/p99 latency, throughput, and SLO gates.
- Add backup/restore guidance for SQLite or migration path to a managed database.
- Add data-retention controls for audit, impression, and exposure events.
- Add traffic guardrails for high-volume client endpoints.
- Add idempotent client feedback ingestion for retry-safe website integrations.

Status: readiness, request IDs, request logs, runtime request telemetry, guarded bootstrap-token disablement, CI checks, production Compose/nginx examples, backup guidance, managed database migration guidance, explicit `DEE_STORE_ADAPTER` registry with SQLite capability reporting, a Postgres snapshot adapter behind `DEE_STORE_ADAPTER=postgres`, an activated `postgres_native` row-level adapter with native Postgres schema SQL and startup migration, deployment-readiness diagnostics for single-instance versus production-ready stores, a p50/p95/p99 benchmark harness with throughput/error reporting and optional SLO gates, SQLite retention controls for audits and client events, portable config bundles with reusable condition blocks plus non-secret settings, Settings UI export/import for those bundles, configurable body/request/socket limits, client endpoint rate limiting with metrics, scoped client-token origin/environment/app constraints, client API traffic observability, and idempotent client feedback ingestion are implemented. Next hardening should focus on live managed-Postgres integration tests, pool tuning, and migration rollback/playbook coverage.

## Phase 7: Guardrailed Configuration Assistant

Goal: let business users ask DEE to create rules, messages, and experiments while keeping all mutations inside draft, validation, diff, and publish guardrails.

- Add conversational Assistant panel for natural-language configuration requests.
- Add `POST /v1/assistant/plan` to convert a request into a structured draft-only plan.
- Add `POST /v1/assistant/apply` to create or update drafts only.
- Reuse existing rule validation, schema warnings, publish review, and experiment allocation guardrails.
- Create message dependencies as reusable content and reference them from draft rules.
- Generate test payloads and draft evaluation previews.
- Keep publish as a separate explicit user action.
- Add optional LLM provider integration behind the deterministic planner contract.

Status: first-pass deterministic assistant planner, draft-only apply endpoint, conversational Assistant panel, message/rule/experiment draft generation, allocation checks, shared rule validation, schema-aware field matching, schema diagnostics, generated draft evaluation previews, affected-draft summaries, publish-review handoff, non-blocking prompt disambiguation, optional LLM provider settings, a disabled-by-default OpenAI-compatible provider adapter behind the draft-only contract, provider observability for calls, fallbacks, connection tests, latency, and token usage, redacted assistant provider configuration history, server-side assistant governance reports for draft/advice contract, allowed actions, external side-effect blocking, secret-pattern detection, and validation status, provider policy presets, prompt-contract version metadata, durable redacted plan audit trails with prompt hashes, per-action approval before applying drafts, automated rollback plans for draft/message restores where possible, approval summary counts, rollback coverage indicators, and manual-review visibility for created message dependencies are implemented. Next hardening should focus on packaged assistant change sets and review queues.

## Phase 8: Marketer Readiness and Governance

Goal: make DEE safer and easier for marketing practitioners to operate without engineering support.

- Add experiment statistical significance, confidence labels, and minimum-sample guidance.
- Add a visual experiment variant builder with weight controls and output fields instead of raw JSON.
- Add experiment creation shortcuts from Overview and Experiments.
- Add goal/conversion metric configuration, scheduling, duration guidance, and sample-size estimates.
- Add plain-language condition summaries and richer searchable schema pickers.
- Add rule/message two-way linkage and navigation.
- Add real-time message preview, status filters, duplicate actions, surface pickers, and preview thumbnails.
- Add marketer-friendly Evaluate summaries, form-based payload editing, and real-profile lookup.
- Add Reference Data search/filtering and column validation rules.
- Add Audit default date ranges, auto-load, and event type filters.
- Add approval workflow with submit-for-review and approver-only publish.
- Add dashboard date range, alert/anomaly indicators, clearer metric labels, and quick-create shortcuts.
- Add adaptive multi-armed bandit mode for experiments, separate from fixed-split A/B/n tests, with minimum-sample guardrails, exploration floor, allocation-change history, and a freeze-to-winner flow.
- Add web experiment targeting and delivery settings for display frequency, URL rules, page variables, consent/category gates, device targeting, trigger model, named SDK conditions, and richer conversion goal attribution. See `docs/experiment-targeting-roadmap.md`.
- Add a visual website experiment editor for selector-based page modifications, variant switching, modification inventory, responsive preview, guarded HTML/web-layer insertion, shareable preview links, and draft-only save-back. See `docs/visual-experiment-editor-roadmap.md`.
- Replace remaining modal-heavy editors with page-level workbenches, inline detail panels, or persistent side panels.

Status: started with experiment significance calculations, confidence labels, minimum-sample guidance, CSV export fields, significance-methodology copy, declare-winner draft preparation, a guarded adaptive multi-armed bandit assignment mode with exploration floor, minimum-sample guardrail, optional rolling window, freeze-to-winner support, and recent assignment-history rollups, a visual experiment variant builder with allocation controls, output fields, and blocking 100% weight validation, plain-language branch condition summaries with schema-aware inline field hints, branch output message linking with compact content previews, message-to-rule backlink inventory in the message editor, live message preview syncing, image upload/drop support for managed message assets, message personalization token suggestions with sample-rendered previews, real-time message preview health states for lifecycle, content completeness, CTA readiness, token sample coverage, and mobile clipping risk, approval workflow behind a feature flag, typed rule creation, decision-key locking after save, experiment quick-create shortcuts, goal configuration, scheduling, sample-size guidance, first-pass web experiment targeting/delivery metadata validation plus SDK execution, and marketer-facing experiment delivery controls for display frequency, URL/device targeting, SDK conditions, consent gates, triggers, attribution window, and value field. Reference Data search/filtering, column quality checks, editable validation rules with advisory/warn/block save policies, Audit default date ranges, auto-load, matched-rule/payload filters, collapsible raw payload detail, client feedback event mode with event type/object/surface filters, Message catalog status/template/surface/search filters, message duplication, surface suggestions, preview thumbnails, persistent image asset storage with unused cleanup, Overview range selection with operational alerts, baseline alert history, a documented visual experiment editor implementation track, the first SDK `dom_modifications` runtime renderer with mock-site coverage, a first-pass in-app DOM modification builder for experiment variant outputs, marketer-friendly DOM modification presets with visual summaries, and selector-quality/payload-preview panels are implemented.

## Second-Pass User Feedback Roadmap

1. Lock integration-critical identifiers: keep Decision Key editable only before first save; saved and published rule keys are immutable and must be duplicated for a new client-facing key. Implemented.
2. Improve message authoring: support non-URL image assets, live preview syncing, richer CTA/footer content, "used by rules" backlinks, and durable version history. Initial upload/drop, live sync, richer content, backlinks, message version snapshots, path diffs, visual version comparisons, managed image asset storage, and unused-asset cleanup are implemented.
3. Improve experiment operations: validate allocation weights to 100%, explain significance methodology, and add a Declare Winner flow that prepares a 100% allocation draft. Implemented.
4. Improve governance: capture review assignee, submission comment, approval comment, approval history, and a compact rule governance timeline. Implemented; notifications and task assignment integrations remain pending.
5. Improve information architecture: typed rule creation, sortable rule list, raw audit payload collapsed by default, page-level rule editing, and campaign/folder grouping for rules, messages, experiments, audit, and overview. Implemented, including an Overview campaign detail panel with grouped Experiments, Rules, Messages, Surfaces, Review Status, Dependencies, Recent Events, exact cross-surface eligibility conflict detection, rule inventory conflict badges, conflict-aware review/publish warnings, conflict resolution recommendations, and direct open actions for experiment, rule, conflict, and message assets; deeper workbench navigation polish remains pending.
6. Improve marketer setup flows: add form-based profile builders for Evaluate, reusable frequency-cap blocks, campaign folders, clearer campaign-level change logs, and bulk campaign operations. Evaluate Profile Builder, Frequency Cap Helper, campaign/folder fields, an Overview platform change log, campaign-level operational rollups, campaign drilldown, guarded campaign bulk review/archive/duplicate actions, campaign/folder move actions, and asset-level move actions in rule/message inventories are implemented. Later: add multi-select "Add to campaign" bulk actions across inventory lists.

## Recommended Next Sprint

1. Add deeper production prompt hardening and provider governance for the optional LLM-backed assistant. Provider latency/error observability, admin test connection, redacted config history, per-plan governance reports, prompt-contract metadata, provider policy presets, and durable redacted per-call audit trails are implemented.
2. Add a native row-level managed-database adapter for enterprise deployments. The adapter registry, SQLite capability reporting, Postgres snapshot adapter, native Postgres schema contract, native migration runner, first read-only native store contract, settings/schema write contract, rule draft/version write contract, lookup/message write contract, message asset write contract, audit/client-event/assignment/Meiro-delivery/precompute write contract, deployment-readiness diagnostics, async graph frequency-cap evaluation, native audit search, native Overview metrics, native client-event metric reporting, native experiment operations with variant performance, significance, winner guidance, and assignment history, native campaign rollups with dependency and conflict reporting, campaign bulk action async wiring, and `postgres_native` adapter activation are implemented. Next: add live managed-Postgres integration tests and production pool/migration rollback guidance.
3. Add deeper personalization helpers such as content-variant previews and audience-specific copy comparisons. Audience comparison previews are implemented for message personalization.
4. Add assistant provider usage analytics and configuration audit history. Redacted configuration history is implemented.
5. Add external delivery hints for managed assets, such as CDN host validation and downstream render diagnostics. Downstream rule-output asset usage reporting is implemented.
6. Remove modal-heavy editor flows. Overview rule detail, Evaluate payload JSON, Reference Data Details, Message Editor, Rule Set editor, Rule Builder, and publish review have been converted to inline panels. Frontend maintainability refactoring has started with shared utility extraction; see `docs/frontend-refactor-roadmap.md`.
7. Add adaptive multi-armed bandit experiments after fixed-split reporting and website feedback are stable. First-pass guarded server-side assignment, visual controls, freeze-to-winner support, recent assignment-history rollups, hourly allocation trend charts, and guarded winner automation are implemented.

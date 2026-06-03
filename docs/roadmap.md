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
- Evaluate panel trace cards for matched branch checks and graph node paths.
- Evaluate saved profile payloads, request-shape validation, and published-vs-draft comparison.
- Shared server-side saved evaluation profiles for team QA payloads.
- Message template controls for type, placement, media, footer, multiple CTAs, delivery lifecycle, priority, and TTL metadata.
- Settings connection tests for Meiro Profile API, collector, and explicit feedback endpoints.
- Schema import diagnostics for imported, skipped, and failed fields.
- Meiro skill/mpcli metadata sync with a separate CLI/shared API token, plus Profile API fallback for condition-builder suggestions.
- Meiro webhook and feedback delivery status history.
- Embedded UI for rule sets, draft testing, evaluation, audit, lookups, settings, tokens, and Meiro request templates.
- Settings UI for portable config export/import across rules, reference data, messages, condition blocks, and non-secret environment settings.
- OpenAPI and Meiro Pipes integration templates.
- Guardrailed assistant planner/apply endpoints for draft-only rule, message, and experiment configuration.
- Readiness endpoint, request IDs, request logs, bootstrap-token disablement, CI checks, production Compose/nginx examples, and deployment/backup guidance.

Important gaps:

- Advanced graph editor includes a draggable canvas; deeper canvas ergonomics such as minimap and snap guides remain optional polish.
- First client behavior exists for experiment evaluation; in-app message operations are still pending.
- First client-facing endpoint exists: `POST /v1/client/evaluate`.
- Deterministic experiment assignment exists for configured variants.
- Experiment operations dashboard with status, allocation, variant-level exposure/impression/conversion rollups, baseline/winner analysis, lift, and CSV export.
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

Open decision: ship a pragmatic graph editor first, then polish minimap/drag behavior, rather than blocking on a full canvas experience.

Status: first-pass graph authoring is implemented with Branch/Graph mode switching, node cards for input, condition, score, lookup, frequency cap, output, fallback, and error nodes, draggable canvas positioning, visual route preview, JSON sync, route/reachability validation, draft/published evaluation trace cards, branch value-source comparisons, reusable condition blocks, branch output TTL helpers, safer publish review, and guided helpers for lookup and frequency-cap nodes. Minimap and snap-guide polish remain optional.

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

Status: first-pass client evaluation is implemented with client tokens, allowed decision keys, TTL response hints, deterministic experiment bucketing, forced variants, forced holdout overrides, allocation validation, and in-process result caching with experiment override isolation. Profile enrichment, attribute caching, richer app/environment scoping, and experiment freeze warnings remain.

Open decision: client calls require profile enrichment. Confirm whether the first production version should support Profile API enrichment or allow context-only rules until Profile API latency is benchmarked.

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

Status: first-pass feedback ingestion is implemented with client-scoped impression, exposure, and conversion endpoints, service metrics, event reports by rule, variant, message, surface, and profile, a `frequency_cap` graph node backed by impression events, a reusable message library, surface-level priority evaluation, flexible message templates, message lifecycle/TTL metadata, and an experiment operations dashboard with variant feedback, conversion-rate rollups, baseline/winner analysis, lift, and CSV export.

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

Status: readiness, request IDs, request logs, runtime request telemetry, guarded bootstrap-token disablement, CI checks, production Compose/nginx examples, backup guidance, managed database migration guidance, a p50/p95/p99 benchmark harness with throughput/error reporting and optional SLO gates, SQLite retention controls for audits and client events, portable config bundles with reusable condition blocks plus non-secret settings, Settings UI export/import for those bundles, configurable body/request/socket limits, client endpoint rate limiting with metrics, and idempotent client feedback ingestion are implemented. A managed database adapter remains.

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

Status: first-pass deterministic assistant planner, draft-only apply endpoint, conversational Assistant panel, message/rule/experiment draft generation, allocation checks, shared rule validation, schema-aware field matching, schema diagnostics, generated draft evaluation previews, affected-draft summaries, publish-review handoff, and non-blocking prompt disambiguation are implemented. LLM-backed planning remains.

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

Status: started with experiment significance calculations, confidence labels, minimum-sample guidance, CSV export fields, a visual experiment variant builder with allocation controls and output fields, plain-language branch condition summaries with schema-aware inline field hints, branch output message linking with compact content previews, message-to-rule backlink inventory in the message editor, real-time message preview health states for lifecycle, content completeness, CTA readiness, and mobile clipping risk, and approval workflow with submit-for-review, approver approval, and approved-draft publish gating. Remaining items are pending.

## Recommended Next Sprint

1. Add experiment creation shortcuts, goal configuration, scheduling, and sample-size guidance.
2. Add Reference Data search/filtering and column validation rules.
3. Add Audit default date ranges, auto-load, and event type filters.
4. Add dashboard date range, alert/anomaly indicators, clearer metric labels, and quick-create shortcuts.
5. Add optional LLM-backed planning behind the deterministic assistant contract, with strict action allowlists and validation guardrails.

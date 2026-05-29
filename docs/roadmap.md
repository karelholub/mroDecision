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
- Meiro webhook and feedback delivery status history.
- Embedded UI for rule sets, draft testing, evaluation, audit, lookups, settings, tokens, and Meiro request templates.
- OpenAPI and Meiro Pipes integration templates.
- Readiness endpoint, request IDs, request logs, bootstrap-token disablement, CI checks, production Compose/nginx examples, and deployment/backup guidance.

Important gaps:

- Advanced graph editor includes a draggable canvas; deeper canvas ergonomics such as minimap and snap guides remain optional polish.
- First client behavior exists for experiment evaluation; in-app message operations are still pending.
- First client-facing endpoint exists: `POST /v1/client/evaluate`.
- Deterministic experiment assignment exists for configured variants.
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

Status: implemented for Profile API sample-profile sync; broader segment catalog sync depends on final Meiro API contract.

## Phase 3: Advanced Rule Authoring

Goal: support the full v2 graph model without forcing engineers to edit JSON.

- Implement nested condition groups up to 3 levels in the basic builder.
- Add value-source comparisons, such as comparing one attribute to another.
- Implement sub-decision execution with dependency depth limit and circular dependency detection.
- Add graph validation for node reachability and terminal paths.
- Build a first visual flow editor for input, condition, score, lookup, output, and fallback nodes.
- Add draft test panel with matched node path.

Open decision: ship a pragmatic graph editor first, then polish minimap/drag behavior, rather than blocking on a full canvas experience.

Status: first-pass graph authoring is implemented with Branch/Graph mode switching, node cards for input, condition, score, lookup, frequency cap, output, fallback, and error nodes, draggable canvas positioning, visual route preview, JSON sync, route/reachability validation, draft/published evaluation trace cards, branch value-source comparisons, and guided helpers for lookup and frequency-cap nodes. Minimap and snap-guide polish remain optional.

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

Status: first-pass client evaluation is implemented with client tokens, allowed decision keys, TTL response hints, deterministic experiment bucketing, forced variants, allocation validation, and in-process result caching. Profile enrichment, attribute caching, richer app/environment scoping, and experiment freeze warnings remain.

Open decision: client calls require profile enrichment. Confirm whether the first production version should support Profile API enrichment or allow context-only rules until Profile API latency is benchmarked.

## Phase 5: In-App Message and Experiment Operations

Goal: support feedback loops and operational reporting for client surfaces.

- Add message library with content schemas and default content.
- Add in-app surface priority evaluation.
- Add frequency cap node backed by impression events.
- Add `POST /v1/client/impression`.
- Add `POST /v1/client/exposure`.
- Store impression and exposure events in audit-compatible tables.
- Add exposure and impression reports by rule set, variant, message, surface, and profile.
- Add optional export format for downstream analytics or Meiro ingestion.

Status: first-pass feedback ingestion is implemented with client-scoped impression and exposure endpoints, service metrics, event reports by rule, variant, message, surface, and profile, a `frequency_cap` graph node backed by impression events, a reusable message library, surface-level priority evaluation, flexible message templates, and message lifecycle/TTL metadata.

Open decision: defer mutual exclusion groups until basic experiment evaluation and exposure feedback are proven.

## Phase 6: Production Concerns

Goal: make the service deployable beyond local demo.

- Add HTTPS/reverse-proxy deployment notes.
- Add optional bootstrap-token disablement once DB admin tokens exist.
- Add health/readiness checks with database status.
- Add structured logs and request IDs.
- Add performance benchmark harness for p95/p99 latency and batch throughput.
- Add backup/restore guidance for SQLite or migration path to a managed database.
- Add data-retention controls for audit, impression, and exposure events.

Status: readiness, request IDs, request logs, guarded bootstrap-token disablement, CI checks, production Compose/nginx examples, backup guidance, managed database migration guidance, a simple p50/p95/p99 benchmark harness, and SQLite retention controls for audits and client events are implemented. A managed database adapter remains.

## Recommended Next Sprint

1. Add broader Meiro catalog sync if/when segment schema APIs are confirmed.
2. Add managed database adapter implementation if production scale requires multiple replicas.
3. Add optional graph-canvas minimap/snap guides if rule graphs become large in real customer use.

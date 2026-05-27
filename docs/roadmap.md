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
- Hashed API tokens with `admin` and `evaluate` scopes.
- Expanded role scopes: `viewer`, `editor`, `publisher`, `admin`, and `evaluate`.
- Rule-set metadata fields for v2 surfaces: `type`, `priority`, `surface`, `cache_policy`, and `metadata`.
- Manual schema cache import for attributes, segments, and context keys.
- Meiro Profile API schema sync from a sample identifier.
- Scheduled Meiro Profile API schema sync when API settings and sample identifier are configured.
- Rule Builder key suggestions from cached attributes, segments, and context keys.
- Client-side broken-reference warnings with publish blocking when cached schema references are invalid.
- Rule-set list search/filter controls with duplicate and archive actions.
- Version history panel with published-version diff and rollback into draft.
- Audit date filtering and CSV export.
- Embedded UI for rule sets, draft testing, evaluation, audit, lookups, settings, tokens, and Meiro request templates.
- OpenAPI and Meiro Pipes integration templates.

Important gaps:

- Visual rule graph preview is implemented; a full drag canvas is still pending.
- No client behavior for `inapp_message` or `experiment` rule-set types yet.
- No client-facing `/v1/client/*` APIs.
- No experiment assignment engine.
- No in-app message library or impression/exposure feedback.
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

## Phase 4: Client-Facing In-App and Experiment APIs

Goal: add the new v2 surface types while keeping them isolated from the server-side Pipes API.

- Add public client tokens scoped to application, environment, and allowed `decision_key` values.
- Add `POST /v1/client/evaluate`.
- Add rule set types: `decision`, `inapp_message`, and `experiment`.
- Add client-safe response shaping with `ttl_seconds`.
- Add in-process result cache and attribute cache with TTL policy.
- Add deterministic bucket hashing for experiments.
- Add experiment allocation validation where weights sum to 100%.
- Add forced variant and holdout overrides.
- Add experiment freeze warnings when launched allocations or eligibility change.

Open decision: client calls require profile enrichment. Confirm whether the first version should support Profile API enrichment or allow context-only rules until Profile API latency is benchmarked.

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

## Recommended Next Sprint

1. Build first-pass advanced graph editor.
2. Add client-facing experiment skeleton.
3. Add data-retention controls beyond audit logs.
4. Add CI/deployment hardening for hosted environments.
5. Add broader Meiro catalog sync if/when segment schema APIs are confirmed.

# Mobile In-App Readiness Roadmap

DEE can already evaluate in-app message eligibility for any client that can call the client APIs, but it is not yet fully productized for native iOS and Android delivery. This track closes that gap without changing the core decision model.

## Current State

- Server-side evaluation already supports identifier-first client requests, Meiro Profile API enrichment, in-app message selection, batch precompute, delivery policy, and feedback ingestion.
- The web SDK can render message templates and send impression, skipped, dismiss, conversion, and survey events.
- There is no native mobile SDK in this repository yet, so mobile apps would need to integrate the REST contract directly.

## What Was Added In This Pass

- Client evaluate and surface responses now expose a normalized message rendering contract through the resolved message payload.
- Top-level client `delivery` envelopes now include message delivery policy, availability, and rendering details, so native SDKs do not need to inspect ad hoc output fields.
- Surface candidate diagnostics now include message availability and rendering summaries for each evaluated in-app rule.

## Remaining Product Work

### 1. Native SDK Track

- Build first-party iOS and Android SDK wrappers for:
  - `/v1/client/surface`
  - `/v1/client/surface/batch` precompute consumers
  - impression, skipped, dismiss, conversion, and survey feedback
- Add storage adapters for per-device display suppression, cooldown, and dismiss state.
- Add renderers for banner, modal, inline card, toast, carousel, recommendation, and survey components.

### 2. App Runtime Contract

- Add explicit app context guidance for `platform`, `application`, `app_version`, `screen`, `locale`, and `session_id`.
- Add contract examples for React Native, SwiftUI, UIKit, Jetpack Compose, and WebView hybrid shells.
- Add offline/retry guidance for feedback event delivery.

### 3. Delivery Diagnostics

- Show mobile-specific delivery diagnostics in the UI:
  - app/platform mismatch
  - unsupported template on current SDK version
  - required asset missing
  - local suppression due to dismiss or frequency state
- Add per-application and per-platform message rendering health panels.

### 4. Governance And QA

- Add mobile preview frames in the message builder for phone and tablet form factors.
- Add SDK compatibility matrices by template type, app version, and platform.
- Add signed preview payloads or preview sessions for QA on device.

## Recommended Integration Contract

For mobile apps, the cleanest shape is:

1. App sends `profile_key`, identifiers, sparse attributes/segments/context, and the requested `surface`.
2. DEE enriches from Meiro Profile API when local payload is incomplete.
3. DEE returns:
   - `selected` decision result
   - top-level `delivery.message` policy
   - resolved `outputs.message.rendering` contract
   - `profile_cache.diagnostics`
   - `candidates` with suppression reasons when nothing is selected
4. App SDK renders the template, records delivery events, and forwards survey answers or conversions back through client feedback APIs.

That gives web and native apps the same decisioning semantics while keeping renderer specifics inside each SDK.

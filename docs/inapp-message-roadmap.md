# In-App Messaging Workbench Roadmap

This track brings in-app messages to the same product level as DEE experiments: marketer-friendly authoring, delivery policy, preview, eligibility diagnostics, SDK rendering, analytics, campaign integration, and governance.

## Product Goal

Make in-app messages first-class activation assets. A message should be reusable across rules, campaigns, surfaces, real-time SDK calls, and Meiro Pipes precompute flows while carrying its own delivery controls, lifecycle, diagnostics, and performance reporting.

## Phase 9: Enterprise In-App Messaging Workbench

### 1. Message Types And Placements

- Support `banner`, `alert`, `modal`, `inline`, `toast`, `card`, `carousel`, `survey`, `recommendation`, and guarded `html_fragment` templates.
- Capture application, surface, placement, campaign, and folder as structured metadata.
- Add placement compatibility checks so rules, surfaces, and messages do not drift apart.

### 2. Visual Message Builder

- Keep the current structured fields for title, body, image, footer, and CTAs.
- Extend builder controls for multiple CTAs, managed image assets, theme/layout hints, and reusable content blocks.
- Keep JSON tabs for advanced users, but make business fields the primary editing surface.
- Add mobile/tablet/desktop previews, personalization token previews, and audience comparison cards.

### 3. Delivery Policy

- Add message-level display mode: `always`, `once`, `once_per_session`, `once_per_day`, `once_per_week`.
- Add frequency controls: cooldown TTL, max impressions, dismiss suppression, suppress-after-conversion.
- Add schedule, priority, consent category, target devices, URL/page targeting, and trigger type.
- Return delivery metadata in client-safe decision payloads so SDKs and external apps can enforce the same policy.

Status: started. Message editor now captures display mode, cooldown TTL, max impressions, target devices, trigger, consent category, and dismiss behavior into `metadata.delivery`, and preview health surfaces policy issues before launch.

### 4. Eligibility And Precompute

- Show whether a message came from local payload, Meiro profile enrichment, or precomputed eligibility.
- Add missing attribute diagnostics, suppression reasons, profile cache freshness, and “why not shown” detail.
- Add batch precompute visibility by message, campaign, surface, and profile.

### 5. SDK Rendering

- Make `template: "message"` a first-class SDK renderer with modal/banner/toast/inline behavior.
- Emit view, impression, click, dismiss, conversion, skipped, and suppression events.
- Enforce display policy in browser storage when available, while keeping server-side suppression as the source of truth.
- Add accessibility defaults for close buttons, focus management, ARIA labels, and keyboard dismissal.

### 6. Message Experiments

- Allow message content/layout/CTA variants with holdout and fixed or adaptive allocation.
- Report CTR, conversion rate, lift, significance, winner recommendation, and winner rollout.
- Support short-lived preview links for each message variant.

### 7. Analytics

- Add message performance panels for eligibility, rendered impressions, views, clicks, dismissals, conversions, CTR, conversion rate, suppression, caps, and recent eligible profiles.
- Break down by campaign, surface, template, device, and variant.

Status: started. Message detail now includes a compact performance panel backed by client feedback metrics, with impressions, exposures, conversions, conversion rate, top surfaces, recent profiles, and recent events for the selected message.

### 8. Campaign Integration

- Campaign detail should group Messages alongside Experiments, Rules, Surfaces, Recent Events, Review Status, and Dependencies.
- Add campaign readiness checks for message schedule, consent, conflicts, missing assets, inactive references, and frequency caps.

Status: started. Message detail now has a launch readiness panel that summarizes rule links, campaign assignment, same-placement interruptive message conflicts, surface/campaign drift, and delivery/content blockers.

### 9. Governance

- Add draft/review/published/paused/archived lifecycle where needed.
- Add version diffs, rollback, preview links, validation summary, and optional approval gating behind the existing feature flag.

### 10. Conflict Detection

- Detect multiple modals on one surface, campaign priority conflicts, expired/inactive message references, missing consent, and message/experiment placement collisions.
- Show exact conflicts in campaign review and message readiness.

Status: started. Message readiness detects competing active modal/toast/alert messages on the same surface and placement, plus linked-rule surface and campaign mismatches.

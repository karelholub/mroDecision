# Frontend Refactor Roadmap

The current UI is a single static application with one large `public/app.js` file. That kept early iteration fast, but it now mixes routing, API calls, rendering, form state, validation, and feature-specific workbenches. The goal is to split it gradually without changing the deployment model or introducing a frontend build step too early.

## Current First Step

Implemented:
- Extracted shared browser utilities into `public/app-utils.js`.
- Loaded utilities before `public/app.js`.
- Added `public/app-utils.js` to the project syntax check.

This is intentionally low risk: it reduces the main app file and creates a pattern for future extraction while preserving the current no-build static deployment.

## Recommended Split Order

1. Shared utilities and rendering primitives.
   - Keep generic helpers in `app-utils.js`.
   - Move repeated UI primitives such as status cards, metric cards, table rows, and JSON drawers into a small `app-components.js`.

2. API client and app state.
   - Extract `api()`, token handling, cached datasets, and load orchestration into `app-data.js`.
   - Standardize error handling and stale-load cancellation for expensive views.

3. Feature workbenches.
   - Split high-churn areas into focused files:
     - `rules-workbench.js`
     - `experiments-workbench.js`
     - `messages-workbench.js`
     - `reference-data-workbench.js`
     - `evaluate-workbench.js`
     - `settings-workbench.js`
   - Each workbench should expose `init`, `load`, and `render` entry points.

4. Performance improvements.
   - Lazy-load data only for the active view.
   - Avoid initial fan-out API calls for hidden views.
   - Add request cancellation or stale response guards when switching views quickly.
   - Render large lists with pagination or bounded windows before adding virtualization.

5. Module migration.
   - Once feature files are split, convert static scripts to ES modules.
   - Keep a build-free path as long as possible; consider Vite only when module count, tests, or bundling needs justify it.

## Guardrails

- Keep each extraction behavior-preserving.
- Run `npm run check`, `npm test`, and a browser smoke check after every split.
- Avoid introducing a framework until the view boundaries are clear.
- Prefer plain browser modules over global state when the next extraction can do so cleanly.

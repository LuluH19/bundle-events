---
name: bundle-replay
description: Reproduce Bundle Events bugs where reloading or sharing a UUID link loses a selection, restores stale trip state, or opens the wrong step.
---

Read the app's AGENTS.md. Pin the UUID route, starting step, user action, and first field that changes unexpectedly. Compare three snapshots: the state immediately before save, the data returned when loading the UUID, and the selection rendered after hydration. Use the catch-all step page under src/app/[uuid]/[[...step]] and src/services/bundles.ts to locate the current read/write path.

Use e2e/home-flow.spec.ts for the network stubs and saved-bundle shape. Use a synthetic UUID. If the scenario edits a bundle, make the save stub retain the submitted data and have the load stub return that data. A constant response can conceal a broken save. For a sharing bug, open the link in a fresh browser context with the same stubbed storage backend. For a reload bug, keep the same context.

Assert the visible step and the affected selection after the round trip. If older bundles are implicated, replay one with the historical field absent. If direction changes are implicated, check whether a stale return leg reappears after choosing one way. Run the relevant Playwright case with npm run test:e2e -- <spec-path> and report the first divergent snapshot and the user-visible outcome.

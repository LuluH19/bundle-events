---
name: bundle-provider-triage
description: Diagnose missing or degraded Bundle Events search results for events, venues, hotels, or transport providers.
---

Start with one failing query. Capture the search category, coordinates or place, local dates, and what the traveller actually saw. Read the target checkout's AGENTS.md and identify the internal route in docs/api/internal-routes.md and the upstream service in docs/api/external-apis.md.

Trace that request from route handler through its service and adapter. Compare three boundaries for the same input: the provider payload, the normalized candidates, and the final filtered or merged result. A successful HTTP response can still contain zero usable candidates. For a missing venue, check city filtering and coordinate order; for an intermittent empty list, inspect the cache key and whether a prior failure populated it. Use the fallback order in the current implementation.

Replay with a small sanitized fixture at the first boundary that differs. Exercise a valid result and the reported failure (empty payload, missing field, timeout, or unavailable credentials as applicable). Keep unrelated providers deterministic. Use the relevant suites under src/__tests__, such as venue-city.test.ts or hotels-fallback.test.ts, via npm test -- <test-path>.

Report the first boundary that lost the result, the fallback the traveller received, and the evidence for each. Distinguish fixture evidence from observations of the live provider.

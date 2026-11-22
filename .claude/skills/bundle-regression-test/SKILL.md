---
name: bundle-regression-test
description: Turn a reported Bundle Events bug into a focused failing test and verify a requested fix.
---

Translate the report into an input and a user-observable result. Start at the cheapest boundary that preserves the failure. A wrong per-leg amount usually fits a Vitest case beside the price tests. A lost selection across reload may require the stubbed browser flow in e2e/home-flow.spec.ts. Keep the real transformation under test and stub the external response at its boundary.

Run the focused case against the original behavior. Inspect the failure to confirm the assertion caught the reported bug. If it already passes, trace the actual entry point or report the missing reproduction condition. For a test-only request, deliver the reproduction and command. For a fix, change the responsible code, rerun the same case and neighboring cases, and report the before/after result.

---
name: bundle-improve-ci
description: Audit or improve Bundle Events GitHub Actions for test coverage, truthful check results, reliability, and workflow cost.
---

Read .github/workflows/, package.json, the lockfile, test runner configs, and the PR template together. Map events and path filters to jobs, dependencies, permissions, and visible check names. Distinguish the CI workflow from Discord release notifications. Locate the actual deploy configuration before proposing a deployment change.

Pick the smallest improvement that addresses the request and a demonstrated gap. For a general quality pass, start with these concrete questions from the team's pipeline and recheck them against the current checkout:

- Do PRs that change application code actually run Vitest? A successful Next.js build only establishes that the build completed. If wiring in Playwright, use the existing stubbed home flow and install the browser configured by the project.
- Can npm audit return an error payload without vulnerability metadata and still produce a green result? Check a clean report, a high-severity finding, and an unavailable registry against the decision logic.
- Does the PR summary distinguish failure, cancellation, and intentional skips such as commit lint on a main-targeting PR? Follow new jobs through both the summary dependencies and its displayed results.
- Could a path-filtered workflow leave a required check pending? Verify required checks where accessible before changing triggers or job names. Use run timings when available to justify cache or job-layout changes.

For an audit, give prioritized findings and their evidence. For an implementation request, patch the workflow and affected documentation. Keep write permissions scoped to jobs that publish results and keep fork PR checks usable without notification secrets. Verify changed commands locally, lint the workflow with actionlint when available, and walk through representative PR and push events. Report which outcomes were exercised locally and which still require a hosted run.

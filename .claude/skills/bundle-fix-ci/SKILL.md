---
name: bundle-fix-ci
description: Diagnose and repair a specific failing Bundle Events pull request check or GitHub Actions run.
---

Identify the failed run, commit, job and event. Compare its SHA with the current branch before editing. Use the available GitHub integration or Actions logs. Follow job dependencies back from skipped jobs or a red PR summary to the first failing command. A Discord webhook failure and a Next.js build failure have different owners.

Reproduce with the workflow's Node version, lockfile and exact command when possible. Distinguish an application failure, workflow logic error, and runner or service outage using the log evidence. For a fork-only failure, check which permissions and credentials that event receives. Preserve the check's purpose while repairing it.

Run the failing command after the change. When asked to update the PR, push the fix and verify the new run against its SHA. Retry an unchanged run only when evidence points to a transient condition. Finish with the causal log line, fix, and verification status, indicating any remaining hosted-only check.

---
name: bundle-file-pr
description: Prepare a template-compliant Bundle Events pull request, or open it when the user asks to file it.
---

Read the checkout's contribution instructions and .github/PULL_REQUEST_TEMPLATE.md. Feature and fix branches ordinarily target dev. Honor a requested base. Inspect the merge-base diff, commits, and working tree separately so the description matches what the remote head will contain. Check for an existing PR with the same head and base before creating one.

Use a Conventional Commits title that names the outcome. Fill the template in place, preserving checklist wording used by CI. Describe the traveller-facing change or engineering problem, link an actual issue when applicable, and point reviewers to the part that needs judgment. For a visual change, include available before/after evidence. Mark only verified checklist items.

Run the repository's pre-PR checks (currently npm run lint, npm run typecheck, and npm test). Add a focused browser or build check when the change depends on it. Identify failures and unavailable prerequisites precisely in the handoff.

For a draft-text request, return the title and body. For a filing request, push the intended branch and create or update the PR with the available GitHub integration. Preserve existing reviewer and author notes on updates. Return the PR link, base, and verification results.

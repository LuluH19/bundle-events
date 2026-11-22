---
name: bundle-review
description: Review a Bundle Events pull request or branch diff for actionable regressions and coverage gaps.
---

Resolve the PR's actual base and head and review the merge-base diff. For a local change, include the requested working-tree edits. Read AGENTS.md and the tests around the changed entry point. Follow the changed value from its producer to at least the affected consumer before reporting a defect.

Choose probes from the diff. For a change to a fare calculation, trace an asymmetric round trip or a missing return price through the recap. For persistence changes, load a previously saved UUID missing the new field. For an adapter change, follow an empty or partial provider response through fallback and rendering. For workflow changes, trace the affected event through job conditions and the reported check result.

Use a focused existing test, small local example, or concrete control-flow trace to substantiate each finding. Lead with findings in impact order. Give a file and line, triggering input, observable consequence, and a targeted correction or regression test. Separate unresolved questions from confirmed findings. If the review is clean, state the scope reviewed and any consequential verification gap.

Deliver the review in chat by default. Publish comments or submit a GitHub review when the user asks for that action. On re-review, check the current head and existing threads to avoid duplicating resolved feedback.

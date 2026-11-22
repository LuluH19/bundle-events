---
name: bundle-change-impact
description: Map the callers, persisted data, and user flows affected by a proposed Bundle Events contract change before implementation.
---

Write the proposed contract change in one sentence. Trace producers and consumers by symbol and by serialized field name. A TypeScript rename can update local callers while old UUIDs in Supabase still deserialize with the former key. Include routes, share links, cache keys, and external payloads only where the changed value crosses them.

Choose the assumption with the largest downstream consequence. Probe it with an existing fixture or a small local example, such as an older saved trip or a provider response with the field absent. Separate demonstrated impact from callers found only by search. Return the affected paths, the compatibility decision needed, and the smallest check that would catch breakage. If the evidence shows the change is local, say where the trace ended.

---
name: review-scope
description: Check a target file or change for overclaims, drift, and routing mistakes.
agent: reviewer
argument-hint: "<target file or change>"
---

Review the target using the root reviewer agent.

Check for:

- positive full-parity or replacement-runtime language;
- unclear boundaries between root, plugin, and example surfaces;
- prompt or handoff references to missing root agents;
- duplicated plugin behavior that should be a wrapper or documented mirror;
- missing verification evidence for current-Copilot claims.

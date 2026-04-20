---
name: blueprint-check
description: Check whether a proposed oh-my-copilot repo layout stays within the v1 docs/research/examples boundary.
---

# Blueprint Check Skill

Use this illustrative skill when reviewing repository layout changes for `oh-my-copilot` v1.

## Checklist

- Public docs live under `docs/` or the repository root.
- Evidence and source synthesis live under `research/`.
- Copilot CLI layout examples live under `examples/copilot-cli-layout/`.
- Documentation hygiene scripts live under `scripts/`.
- CI, if present, runs docs checks only.
- No runtime package, daemon, background service, or orchestration framework is introduced.

## Response

Return a compact verdict:

- `PASS`: within v1 boundary.
- `WARN`: acceptable but needs clearer labels or citations.
- `FAIL`: introduces runtime or unsupported parity claims.

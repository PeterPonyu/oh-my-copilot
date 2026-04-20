---
name: verify
description: Short alias for the root verifier flow; gathers validation evidence for docs and Copilot surfaces.
agent: verifier
argument-hint: "[changed file, command, or surface]"
---

Verify the target using the root-local `verifier` agent.

This is the short invocation alias for `/root-registration-check` when the user
wants completion evidence rather than a detailed audit prompt. Separate:

- automated validation output from manual Copilot smoke-test gaps;
- root workspace evidence from plugin or example-workspace evidence;
- docs checks from Copilot surface checks; and
- passing checks from known environment limitations.

Prefer root-relative commands such as `./scripts/validate-doc-links.sh`,
`./scripts/validate-power-surfaces.sh`, and
`./scripts/validate-root-copilot-surfaces.sh` when they are in scope.

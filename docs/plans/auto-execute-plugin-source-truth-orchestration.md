# [OMCP] Plugin source-of-truth orchestration plan

## Goal

Promote `packages/copilot-cli-plugin/` to the single canonical source for root
Copilot CLI customization Markdown, make feature skills visibly orchestrate
custom-agent roles, and add automated sanity/smoke/E2E checks plus CI coverage.

## Implementation steps

1. Resolve the remote merge by keeping the fetched plugin architecture and
   preserving `[OMCP]` display prefixes only where they do not affect IDs.
2. Add canonical plugin instruction sources and extend mirror regeneration to
   produce root `AGENTS.md`, `.github/copilot-instructions.md`,
   `.github/instructions`, `.github/agents`, `.github/skills`, and
   `.github/prompts`.
3. Add `orchestrates-agents` metadata to main feature skills and validate that
   every referenced role exists as a plugin custom agent.
4. Add a no-dependency orchestration validator for plugin inventory, main skill
   sanity, command route sanity, and instruction mirror source sanity.
5. Wire mirror drift and orchestration validation into CI, power-surface
   validation, and release-readiness validation.
6. Regenerate the root mirror from the plugin source.
7. Run validation and review; create a branch/commit/PR if GitHub write access
   is available.

## Verification commands

```bash
./scripts/regenerate-github-mirror.sh
./scripts/check-mirror-drift.sh
node scripts/validate-plugin-orchestration.mjs
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
./scripts/validate-release-readiness.sh --skip-copilot-smoke
node scripts/audit-tool-refs.mjs
(cd packages/copilot-cli-plugin/mcp-server && npm install --omit=dev && npm test)
```

## Risks and mitigations

- **Root mirror churn:** regenerating root `.github/**` will replace hand-edited
  root-only wrappers. Mitigation: plugin is now canonical; update plugin sources
  first, then regenerate.
- **Host support mismatch:** plugin install does not automatically install
  repository instructions into consumer repos. Mitigation: document mirrored
  instructions as root-workspace source generation, not installed-plugin runtime
  instructions.
- **CI cost:** full Copilot model-backed smoke tests are not suitable for PR CI.
  Mitigation: keep CI deterministic and non-model-backed; retain manual agentic
  smoke runbook for interactive proof.

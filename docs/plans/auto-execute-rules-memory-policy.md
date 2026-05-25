# [OMCP] Rules and memory policy plan

## Goal

Add a Copilot-native rules and memory policy layer that complements existing
agents, skills, hooks, and MCP tools.

## Implementation steps

1. Add `mcp-server/rules-store.mjs` as the canonical rules engine:
   - project/user rule discovery,
   - frontmatter parsing,
   - glob and always-apply matching,
   - realpath/content-hash dedupe,
   - pending-context storage under `.omcp/state/rules-pending.json`,
   - policy report generation.
2. Register rules MCP tools in `mcp-server/server.mjs`:
   - `rules_context_for_file`,
   - `rules_pending_read`,
   - `rules_pending_clear`,
   - `rules_policy_report`.
3. Register resources in `mcp-server/resources.mjs`:
   - `omcp://rules/pending`,
   - `omcp://rules/policy-report`.
4. Extend `scripts/post-tool-audit.sh` so file-touch tool payloads call the
   rules store and append a short audit line when pending rules are captured.
5. Add canonical instruction copy:
   - `instructions/instructions/memory-rules.instructions.md`,
   - README section describing the policy surfaces,
   - keep root mirrors generated from plugin sources.
6. Add MCP store/resource/integration tests and update expected tool/resource
   counts.
7. Regenerate root `.github/**` mirrors and run validation.
8. Run review and security passes. Fix any `REQUEST CHANGES` findings before
   reporting done.

## Design choices

- **MCP-first context delivery:** Copilot hook output mutation is not assumed.
  Hooks store pending rule context, and agents can read it through MCP tools or
  the `omcp://rules/pending` resource.
- **No dependency expansion:** Glob support is conservative and implemented in
  the store to avoid package churn.
- **Rules are scoped, memory is classified:** Rules express behavioral
  constraints; project memory stores durable facts/directives; notepad stores
  active context; wiki stores reviewable compound knowledge.
- **Existing stores stay intact:** The new layer bridges to current `.omcp`
  stores instead of replacing them.

## Verification commands

```bash
./scripts/regenerate-github-mirror.sh
./scripts/check-mirror-drift.sh
node scripts/validate-plugin-orchestration.mjs
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
(cd packages/copilot-cli-plugin/mcp-server && npm test)
```

If release readiness is relevant after the implementation, also run:

```bash
./scripts/validate-release-readiness.sh --skip-copilot-smoke
```

## Risks and mitigations

- **Host context uncertainty:** Pending rules are exposed through MCP instead of
  pretending shell hooks can always inject model-visible context.
- **Rule spam:** Per-session dedupe uses both realpath and content hash.
- **Path leakage:** Rule discovery is rooted at the touched file's project root,
  and user rules are explicitly labeled as user-scoped.
- **Overwriting user knowledge:** The implementation does not modify user
  notepad, project memory, or wiki entries except when explicit MCP calls do so.

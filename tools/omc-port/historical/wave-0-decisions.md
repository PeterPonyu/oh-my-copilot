# Wave 0 — Pre-implementation Contract Decisions

- Plan: `omc-parity-consensus-plan.md` (Plan ID: `omc-parity-consensus-plan`, iteration 2 of 5)
- Wave: 0 — Pre-implementation contract resolution
- Status: RESOLVED
- Resolves open-questions: preToolUse stdin/env contract (Critic blocker #11), MCP vendoring model (Critic blocker #3), verifier/reviewer overwrite policy (Critic ask #9, Architect ask #7)

These three decisions were open blockers in the v1 plan. They are resolved here so that Waves 1, 2, 3, and 4 can proceed without ambiguity. All later waves cite this document as the authoritative contract record.

---

## Decision 1 — preToolUse Hook stdin/env Contract

### WHAT

Hook scripts receive the tool-call payload as JSON on **stdin**, captured via the `copilot_hook_capture_stdin` helper sourced from `.copilot-hooks/common.sh`. The environment variable `HOOK_SOURCE` distinguishes invocation context: `root-workspace` when the hook fires from the repository root, and `plugin` when it fires from a plugin installation.

Four helpers from `common.sh` standardize the hook interface for all scripts:

- `copilot_hook_init_config <source>` — initializes config and log paths for the given source context
- `copilot_hook_log_event <event> <source>` — appends a structured event entry to `.copilot-hooks/events.jsonl`
- `copilot_hook_append_legacy <event> <source> <legacy-log>` — writes a human-readable line to the named legacy log file
- `copilot_hook_finish` — finalizes the hook run (flushes, exits cleanly)

**Live evidence:** `.copilot-hooks/post-tool-audit.sh:7-12` shows this exact pattern in production:

```
HOOK_SOURCE="${HOOK_SOURCE:-root-workspace}"
copilot_hook_capture_stdin
copilot_hook_init_config "$HOOK_SOURCE"
copilot_hook_log_event "postToolUse" "$HOOK_SOURCE"
copilot_hook_append_legacy "postToolUse" "$HOOK_SOURCE" ".copilot-hooks/tools.log"
copilot_hook_finish
```

### WHY

Codifying the stdin/env contract up front prevents each Wave 2 hook script from inventing its own payload-capture approach, which would produce inconsistent log schemas and break the `HOOK_SOURCE` routing logic.

### WHO IT UNBLOCKS

- **Wave 2** — `pre-tool-policy-gate.sh` and `session-end-audit.sh` both read stdin via `copilot_hook_capture_stdin`; `HOOK_SOURCE` is required for log path routing in both scripts.
- **Wave 3** — MCP server design relies on hook events landing correctly in `.copilot-hooks/events.jsonl`; a broken hook interface would corrupt the event stream the server may query.
- **Wave 5** — Skill ports that reference hook behavior (e.g. `verify`, `autopilot`) describe the hook interface in their translated frontmatter; this contract is the source of truth for those descriptions.
- **Wave 7** — Smoke test (`smoke-copilot-cli.sh`) asserts hook log lines are present; requires the contract to be stable before the assertion is written.

---

## Decision 2 — MCP Vendoring Model

### WHAT

The MCP server dependencies are installed at **plugin install time** via:

```
npm install --omit=dev --prefix mcp-server/
```

This command is invoked by `packages/copilot-cli-plugin/mcp-server/build.sh`. The `@modelcontextprotocol/sdk` package is pinned at `@modelcontextprotocol/sdk@^1.18` in `mcp-server/package.json`.

The install is **idempotent**: `build.sh` skips the install step if `mcp-server/node_modules/` is already present and `mcp-server/package-lock.json` is unchanged.

Two rejected alternatives and their rationale:

- **NOT vendoring `node_modules/`** — vendoring would add tens of megabytes to the plugin repository, making install and diff review impractical.
- **NOT esbuild-bundled standalone** — a bundled build adds an esbuild toolchain dependency; the runtime `npm install` model requires only Node (already present in CI and developer environments).

### WHY

Pinning `@modelcontextprotocol/sdk@^1.18` (current stable minor as of 2026-05) ensures reproducible installs without requiring the plugin to ship binaries or a heavy build toolchain. The idempotency guarantee keeps repeated `copilot plugin install` calls fast.

### WHO IT UNBLOCKS

- **Wave 3** — `mcp-server/build.sh`, `mcp-server/package.json`, and `mcp-server/server.mjs` are all authored against this install contract; the server cannot be written without knowing the vendoring model.
- **Wave 1** — `packages/copilot-cli-plugin/.mcp.json` points to `./mcp-server/server.mjs`; the manifest entry is only valid if the server's install model is settled.
- **Wave 7** — Smoke test must run `bash mcp-server/build.sh` as the first post-install step; the idempotency contract determines how the smoke assertion is written.
- **Wave 8** — `docs/copilot-cli-plugin-install.md` documents the manual `bash mcp-server/build.sh` step; content depends on this decision.

---

## Decision 3 — Verifier/Reviewer Overwrite Policy

### WHAT

Both existing agent stubs are **overwritten** by OMC ports:

- `packages/copilot-cli-plugin/agents/verifier.agent.md` (currently 7 lines) — overwritten by the OMC `verifier` agent port.
- `packages/copilot-cli-plugin/agents/reviewer.agent.md` (currently 9 lines) — overwritten by the OMC `code-reviewer` agent port.

To preserve backward compatibility, `agents/code-reviewer.agent.md` is created as the canonical port file and `agents/reviewer.agent.md` is an **alias** (symlink or copy with a forwarding header) pointing to it. This alias is mandatory because **8 root prompt files** reference `agent: reviewer` or `agent: verifier` directly:

```
.github/prompts/plugin-review.prompt.md
.github/prompts/install-check.prompt.md
.github/prompts/review-scope.prompt.md
.github/prompts/research.prompt.md
.github/prompts/root-registration-check.prompt.md
.github/prompts/review.prompt.md
.github/prompts/verify.prompt.md
.github/prompts/ship-docs.prompt.md
```

The overwrite-plus-alias approach was chosen over a "complement mode" (keeping stubs and adding ports alongside them) because overwriting produces a clean, single-definition agent surface. The alias mechanism preserves all existing callers without requiring edits to 8 root prompt files.

### WHY

The 7-line and 9-line stubs are non-load-bearing placeholders; replacing them with full OMC ports delivers real agent capability with no regression to existing callers, provided the `reviewer` alias is in place.

### WHO IT UNBLOCKS

- **Wave 4** — The agent port table (14 new ports) lists `code-reviewer` and `verifier` as two of the 14; this decision confirms they overwrite rather than extend, fixing the agent count arithmetic (3 existing − 2 overwritten + 14 ported = 15 final).
- **Wave 5** — Skill ports for `verify`, `autopilot`, and `ralplan` reference the `verifier` and `reviewer` agents by name; those references resolve to the full OMC ports, not stubs.
- **Wave 7** — Smoke test dispatches to `verifier` as part of the `verify` skill in the E2E pipeline; the stub's minimal content would fail the provenance assertion.
- **Wave 8** — `AGENTS.md` update to ≥15 agents depends on the correct count, which requires this overwrite policy to be explicit.

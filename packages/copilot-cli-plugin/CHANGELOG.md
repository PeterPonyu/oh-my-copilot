# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Wave-O: README polish + one more outdated archive

- **Root `README.md` rewritten** for human readability. Length cut 210 → ~110 lines. Lead now opens with what the plugin gives you and how to install, not with v1-blueprint governance language. Removed: `## V1 scope` (22-bullet includes/excludes list), `## Reading path` (8-step walkthrough redundant with the docs map), `## Status` (date stamp not load-bearing), most of `## Verification` (consolidated to 4 lines + pointer), `## Hook and log policy` (moved entirely to `docs/hook-surface.md` territory; one-line summary removed from front README), most of `## Design principle` (compressed to a 3-line `## Project conventions` section that names the proof rule without expanding it). Kept: `## Plugin surface` table, install steps, "first commands to try" tutorial block, doc map, license.
- **`docs/copilot-cli-plugin-install.md` archived.** Documented `npm install` + MCP build steps that became stale after Wave-K's bundle (`mcp-server/dist/server.mjs` ships pre-built). Only inbound link was from a historical wave-0 port note in `tools/omc-port/historical/`. Canonical install path is now the 3 commands in the root README plus `docs/installation.md` for the full bootstrap walkthrough. Archive index entry added.

### Wave-N: drop OMC-parity framing

Project no longer frames itself in terms of parity to other plugins (`oh-my-claudecode`, `oh-my-codex`, etc.). The plugin is a Copilot CLI-native power pack on its own terms.

**Changes:**
- **Root `README.md`**: removed the `## Parity status` section (header, intro paragraph, 6-row OMC ↔ omcp table) entirely. Replaced with a `## Plugin surface` table that just describes what omcp is, with no comparison framing. Lead paragraph rewritten to drop the "achieves OMC-shaped parity" claim.
- **Plugin `README.md`**: removed the parity-matrix sentence from the "still intentionally bounded" section. Removed the trailing "for per-item status and the full OMC ↔ oh-my-copilot coverage breakdown" line below the inventory table.
- **`AGENTS.md`**: rewrote the agent-instructions parity sentence. The 5-line claim ("OMC-shaped parity for agents (16), skills (36)...") is now a single line stating what omcp delivers (21/42/41/4/35) without the comparison.
- **`docs/parity-matrix.md` archived** to `docs/_archive/parity-matrix.md` with index entry. The matrix is no longer load-bearing — was the canonical reference cited from every parity-framing claim above. With those claims gone, no active doc links to it.

**No CHANGELOG history rewrites.** Older wave entries that referenced parity-matrix.md or used parity language remain as-is — they describe what was true at that wave; rewriting historical entries would be revisionist.

### Wave-M: cleanup — stray runtime, premature placeholder, doc archive, stale counts

**M-1: stray runtime dirs purged.** Local cleanup of:
- `packages/.omcp/{autopilot,plans}/` — empty leftover dirs from autopilot's path-resolution mistake during Wave-L test (autopilot self-corrected to repo-root `.omcp/`, leaving these stubs).
- `packages/copilot-cli-plugin/.omcp/state/` — `pipeline-state.json` and `skill-active-state.json` from Wave-L test runs.

Both were already gitignored at the repo root, so this was filesystem-only cleanup. No commit needed for the deletion itself; this entry documents that the residue is gone.

**M-2: `packages/omcs/` premature placeholder removed.** The directory contained only a `README.md` (2085 bytes) describing a deferred Cursor-IDE sibling package. Per the README itself: *"Status: reserved path — no code lives here yet."* Reserved-but-empty directories in `packages/` make the install boundary fuzzy and confuse navigation. When omcs has actual code, it can be (re)added then with substance. Cross-reference removed from `packages/copilot-cli-plugin/README.md` (the `## Sibling package` section).

**M-3: docs archived.** 3 files moved to `docs/_archive/` (with index `docs/_archive/README.md` explaining what and why):

| Archived | Reason | Successor |
|---|---|---|
| `docs/review-notes.md` | Wave-time publication-review snapshot, not cross-linked from anything | None — current repo state is canonical |
| `docs/validation/agentic-2026-05-07-sample.md` | Wave-G/H `copilot -p` evidence | `docs/validation/agentic-tmux-2026-05-07-wave-l.md` (real interactive — strictly stronger) |
| `docs/validation/validation-2026-05-07-sample.md` | Wave-F/G synthetic stdio report | `bash scripts/run-validation.sh` regenerates fresh evidence on demand |

The other 20 top-level docs and `docs/plugin-internal/` stay — all are explicitly cataloged in the root README as part of the docs-first publication surface (this repo is intentionally `docs-first`, not just code).

**M-4: plugin README inventory de-staled.** The `## Plugin inventory` table had been frozen at `Agents: 16, Skills: 36, Slash commands: 5, MCP server tools: 8` since pre-Wave-A. Real counts (verified against `git ls-files`, `ls`, and `tools/list` against the bundled MCP server):

| Dimension | Was | Now |
|---|---|---|
| Agents | 16 | **21** |
| Skills | 36 | **42** |
| Slash commands | 5 | **41** |
| Hook events | 4 | 4 (unchanged) |
| MCP server tools | 8 | **35** |

**M-5: known follow-up — `~/.copilot/config.json` version drift.** The cached install record still says `"version": "0.5.0"`. Source `plugin.json` says `0.0.7`. Two-line fix in `~/.copilot/config.json` would resolve it, but per safety policy that file is out-of-project-scope and must be edited only with explicit user direction. Untouched. To fix: `copilot plugin uninstall omcp && copilot plugin install <repo-path>` (canonical) or hand-edit the version field (surgical).

### Wave-L: hand-tune the 5 originals + tmux-dominated end-to-end evidence

**L-1: 5 original commands hand-tuned to template parity** with the 8 done in Wave-K-c. Pre-fix audit on `commands/{autopilot,ralph,ralplan,team,deep-interview}.md` found:

| Issue | autopilot | ralph | ralplan | team | deep-interview |
|---|---|---|---|---|---|
| `argument-hint` missing quotes | ✗ | ✗ | partial | ✗ | ✗ |
| Skill flags surfaced in command | none | missing 2 | missing 3 | missing 2 | missing 2 |
| MCP tool refs (`mcp__omcp__*`) | none | none | none | none | none |
| `{{ARGUMENTS}}` footer | ✗ | ✗ | ✗ | ✗ | ✗ |
| Output paths surfaced | ✗ | ✗ | partial | ✗ | partial |
| Cancel/cost warning | ✗ | ✗ | ✗ | **N× cost not warned** | ✗ |
| State-write mode reference | ✗ | ✗ | ✗ | ✗ | ✗ |

Post-fix: every rewritten command now has the same template as the hand-tuned 8 — quoted argument-hint with full flag set, "Use when / use instead" routing block, MCP tool refs in backticks, dispatch tables (or numbered procedures), output-path documentation, cost/cancel warnings, `{{ARGUMENTS}}` footer.

**L-2: tmux-dominated end-to-end evidence** captured at `docs/validation/agentic-tmux-2026-05-07-wave-l.md`. The user-facing surface — typed `/omcp:<cmd>` at the interactive `❯` prompt — is only reachable through a real interactive session. Synthetic stdio MCP tests verify the protocol; tmux verifies the **user experience**. 4 substantive tests captured:

| Test | Routing | MCP tools called | Result |
|---|---|---|---|
| `/omcp:wiki list` | ✅ skill(wiki) | `wiki_list` | "Wiki entries: none found." |
| `/omcp:omc-doctor --json` | ✅ skill(omc-doctor) | (composed shell + jq) | JSON report with 3 issues from `~/.claude/` |
| `/omcp:cancel --all` | ✅ skill(cancel) | `state_list_active`, `state_list`, `state_clear` | "All OMC modes cleared." |
| `/omcp:autopilot ...` (rewritten) | ✅ skill(autopilot) | `pipeline_record_transition` | `/tmp/wave-l-test.txt` written + 3 artifacts + transition recorded |

**The autopilot test is the strongest evidence the rewritten command body works.** It exercised every doc'd contract:
1. `/omcp:autopilot create /tmp/wave-l-test.txt with the single word omcp inside` → routed to skill(autopilot) ✅
2. Composed shell to fetch UTC timestamp + repo root for provenance frontmatter ✅
3. Wrote artifacts to `.omcp/autopilot/spec.md`, `.omcp/plans/autopilot-impl.md`, `.omcp/autopilot/artifact.md` (the exact paths the new command body documents) ✅
4. **Self-corrected a path-resolution slip**: first wrote under `packages/.omcp/`, noticed the mistake ("the first patch landed under packages/.omcp instead of the repo root"), deleted misplaced files, recreated at repo-root `.omcp/` ✅
5. Self-verifying file create: `printf 'omcp' > /tmp/wave-l-test.txt; cat...; if not match: exit 1` ✅
6. Called `mcp__omcp__pipeline_record_transition({from:"plan", to:"artifact", artifact_path:"<absolute>"})` exactly as documented in the rewritten body ✅
7. Pipeline state persisted to `.omcp/state/pipeline-state.json` with the actual transition record (`{"from":"plan","to":"artifact","ts":"2026-05-07T07:44:53.400Z"}`) ✅

The self-correction in step 4 is the strongest signal: the LLM read the rewritten command body's "Output paths produced" section, attempted to honor it, noticed its own resolution was wrong, and fixed without prompting. Thin command wrappers do not produce that behavior — they produce flailing.

**L-3: actual install payload table** documented in this PR description (no doc-only churn). Git-tracked total: **~1.7 MB across 138 files**. Runtime-critical: only `mcp-server/dist/server.mjs` (588 KB) is loaded at startup. Source `mcp-server/server.mjs` + stores + tests retained for dev iteration and the bash→MCP bridge.

### Wave-K: payload trim + hand-tune top commands

**K-a: plugin docs/ moved out of install path.**
`packages/copilot-cli-plugin/docs/` (`orchestration.md`, `state-management.md`) → `docs/plugin-internal/`. Maintainer-facing reference docs no longer ship to end-user installs. Cross-refs in `docs/parity-matrix.md` and `packages/copilot-cli-plugin/README.md` updated.

**K-b: mcp-server bundled with esbuild → 27MB → 588KB.**
`mcp-server/dist/server.mjs` is the new committed runtime artifact (~588KB, single-file ESM bundle that inlines `@modelcontextprotocol/sdk` plus all stores). `.mcp.json` updated to point at `dist/server.mjs`. End-user installs no longer need `npm install` or `node_modules` — the bundle is shipped as-is.

- New `npm run build:bundle` script + revised `build.sh` (idempotent: skips rebuild when package-lock.json checksum + dist/ both present).
- Source `server.mjs` and store .mjs files retained for dev iteration and the bash→MCP bridge in `.copilot-hooks/common.sh` (which imports individual stores).
- New integration test `bundled dist/server.mjs is functional (Wave-K-b)` verifies `tools/list` returns 35 tools, state round-trip works, and Wave-H prefix tolerance survives bundling. Suite: 113 → **114**.
- `node_modules/` and `.build-checksum` added to `.gitignore` (already excluded at the plugin level; making it explicit at repo level too).

**K-c: 8 high-traffic command wrappers hand-tuned** (replacing Wave-I's auto-generated stubs):

| Command | Generic stub had | Hand-tuned now provides |
|---|---|---|
| `/omcp:wiki` | `<input>` | `<action> [args]` with sub-action table mapping to specific MCP tools |
| `/omcp:cancel` | `<input>` | `[mode] | --force | --all` with concrete dispatch sequence |
| `/omcp:omc-doctor` | `<input>` | `[--json] | [check name]` with explicit OMC-not-omcp scope note |
| `/omcp:ask` | `<input>` | `<claude|codex|gemini> <question>` |
| `/omcp:ccg` | `<input>` | `<question or task>` with synthesis instruction |
| `/omcp:hud` | `<input>` | `[setup | minimal | focused | full | status]` |
| `/omcp:learner` | `<input>` | `[topic or focus area]` with 4-step capture procedure |
| `/omcp:remember` | `<input>` | `[what to remember]` with 5-way classification routing to specific MCP tools |

Auto-generated wrappers for the remaining 28 skills still work (they delegate to skill bodies); hand-tuning is a quality polish, not a routing fix.

### Wave-J: install payload audit + cleanup
- **Moved 7 stale `_omc-port-diff.md` translator sidecars** from `packages/copilot-cli-plugin/skills/<slug>/` to `tools/omc-port/diffs/<slug>/` matching the convention established in v0.0.5. Pre-fix: 7 in install path. Post-fix: 0. Translator audit history is preserved at `tools/omc-port/diffs/` (now 36 entries).
- **Aligned `scripts/check-install-state.sh` allowlist with actual install reality.** Previous allowlist was 6 entries (`README.md`, `agents`, `hooks.json`, `plugin.json`, `scripts`, `skills`); installed plugin actually contains 11+ runtime entries. Validator falsely flagged `commands/`, `docs/`, `mcp-server/`, `orchestrator/`, `.mcp.json`, `CHANGELOG.md` as "non-runtime/development". Updated allowlist + removed `docs` from forbidden list (was a false positive — `docs/` ships with the install for plugin's internal docs, distinct from the monorepo's top-level `docs/`).
- **Removed 2 obsolete `TODO_UNRESOLVED.md` files** from `tools/omc-port/unresolved/`:
  - `git-master/TODO_UNRESOLVED.md` claimed the agent didn't exist; PR #18 (Wave A) ported it.
  - `ralph/TODO_UNRESOLVED.md` flagged ai-slop-cleaner-agent confusion; the workaround is now baked into `skills/ralph/SKILL.md` body. The TODO is no longer load-bearing.
  Empty `unresolved/` directory removed.
- **Surfaced a real follow-up:** the in-place `~/.copilot/config.json` `installedPlugins` entry still records the plugin version as `0.5.0` (from before the version bumps in Wave-E/G). The source `plugin.json` says `0.0.7`. Run `copilot plugin uninstall omcp && copilot plugin install PeterPonyu/oh-my-copilot:packages/copilot-cli-plugin` to refresh Copilot's recorded install state. Not a code issue — it's local-cache drift expected during dev.

### Wave-I: interactive Copilot CLI testing via tmux + slash command coverage
- **Real interactive Copilot CLI session captured via tmux** — first time we've validated the orchestration substrate through the actual user flow (typed slash commands in interactive `copilot` mode, not synthesized via `copilot -p`). Found a real gap that synthetic testing missed.
- **The gap:** only 5 skills had `commands/<slug>.md` wrappers (autopilot, ralph, ralplan, team, deep-interview). The other 37 skills (wiki, cancel, doctor, hud, ccg, ...) returned `Unknown command: /omcp:<slug>` when typed as slash commands. Skills work as auto-injected behavior but not as user-typed slash commands.
- **The fix:** `scripts/generate-skill-commands.sh` generates thin command wrappers from skill frontmatter. Idempotent — never overwrites existing commands. Skipped 1 skill marked `user-invocable: false` (`reference`).
- **36 new command wrappers** added; total commands: 5 → 41. `/omcp:wiki`, `/omcp:cancel`, `/omcp:doctor`, etc. now route correctly.
- **Verified end-to-end via tmux:** `/omcp:autopilot` routed, agent loaded skill body, performed glob searches, dispatched `state_read (MCP: omcp) · mode: "autopilot"` with mode-form (D-1), got `{"value":null,"exists":false}`. 19 hook events fired during the session (2 sessionStart, 16 postToolUse, 1 sessionEnd) — full lifecycle confirmed in real interactive use. Documented in `docs/validation/agentic-2026-05-07-sample.md` Test D.

### Wave-H: prefix tolerance + multi-test agentic exercise
- **Server now tolerates `mcp__omcp__` prefix on tool names** in `CallToolRequestSchema` handler. Skill prose documents calls as `mcp__omcp__wiki_add(...)` (the form Copilot's MCP client expects); previously direct-stdio dispatch required bare `wiki_add`. Now both forms work everywhere — eliminates token waste from agents that read skill prose then encounter dispatch failures when invoking via raw stdio.
- **3 real `copilot -p` agentic tests run end-to-end** (4 Premium requests total, ~9m20s):
  - **Test A (multi-tool):** Agent invoked `mcp__omcp__wiki_add` + `mcp__omcp__wiki_query` + `mcp__omcp__notepad_write_priority` via prefixed names. All succeeded with no diagnose-retry — Wave-H fix verified agentically.
  - **Test B (cross-session state):** Run 1 wrote mode-form state in one `copilot -p` session; Run 2 read it from a separate session, got identical payload with `exists: true`. D-1 mode-form persistence verified end-to-end.
  - **Test C (slash + hooks):** `/omcp:doctor` is **not** routed in non-interactive `-p` mode (Copilot CLI host limit; slash commands are interactive-only). Hooks fire relative to invocation cwd — workspaces without the plugin source tree don't get hook events, by design. Documented as host behavior, not omcp bugs.
- **Updated `docs/validation/agentic-2026-05-07-sample.md`** with all 3 test results, observed verbatim outputs, and explicit notes on Copilot-CLI host behaviors that affect what's testable from non-interactive prompts.
- New integration test `tests/server.integration.test.mjs::server tolerates mcp__omcp__ prefix` (Wave-H) — combined suite is now 113/113.

### Wave-G: version-line consistency + report redaction + agentic evidence
- **Renumbered prior CHANGELOG versions** to align with the 0.0.x line: `[0.5.0] → [0.0.6]`, `[0.4.0] → [0.0.5]`, `[0.3.0] → [0.0.4]`, `[0.2.0] → [0.0.3]`, `[0.1.0] → [0.0.2]`. Inline narrative version refs updated for consistency.
- **Path redaction in `scripts/run-validation.sh`** — `$HOME` → literal `$HOME`, hostname → `<host>`, tmp working dir → `<tmpdir>` in the committed report content. Default behavior: redact when `--out` is under `docs/`, raw when under `.omcp/`. Override with `--redact` / `--no-redact`. Prevents leaking machine-specific user paths to the public repo.
- **`--print-agentic-runbook` flag** documents the manual real-Copilot-CLI test sequence (slash command discovery, autopilot dispatch, hook lifecycle observation) that the auto-script cannot run inside a sandboxed agent harness.
- **`docs/validation/agentic-2026-05-07-sample.md`** — captured a real `copilot -p` agentic run as evidence. Discovered an interesting behavioral nuance: skill prose uses `mcp__omcp__<tool>` (the user-facing form Copilot's MCP client expects); direct stdio uses bare `<tool>` (the registered name). The agent autonomously diagnosed and retried; both forms work in their respective contexts. No skill rewrites needed.

### Wave-F: substantive tests + reproducible validation report
- **Strengthened hook-envelope fixture tests** with deep side-effect assertions. Replaced shallow string matches (`assert.match(stdout, /\{"continue":true\}/)`) with content + side-effect verification: snapshots `.copilot-hooks/events.jsonl` and `.omcp/traces/<session>.jsonl` before/after each hook run, asserts on byte-level deltas, kind-counts, payload-summary keys, and absence of unintended writes.
- **New `scripts/run-validation.sh`** — single-command reproducible validator. Boots the MCP server, exercises each store's round-trip with content checks (write a value, read it back, assert structural equality), runs all hooks with fixture envelopes, then writes a timestamped Markdown report (default: `docs/validation/validation-<timestamp>.md`; pass `--out` for ephemeral runs to `.omcp/validation/`).
- **Sample report committed** at `docs/validation/validation-2026-05-07-sample.md` showing what the script produces. 17/17 checks PASS against the symlinked install at v0.0.7.
- Plugin version: 0.6.0 → 0.0.7 (per maintainer's explicit version line; below 0.6.0 in SemVer terms — npm/marketplace publish would need a parallel branch or scope-rename if the lower number is rejected).

## [0.0.7] - 2026-05-07

### Wave-E: post-audit cleanup
- **Hook script path arithmetic fixed.** `post-tool-audit.sh` and `log-session-start.sh` previously computed `REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"`. That arithmetic assumed the script lived at `<repo>/packages/copilot-cli-plugin/scripts/`; under the install symlink at `~/.copilot/installed-plugins/_direct/...`, three `..` up landed at `~/.copilot/installed-plugins/` instead of the workspace root, so `.copilot-hooks/common.sh` couldn't be sourced. Replaced with `git rev-parse --show-toplevel || pwd` — locates the actual workspace regardless of install path.
- **Stripped 38 stale `<!-- TODO: agent X must be in agents/X.agent.md (Wave 4) -->` comments** across 9 skills (autopilot, deep-interview, external-context, ralph, sciomc, team, ultraqa, ultrawork, writer-memory). All cited agents (qa-tester, architect, executor, critic, document-specialist, planner, explore, security-reviewer) were ported in PR #18 and exist in `agents/`. Same false-claim pattern as the cancel/SKILL.md fix in PR #27 but in HTML comments rather than inside ToolSearch query strings.

### Added (Wave A, PR #18)
- 5 agents ported from OMC: `analyst`, `code-simplifier`, `designer`, `explore`, `git-master`. Agent count 16 → 21.
- 8 skills ported from OMC: `ccg`, `deepinit`, `omc-doctor`, `omc-reference` (since renamed), `omc-setup`, `omc-teams` (since renamed), `wiki`, `writer-memory`. Skill count 35 → 43.

### Changed (Wave B-0, this PR)
- **Skill renames** for namespace coherence inside the `/omcp:` prefix:
  - `omc-teams` → `cli-teams` (body header rewritten to "CLI Teams Skill"; distinguishes process-based tmux workers from the in-Copilot `/omcp:team` skill)
  - `oh-my-copilot-reference` → `reference` (canonical omcp catalog; the duplicate `omc-reference` Wave A port was deleted in favor of this one)
- **`omc-doctor` and `omc-setup` retained as-is.** Body audit confirmed both are genuinely OMC-flavored (diagnose/install OMC alongside omcp), so the `omc-` prefix is honest. They function as cross-host interop skills, not omcp-native ones.
- Cross-references updated in `cancel/SKILL.md`, `omc-doctor/SKILL.md`, and `docs/parity-matrix.md`.
- Translator audit-log artifacts (`.omcp/state/_omc-port-translations.jsonl` written inside each ported skill dir) removed.

### Removed
- `skills/omc-reference/` (duplicate of `oh-my-copilot-reference`, kept the latter).

### Wave-C-1a: Skill path drift sweep (`.omc/` → `.omcp/`)
- Mechanical replacement in 3 skills with paths drifting from the v0.0.5 directory rename: `wiki/SKILL.md` (5 lines), `ccg/SKILL.md` (3 lines), `cli-teams/SKILL.md` (2 lines). 10 lines updated total.
- `writer-memory/SKILL.md` excluded — line 232 references `.omc/notepad.md` as a deliberate cross-host bridge for users running both omcp and OMC. Annotated with `<!-- cross-host: deliberate -->` so future sweeps skip it.
- `cancel/SKILL.md` excluded — owned by Wave-C-1b (separate concern: ToolSearch query-string surgery).

### Wave-D-1: state_write/state_read mode-form compat
- `state_write` and `state_read` now accept an OMC-style mode-form alongside the original key/value form. This unblocks the OMC-ported skills (`team`, `deep-dive`, `deep-interview`, `cancel`) whose state pseudocode like `state_write(mode="team", active=true, current_phase="team-plan", state={...})` previously didn't dispatch correctly to omcp's `{key, value}` schema.
- **Form 1 (unchanged):** `state_write({key, value})` writes verbatim.
- **Form 2 (new):** `state_write({mode, active?, current_phase?, session_id?, state?, ...})` — strips `mode`, writes the rest as the value to `.omcp/state/<mode>-state.json`. Fields `key` and `value` are also stripped from form-2 calls.
- **state_read symmetry:** `state_read({mode})` reads `<mode>-state.json` and returns the stored value (with `mode` already stripped at write time).
- Schema descriptions updated to document both forms with examples. Validation: rejects calls with neither `key` nor `mode`.
- 3 new integration tests verify mode-form round-trip, key-form regression (unchanged behavior), and missing-arg validation. Combined suite: 111/111 pass.
- Skill bodies are NOT touched in this PR — the compat layer makes them work as-written. Future cosmetic cleanup (explicit `mcp__omcp__` prefixes in skill prose) is deferred.

### Wave-C-3c: wiki_query result-count logging
- `wikiQuery` appends one JSON line `{ts, query, result_count}` to `.omcp/wiki/log.md` per call. Per ADR-5: write-only; user reviews monthly via `grep` to detect when substring-search relevance degrades enough to trigger an embedding-based search upgrade. Trigger condition: >20 results in >50% of recent queries.
- Logging is best-effort — failures don't propagate to the `wiki_query` caller.
- `wikiLint` now skips `log.md` when scanning for untracked files (it's a system file, not a wiki entry).
- New `mcp-server/README.md` section "Wiki query log" documents the file purpose.

### Wave-C-3: hook augmentation (default-on) + bash↔MCP bridge + fixture tests
- New `omcp_call_store` helper in `.copilot-hooks/common.sh` — bridges from bash hooks to omcp MCP store .mjs functions via `node -e`. Per ADR-2, errors absorbed as exit 0 with stderr warning (`[omcp-bridge] ...`); telemetry must not kill a session. Caller passes JSON args built with `jq -nc` (NOT bash string interpolation) to avoid quoting bugs.
- Augmented `post-tool-audit.sh`: captures stdin envelope; if `exit_code != 0` or `error` field present, writes a `tool_failure` trace event to `.omcp/traces/<session>.jsonl` via `trace_write`. Inserted before parity-guard so traces capture even on parity violations. Best-effort failure detection: works against the partly-observable Copilot CLI envelope shape; tolerates unknown keys.
- Augmented `log-session-start.sh`: queries `state_list_active`; if any modes still active, appends `resumed=true active_modes=...` line to `.copilot-hooks/session.log` so operators can see resumed orchestration state at session start.
- Augmented `session-end-audit.sh`: calls `notepad_prune({maxAgeDays: 7})` before exit so long sessions don't accumulate stale notepad entries.
- New `tests/hook-envelope.fixture.test.mjs`: 7 tests spawn each augmented hook with synthetic envelopes, verify positive (success/failure paths produce expected outputs and side-effects) + negative (unknown envelope keys / malformed JSON / missing module bridge) behavior. Combined suite now 108/108 pass.

### Wave-C-2: tool-ref audit script + wiki skill arg-shape fix
- New `scripts/audit-tool-refs.mjs` parses every `mcp__omcp__<tool>` and `ToolSearch(query="select:...")` reference in `packages/copilot-cli-plugin/skills/**/*.md` and `packages/copilot-cli-plugin/agents/**/*.md`, diffs against `server.mjs` `name:` registrations, and emits 3 lists: (a) referenced-but-not-registered (blocking), (b) registered-but-never-referenced (informational), (c) cross-host allowlist matches.
- New `scripts/audit-tool-refs.allowlist.json` allows `omc-doctor`, `omc-setup`, and `reference` to reference cross-host tool names without failing the audit.
- Audit run: 16 unique tools referenced, 35 registered, list (a) empty (PASS), 23 tools registered-but-unreferenced (Wave-D follow-up scope: skill rewiring to actually invoke the new tools instead of just naming them).
- `skills/wiki/SKILL.md` rewritten — every tool example was using OMC's API (`{title, content, tags, category, page, query}`) instead of omcp's actual schema (`{title, body, tags, slug, q}`). Now uses correct arg names: `body` not `content`, `slug` not `page`, `q` not `query`, `path` for ingest. `category` field replaced with tag-based taxonomy guidance. Examples now use literal `mcp__omcp__` prefix.

### Wave-C-1d: shared-memory 4KB warning + per-family concurrency contract
- `mcp-server/shared-memory-store.mjs`: `sharedMemoryWrite` now computes the encoded byte size of each event before append; if it exceeds 4096 bytes (Linux PIPE_BUF), emits a rate-limited stderr warning. Deduped per `(channel, size)` within a 60-second window via in-memory map. Exposes `_resetSharedMemoryWarningRateLimit()` for test isolation.
- `mcp-server/README.md`: new "Concurrency contract per tool family" section. Per-family rules table covering `state_*`, `notepad_*`, `project_memory_*`, `wiki_*`, `shared_memory_*` with explicit atomicity and concurrent-writer semantics. Aligns documentation with actual implementation per ADR-1.
- `tests/shared-memory-store.test.mjs`: 3 new tests — warning fires on >4KB write, no warning on ≤4KB write, rate limiter dedupes within 60s window. Suite now 101/101 pass.

### Wave-C-1c: scaffold packages/omcs/ stub
- Created `packages/omcs/README.md` reserving the path for the deferred Cursor-IDE-targeted sibling package per ADR-4 of `.omcp/plans/post-wave-b-consolidation.md`. Documents why omcs is monorepo'd-but-empty, host-product differences vs omcp, and when omcs will get real code.
- Added "Sibling package" section to `packages/copilot-cli-plugin/README.md` cross-linking to the new directory.

### Wave-C-1b: cancel/SKILL.md surgery + content reconciliation
- Removed three embedded HTML comments from inside the `ToolSearch(query="...")` call at line 48. The comments claimed `state_clear`, `state_list_active`, `state_get_status` were "not in v1 server" — these claims were false (all three registered in `server.mjs` at L95/L122/L134 since PR #20). The HTML inside the quoted string was runtime garbage being passed to the tool dispatcher.
- Updated 3 stale `.omc/` references in the bash fallback block (walk-up loop, directory check, error message) to `.omcp/` to match the v0.0.5 path rename. The fallback's substantive logic is unchanged — the warning prose about not using fallback for `autopilot`/`cli-teams` remains intact.
- Updated descriptive label "OMC Teams (tmux CLI workers)" to "CLI Teams (tmux CLI workers)" in the dependency-order list to reflect the B-0 skill rename.

## [0.0.6] - 2026-05-06

### Fixed
- **`docs/orchestration.md` rewritten end-to-end.** The previous version listed 6 phantom MCP tools (`read_file`, `write_file`, `run_command`, `list_directory`, `search_files`, `get_diagnostics`) that were never implemented; documented the wrong hook script paths (`hooks/session-start.sh` etc.); used the wrong event name `sessionStop` instead of `sessionEnd`; and showed a `stages` schema that mismatched the array form actually written by `orchestrator.mjs`. The new version reflects the real 8-tool surface, real script paths, real event names, and the array schema.
- **`mcp-server/server.mjs` self-name corrected.** The `Server` constructor identified itself as `"oh-my-copilot"` v0.0.2; updated to `"omcp"` v0.0.6 to match the plugin name and version. (Functionally a no-op — Copilot CLI uses the `.mcp.json` server-key for the tool prefix `mcp__omcp__*` — but eliminates internal naming drift.)
- **`docs/parity-matrix.md`** MCP tools row corrected from `6 / 6` to `6 / 8` to reflect the two pipeline tools added on top of OMC's base surface.

### Removed from installed plugin
- `docs/pipeline-dispatch-contract.md` moved to `tools/omc-port/dispatch-contract.md` (dev-only translator contract; lives next to the translator code).
- `docs/wave-0-decisions.md` moved to `tools/omc-port/historical/wave-0-decisions.md` (port-time historical record; references the original consensus plan that lives in `.omc/plans/`).
- `commands/.keep` placeholder deleted (was a Wave-1 directory reservation; the `commands/` dir is now populated with 5 real slash commands).

### Migration
- Reinstall: `copilot plugin uninstall omcp` then `copilot plugin install PeterPonyu/oh-my-copilot:packages/copilot-cli-plugin`. Rebuild MCP runtime deps with `bash mcp-server/build.sh`.

## [0.0.5] - 2026-05-06

### Changed
- **Workspace state path renamed**: `.omc/` -> `.omcp/`. The orchestrator default `stateDir` is now `.omcp/state`; all SKILL.md, agent, doc, and command references updated to write to `.omcp/specs/`, `.omcp/plans/`, `.omcp/state/`, and `.omcp/notepad.md`. Existing `.omc/` workspaces remain readable if you point the orchestrator at the old path explicitly.
- **Payload minimization (round 2)**: 29 `_omc-port-diff.md` files moved from `packages/copilot-cli-plugin/skills/*/` to `tools/omc-port/diffs/<skill>/_omc-port-diff.md`. 2 `TODO_UNRESOLVED.md` markers moved from `skills/git-master/` and `skills/ralph/` to `tools/omc-port/unresolved/<skill>/`. The empty `skills/git-master/` directory was removed.
- `tools/omc-port/payload-audit.sh` now flags both file kinds as DEV-ONLY so future regressions are caught.
- `docs/parity-matrix.md`: skill count corrected from 36 -> 35 (git-master demoted to SKIPPED with v2 marker).

### Migration
- Reinstall: `copilot plugin uninstall omcp` then `copilot plugin install PeterPonyu/oh-my-copilot:packages/copilot-cli-plugin`.

## [0.0.4] - 2026-05-06

### Changed
- **BREAKING**: Plugin renamed from `oh-my-copilot-power-pack` to `omcp`. Slash commands and agents are now namespaced as `omcp:<name>` (e.g. `/omcp:deep-interview`, `--agent omcp:planner`).
- **BREAKING**: MCP server name in `.mcp.json` renamed from `oh-my-copilot` to `omcp`. Tools now appear to the model as `mcp__omcp__state_read`, `mcp__omcp__pipeline_record_transition`, etc.
- All in-plugin references updated: SKILL.md instructions, agent prompts, dispatch translator (`tools/omc-port/translate-omc-skill.mjs`), translator test fixtures, plugin docs.

### Migration
- Reinstall: `copilot plugin uninstall oh-my-copilot-power-pack` then `copilot plugin install PeterPonyu/oh-my-copilot:packages/copilot-cli-plugin`.
- Pre-existing `.omcp/state/pipeline-state.json` files remain compatible — the file path is unchanged and the schema is identical.

## [0.0.3] - 2026-05-06

### Added
- `commands/` directory reserved for Wave 6 to populate with CLI command definitions.
- `mcpServers` declaration in `plugin.json` pointing to `.mcp.json`.
- `.mcp.json` skeleton declaring the `oh-my-copilot` MCP server entry, pointing to the forthcoming Wave 3 `mcp-server/server.mjs`.

### Notes
- Manifest expansion to support full OMC parity port (per `.omcp/plans/omc-parity-consensus-plan.md`).

## [0.0.2] - earlier

### Added
- Initial plugin shape: 3 agents (`agents/`), 6 skills (`skills/`), and 2 hook events (`hooks.json`).
- Core scaffolding for `omcp` derived from oh-my-copilot.

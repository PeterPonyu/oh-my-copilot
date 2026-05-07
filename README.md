# oh-my-copilot

A Copilot CLI-native power pack for GitHub Copilot CLI: 21 agents, 42 skills, 41 typed slash commands, 4 hook events, and a 35-tool MCP server — installed as a single plugin.

## What you get

- **Typed slash commands** — `/omcp:autopilot`, `/omcp:ralph`, `/omcp:wiki`, `/omcp:cancel`, ... 41 user-invocable routes that the LLM can resolve at the `❯` prompt.
- **Persistent state** — wiki, project memory, notepad, traces, shared memory, and pipeline state all live under `.omcp/` and survive across sessions.
- **Real MCP server** — single 588 KB bundled file (`mcp-server/dist/server.mjs`); no `npm install` needed at install time.
- **Hooks for the 4 lifecycle events** Copilot CLI v1.0.43 exposes: `sessionStart`, `preToolUse`, `postToolUse`, `sessionEnd`.

## Install

```bash
git clone https://github.com/PeterPonyu/oh-my-copilot.git
cd oh-my-copilot
copilot plugin install ./packages/copilot-cli-plugin
```

Verify:

```bash
bash scripts/check-install-state.sh
# expected: Result: PASS
```

For the full installation guide (prerequisites, bootstrap script, troubleshooting), see [`docs/installation.md`](./docs/installation.md).

## Plugin surface

| Dimension | Count | Notes |
| --- | --- | --- |
| Agents | 21 | reviewer, research, executor, planner, architect, debugger, ... |
| Skills | 42 | autopilot, ralph, ralplan, team, deep-interview, wiki, cancel, ... |
| Slash commands | 41 | every user-invocable skill has a typed `/omcp:<cmd>` route |
| Hook events | 4 | `sessionStart`, `preToolUse`, `postToolUse`, `sessionEnd` — all 4 events Copilot CLI v1.0.43 exposes |
| MCP server tools | 35 | state (6), notepad (6), plan (1), pipeline (2), project memory (4), trace (4), wiki (7), shared memory (5) |

## First commands to try

After install, in an interactive `copilot` session:

```
/omcp:wiki list                                     # see the persistent wiki
/omcp:autopilot create a TODO list for this repo    # full pipeline: spec → plan → code
/omcp:ralplan refactor the auth module              # consensus planning (Planner/Architect/Critic)
/omcp:cancel --all                                  # stop active modes
/omcp:omc-doctor                                    # diagnose interop with Claude Code's OMC plugin
```

## Validate

```bash
bash scripts/run-validation.sh        # 17-check end-to-end (server + bundled tools/list + state contracts)
bash scripts/validate-doc-links.sh    # docs cross-refs
bash scripts/validate-power-surfaces.sh   # manifest counts vs filesystem
node scripts/audit-tool-refs.mjs      # MCP tool reference audit (skill prompts ↔ registered tools)
```

The full bootstrap entry point is `bash scripts/bootstrap-copilot-power.sh`. For agentic interactive proof, see `docs/validation/agentic-tmux-2026-05-07-wave-l.md`.

## Documentation map

| Topic | Doc |
| --- | --- |
| **Install + verify** | [`docs/installation.md`](./docs/installation.md) |
| **Quick start** | [`docs/quick-start.md`](./docs/quick-start.md) |
| **Day-to-day usage** | [`docs/usage.md`](./docs/usage.md) |
| **Limitations + host-product caveats** | [`docs/known-limitations.md`](./docs/known-limitations.md) |
| **Hook surface (4 events)** | [`docs/hook-surface.md`](./docs/hook-surface.md) |
| **State contract** | [`docs/state-contract.md`](./docs/state-contract.md) |
| **Plugin internals** | [`docs/plugin-internal/orchestration.md`](./docs/plugin-internal/orchestration.md), [`docs/plugin-internal/state-management.md`](./docs/plugin-internal/state-management.md) |
| **Design + scope** | [`docs/design-spec.md`](./docs/design-spec.md), [`docs/v1-repo-blueprint.md`](./docs/v1-repo-blueprint.md) |
| **Maintainer release lane** | [`docs/release-checklist.md`](./docs/release-checklist.md) |
| **Adjacent-host comparison (OMC, OMX, Cursor)** | [`docs/comparison-matrix.md`](./docs/comparison-matrix.md), [`docs/copilot-native-mapping.md`](./docs/copilot-native-mapping.md), [`docs/references.md`](./docs/references.md) |
| **Examples** | [`examples/copilot-cli-layout/`](./examples/copilot-cli-layout/), [`examples/vscode-copilot-layout/`](./examples/vscode-copilot-layout/) |
| **Plugin package source** | [`packages/copilot-cli-plugin/`](./packages/copilot-cli-plugin/) |
| **Research + evidence** | [`research/`](./research/), [`benchmark/`](./benchmark/) |

Older wave-time materials live under [`docs/_archive/`](./docs/_archive/) with an index.

## Boundaries (what's *not* here)

The repo is **Copilot CLI-first** and intentionally bounded:

- **No runtime framework** — orchestration relies on Copilot CLI's host primitives (custom agents, slash commands, MCP, hooks). The plugin doesn't reimplement plan/autopilot modes.
- **No tmux worker runtime** and no separate memory subsystem.
- **Out of scope**: Copilot cloud agent, IDE integrations, SDK runtimes, supported Cursor host surface.

The architectural layers are **root workspace** (this repo's `.github/` + `AGENTS.md`), **plugin package** (`packages/copilot-cli-plugin/`), and **examples** (`examples/`). They have distinct ownership and validation; see [`docs/root-registration.md`](./docs/root-registration.md), [`docs/plugin-boundary-review.md`](./docs/plugin-boundary-review.md), and the benchmark snapshot at [`docs/benchmark-status.md`](./docs/benchmark-status.md).

The current refinement priorities — which OMC/OMX lessons land as Copilot-native shipped surfaces, support tooling, or investigation items — are tracked at [`docs/refinement-priority-map.md`](./docs/refinement-priority-map.md).

## Project conventions

Repo-owned claims point to checked-in files, validators, smoke tests, or local evidence. Copilot host-product behavior (plan mode, autopilot mode, delegation) points to GitHub documentation. Adjacent-host references (OMC, OMX, Cursor) stay illustrative or sibling-scoped — never used as proof of repo behavior.

## License

MIT. See [LICENSE](./LICENSE).

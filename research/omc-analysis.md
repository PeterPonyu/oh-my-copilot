# oh-my-claudecode Source Synthesis

_Source inspected: `/home/zeyufu/Desktop/oh-my-claudecode-main`._
_Inspection date: 2026-04-20._

This note summarizes what `oh-my-copilot` should learn from
`oh-my-claudecode` (OMC). It intentionally separates repository evidence from
Copilot-v1 design inference.

## Evidence from the local source

### Product positioning and host boundary

- `README.md` positions OMC as "multi-agent orchestration for Claude Code" and
  as a low-friction layer for Claude Code users, not as a standalone coding
  agent.
- `package.json` publishes the OMC reference runtime as
  `oh-my-claude-sisyphus` and exposes CLI binaries named
  `oh-my-claudecode`, `omc`, and `omc-cli`.
- `README.md:86-99` explicitly separates terminal CLI commands (`omc ...`) from
  in-session Claude Code skills such as `/autopilot`, `/team`,
  `/deep-interview`, and `/ask`.

### Workflow and orchestration surfaces

- `README.md:111-149` describes Team mode as the recommended/canonical OMC
  orchestration surface and distinguishes in-session native teams from
  terminal-launched tmux CLI workers.
- `README.md:221-234` lists multiple execution modes: Team, `omc team` tmux
  workers, `ccg`, Autopilot, Ultrawork, Ralph, Pipeline, and a legacy
  Ultrapilot alias.
- `README.md:283-305` documents in-session shortcuts and makes Team explicit via
  `/team` or `omc team` rather than a bare keyword trigger.
- `AGENTS.md:158-186` routes magic keywords to skills and enforces a
  planning-before-Ralph gate by requiring PRD/test-spec artifacts under
  `.omc/plans/` before implementation-focused work.

### Agents, skills, and guidance files

- The repo contains role prompts under `agents/` including `architect`,
  `executor`, `planner`, `critic`, `security-reviewer`, `test-engineer`,
  `verifier`, and `writer`.
- The repo contains workflow skills under `skills/`, including `autopilot`,
  `deep-interview`, `plan`, `ralph`, `ralplan`, `team`, `ultrawork`, `verify`,
  and `visual-verdict`.
- `AGENTS.md:49-90` describes a delegation model built around specialized
  child agents and role prompts.
- `README.md:254-279` describes custom skills as reusable, auto-injected
  workflow knowledge with project scope at `.omc/skills/` and user scope at
  `~/.omc/skills/`.

### Reference-system depth (not v1 scope)

- `AGENTS.md:344-387` documents `.omc/` as OMC reference runtime storage
  for state, notes, project memory, plans, and logs, plus MCP-backed
  state/memory/code intelligence/trace tools.
- `README.md:361-368` points readers to HUD, session summaries, replay logs,
  and live monitoring surfaces.
- `README.md:393-451` documents OpenClaw notification integration and hook-like
  events such as `session-start`, `stop`, `keyword-detector`,
  `ask-user-question`, `pre-tool-use`, and `post-tool-use`.
- The source tree includes `src/`, `bridge/`, `dist/`, `.mcp.json`, workflow
  docs, CI workflows, and benchmark tooling, showing that OMC is implemented lineage evidence,
  not v1 scope, with a reference runtime and plugin ecosystem rather than only documentation.

## Evidence-backed synthesis

OMC's durable pattern is a host-native workflow layer around Claude Code:

1. it gives users a clear journey from clarification to planning to execution;
2. it names reusable roles and workflows;
3. it makes parallel/team execution visible and inspectable;
4. it persists state and verification expectations; and
5. it uses host-specific surfaces (`CLAUDE.md`, Claude Code skills, Claude Code
   host-specific reference runtime behavior) instead of pretending every host has
   the same API.

OMC is therefore valuable lineage for `oh-my-copilot`, but it is not a parity
contract. Its implemented runtime surfaces are deeper than this repository's v1
research-first scope.

## Design inference for oh-my-copilot v1

### Transfer as principles

- Put reader orientation before mechanics: explain the workflow and non-goals at
  the top of the public repo.
- Preserve role vocabulary such as researcher, reviewer, executor, planner, and
  verifier, but map it onto Copilot CLI custom agents or built-ins instead of
  reusing Claude-specific agent mechanics.
- Treat skills as bounded workflow packages with clear activation contexts,
  preferably using Copilot CLI's documented skill-folder conventions.
- Keep verification language visible in public docs even though v1 does not claim
  no runtime verifier.

### Do not transfer directly

- Do not copy Claude-specific slash commands, plugin marketplace setup, `CLAUDE.md` semantics, or `.omc/` runtime storage into Copilot v1.
- Do not present OMC modes such as Ralph, Ultrawork, or Team as Copilot CLI
  commands unless a later Copilot-native implementation explicitly defines and
  verifies them.
- Do not reproduce OMC's tmux worker runtime or OpenClaw/HUD machinery in v1;
  those are implementation systems, while this repo's approved v1 is a public
  research and blueprint corpus.

## Confidence and gaps

- Confidence: high for local file/path observations and README/AGENTS.md
  synthesis.
- Confidence: medium for transfer recommendations because they depend on current
  Copilot CLI capabilities documented separately in `research/copilot-cli-capabilities.md`.
- Gap: this analysis did not execute OMC workflows; it reads source and docs to
  identify design lineage and scope boundaries.

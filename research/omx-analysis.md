# oh-my-codex Source Synthesis

_Source inspected: `/home/zeyufu/Desktop/oh-my-codex-main`._
_Inspection date: 2026-04-20._

This note summarizes what `oh-my-copilot` should learn from `oh-my-codex`
(OMX). It separates source evidence from Copilot-v1 design inference.

## Evidence from the local source

### Product positioning and host boundary

- `README.md:18-30` positions OMX as a workflow layer for OpenAI Codex CLI that
  keeps Codex as the execution engine while adding stronger startup, workflows,
  and `.omx/` state.
- `README.md:77-85` says OMX is for users who already like Codex and want a
  better reference workflow/runtime around it; users who want plain Codex may
  not need OMX.
- `package.json` publishes `oh-my-codex` and exposes the `omx` binary.
- `README.md:89-95` lists Node.js, Codex CLI auth, and tmux/psmux platform
  requirements, making the reference runtime explicitly host- and
  terminal-oriented.

### Recommended workflow and execution modes

- `README.md:55-75` and `README.md:112-147` recommend the sequence
  `$deep-interview` → `$ralplan` → `$team` or `$ralph`.
- `README.md:149-157` describes common in-session surfaces for clarification,
  planning, persistent completion, coordinated parallel execution, and skill
  browsing.
- `README.md:163-172` documents `omx team` as a durable reference runtime
  for tmux/worktree-coordinated workers.
- `README.md:190-200` exposes `omx explore` for read-only repository lookup and
  `omx sparkshell` for shell-native inspection and bounded verification.

### Guidance, skills, agents, and state

- `AGENTS.md:1-5` contains an autonomy directive for coding agents operating in
  the repository.
- `AGENTS.md:31-47` establishes operating principles around direct execution,
  selective delegation, progress updates, evidence, and verification.
- `AGENTS.md:61-76` sets lane choice rules: deep interview for unclear scope,
  ralplan for approved planning, team for coordinated execution, ralph for
  persistent completion, and solo execution for scoped work.
- `AGENTS.md:78-98` distinguishes leader and worker responsibilities for child
  agents and team workers.
- `AGENTS.md:131-174` maps keywords to workflow skills such as `ralph`,
  `autopilot`, `ultrawork`, `ultraqa`, `analyze`, `plan`, `deep-interview`,
  `ralplan`, `team`, `ecomode`, `tdd`, `code-review`, and `security-review`.
- `AGENTS.md:186-204` defines Team as a staged pipeline and records model
  resolution rules for workers.
- `AGENTS.md:213-288` defines verification, sequencing, command routing, worker
  escalation, and continuation expectations.
- `AGENTS.md:298-313` documents `.omx/` as storage for state, notes, project
  memory, plans, and logs.

### Runtime and implementation depth

- `README.md:174-188` documents setup, doctor, HUD, native Codex hook
  registration in `.codex/hooks.json`, OMX-managed hooks in `.omx/hooks/*.mjs`,
  and fallback tmux/notification paths.
- The source tree includes TypeScript reference runtime modules under `src/`, generated
  distribution files under `dist/`, role prompts under `prompts/`, workflow
  skills under `skills/`, and Rust crates for `omx-explore`, `omx-runtime`,
  `omx-runtime-core`, `omx-mux`, and `omx-sparkshell`.
- The docs tree includes contracts for state, team runtime, runtime authority,
  hooks, release readiness, and QA reports, indicating a substantial reference runtime and verification architecture.

## Evidence-backed synthesis

OMX's core pattern is host-native adaptation for Codex CLI. It does not replace
Codex; it wraps Codex with opinionated guidance, skill routing, planning,
verification, team/worktree orchestration, hooks, and durable `.omx/` state.
The strongest lesson for `oh-my-copilot` is the discipline of respecting the
host platform's native primitives instead of copying another agent system's
reference runtime names or assumptions.

## Design inference for oh-my-copilot v1

### Transfer as principles

- Use `AGENTS.md` as a primary guidance surface because Copilot CLI also has a
  documented relationship with `AGENTS.md` in its custom-instructions model.
- Make the public workflow explicit: clarify intent, create an evidence-backed
  plan, choose a Copilot-native execution surface, and verify outcomes.
- Keep role/skill/verification concepts distinct in the docs so future Copilot
  custom agents and skills can grow without becoming one large prompt file.
- Preserve the idea of lightweight read-only exploration and bounded
  verification, but express it as Copilot CLI behavior or project docs rather
  than as `omx explore`/`omx sparkshell` commands.

### Do not transfer directly

- Do not copy `.omx/` runtime state, tmux workers, HUD, lifecycle APIs, Rust helper crates, or Codex hook machinery into `oh-my-copilot` v1.
- Do not present `$deep-interview`, `$ralplan`, `$team`, or `$ralph` as Copilot
  CLI commands; they are OMX workflow names unless a future Copilot-native plan
  defines equivalents.
- Do not copy Codex model-routing assumptions, native subagent behavior, or
  launch flags into Copilot documentation.
- Do not claim that v1 implements orchestration. The approved v1 repository is
  docs/research-first with illustrative Copilot CLI examples only.

## Confidence and gaps

- Confidence: high for local README/AGENTS.md/source-tree observations.
- Confidence: medium for Copilot transfer recommendations because the binding
  source of truth for Copilot capabilities is the GitHub documentation cited in
  `docs/references.md` and summarized in `research/copilot-cli-capabilities.md`.
- Gap: this analysis did not run OMX workflows; it inspects source and docs to
  identify design lineage, useful vocabulary, and non-transferable reference runtime boundaries.

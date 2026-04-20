# oh-my-codex Source Synthesis

_Source inspected: `/home/zeyufu/Desktop/oh-my-codex-main`._

## Evidence observed

- The README positions OMX as a workflow layer around OpenAI Codex CLI rather
  than a replacement for Codex.
- The recommended flow is `$deep-interview` → `$ralplan` → `$team` or `$ralph`.
- The repo uses `AGENTS.md` as the main orchestration guidance surface and keeps
  runtime state, plans, logs, and memory under `.omx/`.
- Docs and contracts cover guidance schema, state model, hooks, team runtime
  contracts, delivery state, and release verification.
- Source and distribution directories show an implemented Node/Rust runtime,
  prompts, skills, MCP servers, hooks, and team/tmux surfaces.

## Synthesis

OMX is explicitly host-native to Codex: it preserves Codex as the execution
engine and adds routing, planning, state, hooks, and team coordination around it.
Its strongest pattern for `oh-my-copilot` is not the exact runtime, but the
principle of respecting the host's natural interfaces.

## What should transfer to oh-my-copilot

- `AGENTS.md` can be a primary project guidance surface because Copilot CLI also
  recognizes it.
- Planning before execution is a useful public workflow, mapped to Copilot plan
  mode and design docs in v1.
- A clear distinction between workflow skills, role agents, and verification is
  useful for Copilot customizations.
- State/memory claims should be careful and source-backed.

## What should not transfer directly

- `.omx/` runtime state, tmux workers, HUD, and lifecycle APIs are OMX-specific.
- `$ralph`, `$team`, and `$ralplan` should not be presented as Copilot CLI
  commands in v1.
- Codex model-routing contracts should not be copied into Copilot docs.

## Evidence vs inference

The observations are based on local repository files. The transfer guidance is
inference and should be revalidated if Copilot CLI changes.

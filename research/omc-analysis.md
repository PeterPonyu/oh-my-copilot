# oh-my-claudecode Source Synthesis

_Source inspected: `/home/zeyufu/Desktop/oh-my-claudecode-main`._

## Evidence observed

- The README positions OMC as multi-agent orchestration for Claude Code with a
  zero-learning-curve, natural-language workflow.
- OMC exposes both terminal CLI commands (`omc ...`) and Claude Code in-session
  skills such as `/autopilot`, `/team`, `/deep-interview`, and `/ask`.
- Team mode is documented as the canonical orchestration surface, with both
  in-session native teams and tmux CLI workers for Claude/Codex/Gemini panes.
- Repository files include `CLAUDE.md`, `AGENTS.md`, `agents/`, `skills/`,
  `hooks/`, `.mcp.json`, source under `src/`, and docs for architecture,
  features, monitoring, and developer APIs.
- Architecture docs describe agent lanes, skills, hooks, state management,
  model routing, and persistent completion loops.

## Synthesis

OMC's public value comes from turning Claude Code into a structured workflow
surface: clarify requirements, select or route to specialized roles, execute in
parallel when useful, persist state, and verify before completion. It is more
than a collection of prompts; it also includes runtime machinery, plugin setup,
team orchestration, hooks, monitoring, and state capture.

## What should transfer to oh-my-copilot

- Public onboarding should explain the workflow before the mechanics.
- Role language (researcher, reviewer, executor, verifier) is useful when mapped
  to Copilot custom agents or built-ins.
- Skills should remain bounded, reusable workflow packages.
- Verification discipline should be explicit and visible.

## What should not transfer directly

- Claude-specific setup commands, plugin marketplace flows, and `CLAUDE.md`
  semantics are host-specific.
- OMC's tmux worker runtime is not a v1 Copilot CLI deliverable.
- OMC command names should not become Copilot names unless Copilot primitives
  support them naturally.

## Evidence vs inference

The file/path observations above are evidence from the local repository. The
transfer recommendations are design inference for Copilot CLI v1.

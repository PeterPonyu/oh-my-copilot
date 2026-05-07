---
name: cancel
description: End an active orchestration mode (autopilot, ralph, ralplan, team, ultrawork, ultraqa, sciomc) and clean its state
argument-hint: "[mode]   |   --force   |   --all"
---

# /omcp:cancel

Terminate any active omcp orchestration mode. Use this when:
- An autopilot/ralph/team run is stuck and won't complete
- You want to abort a session and start fresh
- A skill's stop-hook keeps reactivating after the task is actually done

The skill at `skills/cancel/SKILL.md` defines the full procedure. Concretely:

1. Call `mcp__omcp__state_list_active` to discover what's running.
2. For each active mode (in dependency order: autopilot → ralph → ultrawork → ultraqa → team → ...), call `mcp__omcp__state_clear({mode, session_id})` to write the 30-second cancel tombstone.
3. Report what was cancelled with each mode's last-known phase.
4. With `--force` or `--all`: also clear legacy `.omcp/state/*-state.json` files outside the current session.

If `mcp__omcp__state_clear` is unavailable, fall back to the `bash` direct-file-removal block in `skills/cancel/SKILL.md` (NEVER use the fallback for autopilot or cli-teams — those need state preserved or tmux cleanup).

Argument: {{ARGUMENTS}}

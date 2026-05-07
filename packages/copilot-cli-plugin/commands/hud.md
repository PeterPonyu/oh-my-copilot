---
name: hud
description: Configure the OMC HUD statusline (Claude Code only — has no effect in Copilot CLI)
argument-hint: "[setup | minimal | focused | full | status]"
---

# /omcp:hud

Configure the Heads-Up Display statusline for **Claude Code**. This skill writes to `~/.claude/` paths and has no effect on Copilot CLI sessions — Copilot has its own statusline at the bottom of the TUI.

The skill at `skills/hud/SKILL.md` defines the full procedure. Sub-actions:

| Argument | Effect |
|---|---|
| (no arg) | Show current HUD status (auto-setup if needed) |
| `setup` | Install/repair HUD wrapper script + settings.json entry |
| `minimal` | Switch to minimal display (path + branch only) |
| `focused` | Switch to focused display (default) |
| `full` | Switch to full display (all elements) |
| `status` | Show detailed HUD status |

If you're running this from Copilot CLI and want a similar prompt-line indicator, that's not addressable from here — it's a Copilot host-product feature.

Action: {{ARGUMENTS}}

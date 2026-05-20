---
name: omc-doctor
description: "[OMCP] Diagnose and fix oh-my-claudecode (OMC) installation issues. For diagnostics of THIS plugin (omcp), run `bash scripts/run-validation.sh` from the repo root."
argument-hint: "[--json]   |   [check name]"
---

# /omcp:omc-doctor

OMC-interop diagnostic. Targets `~/.claude/` Claude Code installations, **not** this Copilot CLI plugin.

The skill at `skills/omc-doctor/SKILL.md` defines the full procedure. Check:
- OMC plugin install version vs latest cached
- CLAUDE.md OMC marker presence (`<!-- OMC:START -->`)
- Hook config integrity in `~/.claude/settings.json`
- Companion file split (CLAUDE-omc.md) if used

To diagnose **omcp** (this plugin), use `bash scripts/run-validation.sh` from the repo root — that exercises the omcp install state directly.

Diagnostic flag: {{ARGUMENTS}}

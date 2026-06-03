---
name: omc-setup
description: "[OMCP] OMC-interop setup. Installs/refreshes a separate oh-my-claudecode (Claude Code) install — NOT this Copilot CLI plugin."
argument-hint: "<input>"
---

# /omcp:omc-setup

**OMC-interop setup.** This route installs or refreshes a *separate*
oh-my-claudecode (Claude Code) install — the source product that runs under
Claude Code. It does **not** install this Copilot CLI plugin (omcp). To install
or refresh **omcp itself**, run `copilot plugin install ./packages/copilot-cli-plugin`
(see the project README); there is no separate setup wizard for the plugin.

Use this only when you also run Claude Code on the same machine and want to set
up oh-my-claudecode there (CLAUDE.md, HUD, etc.).

The skill at `skills/omc-setup/SKILL.md` defines the full procedure. Follow
that skill's instructions, using `{{ARGUMENTS}}` as the user input.

Task: {{ARGUMENTS}}

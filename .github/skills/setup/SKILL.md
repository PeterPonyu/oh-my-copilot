---
name: setup
description: Use first for install/update routing — sends setup, doctor, or MCP requests to the correct OMC setup flow
level: 2
---

<!-- omc-port-translated: v1 -->
<!-- source: references/oh-my-claudecode/skills/setup/SKILL.md | wave: 4.5 -->
# Setup

Use `/omcp:setup` as the unified setup/configuration entrypoint.

## Usage

```bash
/omcp:setup                # full setup wizard
/omcp:setup doctor         # installation diagnostics
/omcp:setup mcp            # MCP server configuration
/omcp:setup wizard --local # explicit wizard path
```

## Routing

Process the request by the **first argument only** so install/setup questions land on the right flow immediately:

- No argument, `wizard`, `local`, `global`, or `--force` -> route to `/omcp:omc-setup` with the same remaining args
- `doctor` -> route to `/omcp:omc-doctor` with everything after the `doctor` token
- `mcp` -> route to `/omcp:mcp-setup` with everything after the `mcp` token

Examples:

```bash
/omcp:setup --local          # => /omcp:omc-setup --local
/omcp:setup doctor --json    # => /omcp:omc-doctor --json
/omcp:setup mcp github       # => /omcp:mcp-setup github
```

## Notes

- `/omcp:omc-setup`, `/omcp:omc-doctor`, and `/omcp:mcp-setup` remain valid compatibility entrypoints.
- Prefer `/omcp:setup` in new documentation and user guidance.

Task: {{ARGUMENTS}}

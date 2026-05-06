# OMC -> OMX translation diff

Source: tools/omc-port/test-fixtures/fixture-01-simple/input/SKILL.md
Replacements: 3

- line 2: `Skill("oh-my-claudecode:planner")` -> `[Run /planner to continue the pipeline]\n<!-- TODO: P0/P1 skill planner may need its slash command in commands/planner.md (Wave 6) -->`
- line 5: `mcp__plugin_oh-my-claudecode_t__state_read` -> `mcp__omcp__state_read`
- line 7: `oh-my-claudecode:` -> `oh-my-copilot:`

---
name: example-skill
description: Minimal OMC skill exercising one Skill() call and one MCP tool reference.
argument-hint: "<topic>"
---

<!-- omc-port-translated: v1 -->
<!-- source: tools/omc-port/test-fixtures/fixture-01-simple/input/SKILL.md | wave: 4.5 -->
This skill demonstrates the translator. First it calls [Run /planner to continue the pipeline]
<!-- TODO: P0/P1 skill planner may need its slash command in commands/planner.md (Wave 6) --> to plan the work.

Then it reads state via mcp__omcp__state_read for context.

The oh-my-copilot: namespace prefix should also be normalized in commentary.

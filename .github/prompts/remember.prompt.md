---
name: remember
description: "[OMCP] Review reusable project knowledge and route it to project-memory, notepad, or durable docs"
argument-hint: "[what to remember]   e.g. 'we use Postgres 16 in prod'   |   '@directive: always use --force-with-lease'"
---

# /omcp:remember

Triage knowledge from the current session and persist it via the right MCP tool. Use this when something worth keeping has surfaced (a project fact, a decision, a constraint, a recipe) and you want it to survive across sessions.

The skill at `skills/remember/SKILL.md` defines the routing logic. Concretely:

1. Classify `{{ARGUMENTS}}` as one of:
   - **Fact** ("we use Postgres 16") → `mcp__omcp__project_memory_write({facts: {key: value}})`
   - **Note** ("auth flow uses passport-jwt with 15min refresh") → `mcp__omcp__project_memory_add_note({text, tags})`
   - **Directive** (rule/preference: "@directive: always use --force-with-lease") → `mcp__omcp__project_memory_add_directive({text, scope: "permanent"})`
   - **Working scratchpad** (transient, current session only) → `mcp__omcp__notepad_write_working({entry})`
   - **Permanent reminder** (don't prune) → `mcp__omcp__notepad_write_priority({entry})`
   - **Wiki-worthy** (long-form, queryable) → suggest `/omcp:wiki add <title> <body>` instead
2. Write to the right destination, then quote what was saved + where.

If the input is ambiguous, ask which destination before saving — don't guess. Saving in the wrong place clutters retrieval later.

Knowledge: {{ARGUMENTS}}

# [OMCP] Memory and rules policy

Apply this instruction when working in repositories that use the OMCP plugin
memory, wiki, notepad, shared-memory, or rules surfaces.

## Policy model

- **Role** defines who an agent is.
- **Skill** defines how the agent acts for a task class.
- **Tool/MCP** defines external capability.
- **Rules** define long-lived behavioral constraints.
- **Memory** preserves reusable project knowledge and active context.

This means skills should usually be written as execution protocols, not as
generic expertise claims. A good skill states when to trigger, what files to
read first, what tools to use, how to verify, what to do on failure, and what
output to leave behind.

## Storage ownership

- `.omcp/rules/` stores project-local rule files owned by the repository.
- `.github/instructions/` and `.github/copilot-instructions.md` remain valid
  Copilot/GitHub instruction sources and are also discovered by OMCP rules.
- `.cursor/rules/` and `.claude/rules/` are read as adjacent-host rule sources
  when present, but OMCP does not claim to own those hosts.
- `~/.config/oh-my-copilot/rules/` stores user-level rules.
- `.omcp/project-memory.json` stores durable facts, notes, and directives.
- `.omcp/notepad.md` stores short-lived priority, working, and manual context.
- `.omcp/wiki/` stores reviewable markdown knowledge with keyword/tag search.
- `.omcp/shared-memory/` stores coordination messages between agents.

## Rule lookup

OMCP rules are lazy. When a file-touch tool reads, writes, or edits a path, the
post-tool hook records matching rules in `.omcp/state/rules-pending.json`.
Agents can then inspect pending context through:

- `mcp__omcp__rules_pending_read`
- `omcp://rules/pending`

Unscoped pending reads return a redacted summary. Pass the active `session_id`
when an agent needs the full pending rule text for its own session.

Use `mcp__omcp__rules_context_for_file` to preview or explicitly capture rules
for a path, and `mcp__omcp__rules_policy_report` to inspect the current rule
sources and policy ownership map.

## Rule file format

Rule files are Markdown. Optional frontmatter supports:

```yaml
---
description: Testing policy
globs:
  - "**/*.test.mjs"
alwaysApply: false
---
```

Use `alwaysApply: true` only for short, broadly relevant rules. Prefer `globs`
for path-specific policy so the agent receives the rule only when it touches the
matching part of the repository.

GitHub-style instruction frontmatter using comma-separated `applyTo` patterns is
also treated as path-specific rule scope.

## Memory classification

Before storing knowledge, classify it:

- Store durable project facts and stable directives in project memory.
- Store active, next-turn context in notepad priority or working lanes.
- Store reusable architecture, debugging, convention, and decision knowledge in
  the wiki.
- Store inter-agent findings/questions in shared memory.
- Do not dump every observation into all stores.
- Mark uncertain knowledge as uncertain instead of saving it as fact.

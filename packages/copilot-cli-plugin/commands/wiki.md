---
name: wiki
description: Persistent markdown knowledge base that compounds across sessions (add / read / list / query / lint / ingest / delete)
argument-hint: "<action> [args]   e.g. add 'Auth' 'jwt+passport'   |   query authentication   |   list --tag arch   |   lint"
---

# /omcp:wiki

Manage the persistent omcp wiki at `.omcp/wiki/`. Pages survive across sessions and are queryable by substring.

The skill at `skills/wiki/SKILL.md` defines the full procedure. Parse `{{ARGUMENTS}}` to determine the action and dispatch the matching MCP tool:

| Action | MCP tool | Required args |
|---|---|---|
| `add <title> <body> [tags...]` | `mcp__omcp__wiki_add` | `{title, body, tags?}` |
| `read <slug>` | `mcp__omcp__wiki_read` | `{slug}` |
| `list [--tag X]` | `mcp__omcp__wiki_list` | `{tag?}` |
| `query <q> [-k N]` | `mcp__omcp__wiki_query` | `{q, k?}` |
| `delete <slug>` | `mcp__omcp__wiki_delete` | `{slug}` |
| `ingest <path> [tags...]` | `mcp__omcp__wiki_ingest` | `{path, tags?}` |
| `lint` | `mcp__omcp__wiki_lint` | `{}` |

After each call, format the result for the user (cite slugs, surface the body for `read`, summarize matches for `query`). On query result, synthesize an answer with citations rather than just dumping the JSON.

Action: {{ARGUMENTS}}

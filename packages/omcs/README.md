# omcs (oh-my-cursor)

**Status:** reserved path — no code lives here yet.

## Why this directory exists

`omcs` (oh-my-cursor) is the Cursor-IDE-targeted sibling of `omcp` (this repo's
oh-my-copilot Copilot CLI plugin). The two share the same author, agent
catalog ideas, and orchestration design, but they target different host
products with different primitives:

| | omcp (Copilot CLI) | omcs (Cursor IDE) |
|---|---|---|
| Hook events | 4 lifecycle events | 2 product-defined events |
| Agent surface | Plugin-registered subagents | `.cursor/agents/` |
| MCP server | Yes (35 tools) | None (Cursor doesn't expose MCP) |
| Rule delivery | Skill prompts + CLAUDE.md analogue | Cursor-native `.cursor/rules/` |

Trying to abstract over both at the package layer would be premature
optimization. Instead, they live as separate packages in this monorepo so:

- **Fixes propagate**: shared agent prompts, shared docs, shared validators —
  same release lane, no propagation tax.
- **Publishing is decoupled**: `omcp` ships to the Copilot CLI plugin
  marketplace; `omcs` (when it has code) ships through Cursor's plugin path.
- **Identity stays clear**: each package's README owns the host-specific
  documentation; cross-links keep the relationship navigable.

## When this directory will get real code

Per [ADR-4 of `.omcp/plans/post-wave-b-consolidation.md`](../../.omcp/plans/post-wave-b-consolidation.md),
omcs is **deferred, not separated**. The directory exists today to:

1. Lock the path so future omcs work has an unambiguous home.
2. Avoid re-litigating the omcp-vs-omcs structure question.
3. Make the cross-link from the omcp plugin README a valid file pointer.

omcs will get real code (skills, agents, rules) when there is concrete
demand from a Cursor-using contributor or when omcp has stabilized enough
that the cross-host abstraction question can be answered from evidence.

## Sibling

See [`packages/copilot-cli-plugin/`](../copilot-cli-plugin/) for the active
omcp plugin.

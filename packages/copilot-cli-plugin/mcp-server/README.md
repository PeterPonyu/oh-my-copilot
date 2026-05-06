# oh-my-copilot MCP Server

Workspace-state MCP server for oh-my-copilot.

## Installation

After running `copilot plugin install`, execute the build script once to install dependencies:

```bash
bash packages/copilot-cli-plugin/mcp-server/build.sh
```

The script is idempotent — it skips `npm install` if `node_modules/` is already present and `package-lock.json` has not changed.

## Tool Reference

| Tool | Signature | Purpose | Storage path |
|---|---|---|---|
| `state_read` | `(key: string) → { value: any \| null, exists: bool }` | Read a JSON value by key | `.omcp/state/<key>.json` |
| `state_write` | `(key: string, value: any) → { ok: bool, path: string }` | Atomic write (temp + rename) | `.omcp/state/<key>.json` |
| `state_list` | `() → { keys: string[] }` | List all state keys | `.omcp/state/` |
| `notepad_read` | `(tail?: number) → { content: string }` | Read notepad, optionally last N lines | `.omcp/notepad.md` |
| `notepad_write` | `(entry: string, priority?: "manual"\|"working"\|"priority") → { ok: bool }` | Append timestamped entry | `.omcp/notepad.md` |
| `plan_list` | `() → { plans: { path: string, slug: string, title: string }[] }` | Enumerate plan files | `.omcp/plans/` |

Tools appear in the MCP namespace as `mcp__omcp__<tool_name>`.

## Storage Roots

All paths are workspace-relative (relative to `process.cwd()` when the server starts):

| Path | Used by |
|---|---|
| `.omcp/state/` | `state_read`, `state_write`, `state_list` |
| `.omcp/notepad.md` | `notepad_read`, `notepad_write` |
| `.omcp/plans/` | `plan_list` |

Directories are auto-created on first write. Keys passed to `state_read`/`state_write` must not contain `..`, `/`, or start with `.`.

## Configuration

The server is registered in `.mcp.json` at the plugin root:

```json
{
  "mcpServers": {
    "oh-my-copilot": {
      "command": "node",
      "args": ["./mcp-server/server.mjs"],
      "transport": "stdio"
    }
  }
}
```

## SDK

Pinned to `@modelcontextprotocol/sdk@^1.18`. The server uses:

- `Server` from `@modelcontextprotocol/sdk/server/index.js`
- `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`

## v2 Follow-ups

- `wiki_query` — deferred until `.omcp/wiki/` has backing content. Re-introduce in v2 when the wiki store ships.

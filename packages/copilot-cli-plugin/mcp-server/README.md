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

## Concurrency contract per tool family

Per ADR-1 of the post-Wave-B consolidation plan, the storage primitives have explicit per-family concurrency rules. The summary:

| Family | Tools | Atomicity | Concurrent writers |
|---|---|---|---|
| `state_*` | read, write, list, clear, get_status, list_active | Atomic via temp+rename for writes | Single-writer-per-workspace assumed; behavior under concurrent writers is undefined |
| `notepad_*` | read, write, write_priority, write_working, prune, stats | Atomic temp+rename for prune; `appendFile` for writes (single small line) | Single-writer-per-workspace assumed |
| `project_memory_*` | read, write, add_note, add_directive | Atomic via temp+rename | Single-writer-per-workspace assumed |
| `wiki_*` | add, read, list, query, delete, ingest, lint | Atomic via temp+rename for index; direct write for body files | Single-writer-per-workspace assumed |
| `shared_memory_*` | write, read, list, delete, cleanup | Per-call FS-atomic for entries ≤4KB on Linux; `_meta.json` updated atomically via temp+rename | **Multi-reader, multi-writer.** Last-write-wins for `_meta.json`. Per-entry interleaving possible if `Buffer.byteLength(JSON.stringify(event) + "\n", "utf8") > 4096`. |

### Why 4KB

`fs.appendFile` calls `write(2)` with the full payload. POSIX guarantees atomicity for `≤PIPE_BUF` writes on pipes; on regular files, atomicity for sub-page writes is filesystem-dependent but holds in practice on ext4/xfs/apfs. The 4KB threshold is the conservative POSIX line.

When `sharedMemoryWrite` encodes a message larger than 4KB, the store emits a rate-limited stderr warning (deduped per `(channel, size)` within a 60-second window):

```
[shared_memory] WARNING: entry size <bytes>B on channel '<channel>' exceeds 4096B; concurrent writers may interleave
```

Callers requiring guaranteed atomicity for >4KB entries must serialize concurrent writes themselves (e.g., one writer per agent role).

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

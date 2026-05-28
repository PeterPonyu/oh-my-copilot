# oh-my-copilot MCP Server

Workspace-state MCP server for oh-my-copilot.

## Installation

End-user plugin installs use the committed bundle in `dist/server.mjs`; they do
not need to run `build.sh` or install MCP server dependencies. The build script
is a development-only helper for maintainers who changed `server.mjs` or one of
the store modules and need to regenerate the checked-in bundle.

```bash
# Development only: refresh packages/copilot-cli-plugin/mcp-server/dist/server.mjs
bash packages/copilot-cli-plugin/mcp-server/build.sh
```

The script is idempotent and skips rebuilding when source files and dependency
checksums are unchanged.

## Tool Reference

The authoritative tool schema is the MCP `tools/list` response emitted by
`server.mjs`. Keep this README as the human-readable inventory and use tests plus
`scripts/audit-tool-refs.mjs` to catch drift. Current tools (41):

- `state_read`, `state_write`, `state_list`, `state_clear`, `state_get_status`, `state_list_active`
- `notepad_read`, `notepad_write`, `notepad_write_priority`, `notepad_write_working`, `notepad_write_manual`, `notepad_prune`, `notepad_stats`
- `project_memory_read`, `project_memory_write`, `project_memory_add_note`, `project_memory_add_directive`, `project_memory_prune`
- `trace_write`, `trace_summary`, `trace_timeline`, `trace_list_sessions`
- `wiki_add`, `wiki_read`, `wiki_list`, `wiki_query`, `wiki_delete`, `wiki_ingest`, `wiki_lint`
- `shared_memory_write`, `shared_memory_read`, `shared_memory_list`, `shared_memory_delete`, `shared_memory_cleanup`
- `rules_context_for_file`, `rules_pending_read`, `rules_pending_clear`, `rules_policy_report`
- `plan_list`, `pipeline_record_transition`, `pipeline_state`

Common storage-backed tools:

| Tool | Signature | Purpose | Storage path |
|---|---|---|---|
| `state_read` | `(key: string) → { value: any | null, exists: bool }` | Read a JSON value by key | `.omcp/state/<key>.json` |
| `state_write` | `(key: string, value: any) → { ok: bool, path: string }` | Atomic write (temp + rename) | `.omcp/state/<key>.json` |
| `state_list` | `() → { keys: string[] }` | List all state keys | `.omcp/state/` |
| `notepad_read` | `(tail?: number) → { content: string }` | Read notepad, optionally last N lines | `.omcp/notepad.md` |
| `notepad_write` | `(entry: string, priority?: "manual"|"working"|"priority") → { ok: bool }` | Append timestamped entry | `.omcp/notepad.md` |
| `notepad_write_manual` | `(entry: string) → { ok: bool }` | Append explicitly to the manual lane | `.omcp/notepad.md` |
| `rules_context_for_file` | `(path: string, tool?: string, session_id?: string) → { matched: number, entry: object }` | Discover and capture pending rule context for a touched file | `.omcp/state/rules-pending.json` |
| `rules_pending_read` | `(session_id?: string, limit?: number) → { entries: object[] }` | Read captured pending rule context; unscoped reads redact rule bodies and project roots | `.omcp/state/rules-pending.json` |
| `rules_pending_clear` | `(session_id?: string) → { ok: bool, removed: number }` | Clear captured pending rule context | `.omcp/state/rules-pending.json` |
| `rules_policy_report` | `(path?: string) → { policy: object }` | Explain OMCP rules/memory ownership and discovered rule counts | `.omcp/state/`, rule source dirs |
| `plan_list` | `() → { plans: { path: string, slug: string, title: string }[] }` | Enumerate plan files | `.omcp/plans/` |

Tools appear in the MCP namespace as `mcp__omcp__<tool_name>`.

## Storage Roots

All paths are workspace-relative (relative to `process.cwd()` when the server starts):

| Path | Used by |
|---|---|
| `.omcp/state/` | `state_read`, `state_write`, `state_list` |
| `.omcp/state/rules-pending.json` | `rules_context_for_file`, `rules_pending_read`, `rules_pending_clear` |
| `.omcp/rules/` | Project-local rule files discovered by `rules_context_for_file` |
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
| `rules_*` | context_for_file, pending_read, pending_clear, policy_report | Atomic via temp+rename for pending and dedupe JSON | Single-writer-per-workspace assumed; duplicate suppression is best-effort per session |

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
    "omcp": {
      "command": "node",
      "args": ["./mcp-server/dist/server.mjs"],
      "transport": "stdio"
    }
  }
}
```

## SDK

Pinned to `@modelcontextprotocol/sdk@^1.18`. The server uses:

- `Server` from `@modelcontextprotocol/sdk/server/index.js`
- `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`

## Wiki query log (`.omcp/wiki/log.md`)

`wiki_query` appends one JSON line per call to `.omcp/wiki/log.md`:

```
{"ts":"2026-05-07T12:00:00.000Z","query":"authentication","result_count":3}
```

This is **write-only**; no automated reader consumes it. Per ADR-5 of the post-Wave-B consolidation plan, the user reviews this file manually every ~30 days via `grep` to decide whether substring-search relevance has degraded enough to trigger an embedding-based search upgrade. Trigger condition: >20 results in >50% of recent queries.

Logging is best-effort — failures don't propagate to the `wiki_query` caller.

## v2 Follow-ups

- Embedding-based wiki search (deferred under ADR-5; trigger fires when query log shows degraded substring relevance).

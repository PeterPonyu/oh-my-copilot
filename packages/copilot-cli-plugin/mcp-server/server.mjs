#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  stateRead,
  stateWrite,
  stateList,
  stateClear,
  stateGetStatus,
  stateListActive,
} from "./state-store.mjs";
import {
  notepadRead,
  notepadWrite,
  notepadWritePriority,
  notepadWriteWorking,
  notepadPrune,
  notepadStats,
} from "./notepad-store.mjs";
import { planList } from "./plan-store.mjs";
import {
  projectMemoryRead,
  projectMemoryWrite,
  projectMemoryAddNote,
  projectMemoryAddDirective,
} from "./project-memory-store.mjs";
import {
  traceWrite,
  traceTimeline,
  traceSummary,
  traceListSessions,
} from "./trace-store.mjs";
import {
  wikiAdd,
  wikiRead,
  wikiList,
  wikiQuery,
  wikiDelete,
  wikiIngest,
  wikiLint,
} from "./wiki-store.mjs";
import {
  sharedMemoryWrite,
  sharedMemoryRead,
  sharedMemoryList,
  sharedMemoryDelete,
  sharedMemoryCleanup,
} from "./shared-memory-store.mjs";
import {
  rulesContextForFile,
  rulesPendingRead,
  rulesPendingClear,
  rulesPolicyReport,
} from "./rules-store.mjs";
import { readStage, transitionRecord } from "../orchestrator/orchestrator.mjs";
import {
  listResources,
  listResourceTemplates,
  readResource,
  subscribeResource,
  unsubscribeResource,
  isResourceSubscribed,
} from "./resources.mjs";
import { listPrompts, getPrompt } from "./prompts.mjs";
import { resourceEvents } from "./events.mjs";

const server = new Server(
  { name: "omcp", version: "0.8.0" },
  {
    capabilities: {
      tools: {},
      resources: { subscribe: true },
      prompts: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "state_read",
      description:
        "Read a JSON value from state. Pass {key} for direct key access (.omcp/state/<key>.json), or {mode} for orchestration-mode shorthand (reads .omcp/state/<mode>-state.json). Returns {value, exists}.",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string", description: "State key (filename without .json)" },
          mode: {
            type: "string",
            description: "Orchestration mode shorthand — reads <mode>-state.json (compat form)",
          },
        },
        required: [],
      },
    },
    {
      name: "state_write",
      description:
        "Atomically write a JSON value to state. Two forms accepted: (1) explicit {key, value} writes to .omcp/state/<key>.json verbatim. (2) compat {mode, ...rest} writes the rest object as the value to .omcp/state/<mode>-state.json (with mode stripped). Form 2 supports the OMC-style state_write(mode='team', active=true, current_phase='...', state={...}) pseudocode used in ported skills.",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string", description: "State key (form 1)" },
          value: { description: "JSON-serializable value (form 1)" },
          mode: {
            type: "string",
            description: "Orchestration mode (form 2) — writes to <mode>-state.json",
          },
          active: { type: "boolean", description: "Mode active flag (form 2)" },
          current_phase: { type: "string", description: "Mode phase (form 2)" },
          session_id: { type: "string", description: "Session id (form 2)" },
          state: {
            type: "object",
            description: "Custom mode state sub-object (form 2)",
          },
        },
        required: [],
      },
    },
    {
      name: "state_list",
      description: "List all keys present in .omcp/state/",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "state_clear",
      description:
        "Write a 30-second cancel tombstone for an orchestration mode (writes to .omcp/state/<mode>-state.json). Pass {mode, session_id} for orchestration cancellation, or {key} to overwrite an arbitrary state key with a tombstone.",
      inputSchema: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            description: "Orchestration mode (ralph, autopilot, team, ralplan, etc.) — writes <mode>-state.json",
          },
          key: {
            type: "string",
            description: "Explicit state key (used when no mode is supplied)",
          },
          session_id: {
            type: "string",
            description: "Session id to record on the tombstone",
          },
          cancelTtl: {
            type: "number",
            description: "Cancel-signal TTL in seconds (default: 30)",
          },
        },
        required: [],
      },
    },
    {
      name: "state_get_status",
      description:
        "Read the orchestration status for a mode. Returns {mode, exists, active, session_id, started_at, last_seen, cancelled?, in_grace_period?}.",
      inputSchema: {
        type: "object",
        properties: {
          mode: { type: "string", description: "Orchestration mode" },
        },
        required: ["mode"],
      },
    },
    {
      name: "state_list_active",
      description:
        "List orchestration modes currently active (state file exists with active=true). Returns {active: [{mode, session_id, started_at, last_seen}]}.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "notepad_read",
      description: "Read .omcp/notepad.md, optionally limiting to the last N lines",
      inputSchema: {
        type: "object",
        properties: {
          tail: {
            type: "number",
            description: "If set, return only the last N lines",
          },
        },
        required: [],
      },
    },
    {
      name: "notepad_write",
      description: "Append a timestamped entry to .omcp/notepad.md",
      inputSchema: {
        type: "object",
        properties: {
          entry: { type: "string", description: "Text to append" },
          priority: {
            type: "string",
            enum: ["manual", "working", "priority"],
            description: "Entry priority label (default: manual)",
          },
        },
        required: ["entry"],
      },
    },
    {
      name: "notepad_write_priority",
      description:
        "Append a 'priority' lane entry to .omcp/notepad.md. Priority entries are preserved by default in notepad_prune (use them for permanent reminders).",
      inputSchema: {
        type: "object",
        properties: {
          entry: { type: "string", description: "Text to append" },
        },
        required: ["entry"],
      },
    },
    {
      name: "notepad_write_working",
      description:
        "Append a 'working' lane entry to .omcp/notepad.md. Working entries are pruned by default (use them for in-progress scratchpad).",
      inputSchema: {
        type: "object",
        properties: {
          entry: { type: "string", description: "Text to append" },
        },
        required: ["entry"],
      },
    },
    {
      name: "notepad_prune",
      description:
        "Drop entries older than maxAgeDays from the notepad. By default targets manual+working lanes only (priority lane is preserved). Pass {lane} to target a single lane explicitly.",
      inputSchema: {
        type: "object",
        properties: {
          maxAgeDays: {
            type: "number",
            description: "Age threshold in days (default: 7). Entries older than this are removed.",
          },
          lane: {
            type: "string",
            enum: ["manual", "working", "priority"],
            description: "If set, only this lane is considered. Otherwise, manual+working are pruned and priority is preserved.",
          },
        },
        required: [],
      },
    },
    {
      name: "notepad_stats",
      description:
        "Return notepad lane counts plus oldest/newest timestamps. Returns {total, byLane: {manual, working, priority}, oldest, newest, unparseable}.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "project_memory_read",
      description:
        "Read .omcp/project-memory.json. Returns {version, notes, directives, facts}. Filter by {kind: 'notes'|'directives'|'facts'}, by {tag} (notes only), or cap by {limit} (last N entries).",
      inputSchema: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["notes", "directives", "facts"],
            description: "If set, return only this section",
          },
          tag: {
            type: "string",
            description: "Filter notes by tag (notes have a tags[] array)",
          },
          limit: {
            type: "number",
            description: "Return only the last N notes/directives",
          },
        },
        required: [],
      },
    },
    {
      name: "project_memory_write",
      description:
        "Merge keys into .omcp/project-memory.json facts map. Pass {facts: {key: value, ...}} to set/overwrite; pass null/undefined values to delete keys.",
      inputSchema: {
        type: "object",
        properties: {
          facts: {
            type: "object",
            description: "Key-value facts to merge. null deletes a key.",
          },
        },
        required: ["facts"],
      },
    },
    {
      name: "project_memory_add_note",
      description:
        "Append a timestamped note to .omcp/project-memory.json with optional tags. Returns the assigned note id.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Note text" },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Optional tags for filtering",
          },
        },
        required: ["text"],
      },
    },
    {
      name: "project_memory_add_directive",
      description:
        "Append a directive (rule/preference/policy) to .omcp/project-memory.json. Scope is 'permanent' (default) or 'session'.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Directive text" },
          scope: {
            type: "string",
            enum: ["session", "permanent"],
            description: "Lifetime scope (default: permanent)",
          },
        },
        required: ["text"],
      },
    },
    {
      name: "trace_write",
      description:
        "Append an evidence-driven trace event to .omcp/traces/<session_id>.jsonl. Used by debugger/tracer agents and the postToolUse hook (on tool failures) to build a causal log across a session.",
      inputSchema: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["tool_failure", "tool_call", "hypothesis", "evidence", "outcome", "note"],
            description: "Event kind (drives summary aggregation)",
          },
          text: { type: "string", description: "Free-form description of the event" },
          hypothesis: { type: "string", description: "Hypothesis text (kind=hypothesis)" },
          evidence: { type: "string", description: "Evidence text (kind=evidence)" },
          outcome: { type: "string", description: "Outcome text (kind=outcome)" },
          tool: { type: "string", description: "Tool name (kind=tool_call/tool_failure)" },
          exit_code: { type: "number", description: "Exit code (kind=tool_failure)" },
          stderr_snippet: { type: "string", description: "First N chars of stderr (kind=tool_failure)" },
          session_id: { type: "string", description: "Trace session id (default: 'default')" },
        },
        required: ["kind"],
      },
    },
    {
      name: "trace_summary",
      description:
        "Aggregate trace events for a session: per-kind counts, first/last timestamps, latest outcome, and the list of hypotheses logged.",
      inputSchema: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "Trace session id (default: 'default')" },
        },
        required: [],
      },
    },
    {
      name: "trace_timeline",
      description:
        "Return ordered trace events for a session. Optional {kind} filter and {limit} for last-N slicing.",
      inputSchema: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "Trace session id (default: 'default')" },
          kind: {
            type: "string",
            enum: ["tool_failure", "tool_call", "hypothesis", "evidence", "outcome", "note"],
            description: "Filter to one event kind",
          },
          limit: { type: "number", description: "Return only the last N matching events" },
        },
        required: [],
      },
    },
    {
      name: "trace_list_sessions",
      description: "List all trace session ids present in .omcp/traces/.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "wiki_add",
      description:
        "Create or overwrite a wiki entry at .omcp/wiki/<slug>.md with title and body. Slug is auto-derived from title if not given.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Human-readable title" },
          body: { type: "string", description: "Markdown body" },
          tags: { type: "array", items: { type: "string" }, description: "Tags for filtering" },
          slug: { type: "string", description: "Override slug (default: derived from title)" },
        },
        required: ["title", "body"],
      },
    },
    {
      name: "wiki_read",
      description: "Read a wiki entry by slug. Returns {exists, slug, title, tags, body, mtime}.",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Entry slug" },
        },
        required: ["slug"],
      },
    },
    {
      name: "wiki_list",
      description: "List wiki entries (slug, title, tags, mtime), optionally filtered by tag.",
      inputSchema: {
        type: "object",
        properties: {
          tag: { type: "string", description: "Filter to entries with this tag" },
        },
        required: [],
      },
    },
    {
      name: "wiki_query",
      description:
        "Substring search across wiki title/tags/body. Returns top {k} entries scored by hit count (title=3pts, tag=2pts, body=N hits capped at 10).",
      inputSchema: {
        type: "object",
        properties: {
          q: { type: "string", description: "Query string (case-insensitive)" },
          k: { type: "number", description: "Top-K results (default: 5)" },
        },
        required: ["q"],
      },
    },
    {
      name: "wiki_delete",
      description: "Delete a wiki entry by slug (file + index entry).",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Entry slug to remove" },
        },
        required: ["slug"],
      },
    },
    {
      name: "wiki_ingest",
      description:
        "Import an external markdown file as a wiki entry. Title is taken from the first H1 line, falling back to the source path. Optional explicit slug and tags.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Source file path (relative or absolute)" },
          slug: { type: "string", description: "Override slug (default: derived from title)" },
          tags: { type: "array", items: { type: "string" }, description: "Tags for the new entry" },
        },
        required: ["path"],
      },
    },
    {
      name: "wiki_lint",
      description:
        "Verify wiki integrity. Returns {orphans, untracked}: index entries missing files, and files missing from index.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "shared_memory_write",
      description:
        "Append a coordination message to .omcp/shared-memory/<channel>.jsonl. Used by team workers to broadcast findings/questions/answers to peers.",
      inputSchema: {
        type: "object",
        properties: {
          channel: { type: "string", description: "Channel id (1-64 chars, alphanumeric/dash/underscore)" },
          kind: {
            type: "string",
            enum: ["task_assigned", "task_done", "finding", "question", "answer", "blocker", "note"],
          },
          payload: { description: "Message body (any JSON-serializable value)" },
          from: { type: "string", description: "Sender id (e.g. worker-1)" },
          to: { type: "string", description: "Recipient id or '*' for broadcast" },
        },
        required: ["channel", "kind"],
      },
    },
    {
      name: "shared_memory_read",
      description:
        "Read messages from a shared-memory channel with optional filters. Returns {channel, events}.",
      inputSchema: {
        type: "object",
        properties: {
          channel: { type: "string", description: "Channel id" },
          kind: { type: "string", description: "Filter by kind" },
          from: { type: "string", description: "Filter by sender id" },
          since: { type: "string", description: "Return only events with ts > since (ISO-8601)" },
          limit: { type: "number", description: "Cap to last N matching events" },
        },
        required: ["channel"],
      },
    },
    {
      name: "shared_memory_list",
      description:
        "List all shared-memory channels with last_seen, last_kind, and last_from from the registry.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "shared_memory_delete",
      description: "Remove a shared-memory channel (jsonl file + meta entry).",
      inputSchema: {
        type: "object",
        properties: {
          channel: { type: "string", description: "Channel id" },
        },
        required: ["channel"],
      },
    },
    {
      name: "shared_memory_cleanup",
      description:
        "Purge channels whose last_seen is older than maxAgeDays (default 1). Returns {ok, removed: [...channels]}. Idempotent.",
      inputSchema: {
        type: "object",
        properties: {
          maxAgeDays: { type: "number", description: "Age threshold in days (default: 1)" },
        },
        required: [],
      },
    },
    {
      name: "rules_context_for_file",
      description:
        "Discover rules relevant to a touched file path and store newly matched rules as pending OMCP context. Reads .omcp/rules, .github/instructions, .github/copilot-instructions.md, .cursor/rules, .claude/rules, and user rules.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Touched file path within the current workspace" },
          filePath: { type: "string", description: "Alias for path" },
          tool: { type: "string", description: "Tool name that touched the file" },
          session_id: { type: "string", description: "Optional Copilot session id for dedupe" },
          markPending: {
            type: "boolean",
            description: "If false, preview matching rules without writing pending context or dedupe state.",
          },
        },
        required: [],
      },
    },
    {
      name: "rules_pending_read",
      description:
        "Read pending rules captured by hooks or rules_context_for_file from .omcp/state/rules-pending.json. Unscoped reads redact rule bodies and project roots; pass session_id for full context.",
      inputSchema: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "Optional session id filter" },
          limit: { type: "number", description: "Optional maximum number of recent entries" },
        },
        required: [],
      },
    },
    {
      name: "rules_pending_clear",
      description:
        "Clear pending rules context. Pass session_id to clear one session; omit it to clear all pending rules.",
      inputSchema: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "Optional session id filter" },
        },
        required: [],
      },
    },
    {
      name: "rules_policy_report",
      description:
        "Return the OMCP rules/memory policy report, discovered rule counts, and storage ownership map.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Optional path used to resolve project root" },
        },
        required: [],
      },
    },
    {
      name: "plan_list",
      description: "Enumerate all plan files in .omcp/plans/*.md",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "pipeline_record_transition",
      description: "Record a pipeline stage transition in .omcp/state/pipeline-state.json",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string", description: "Previous stage (null string or stage name)" },
          to: { type: "string", description: "New stage name (spec, plan, artifact)" },
          artifact_path: { type: "string", description: "Absolute path to the artifact just written" },
        },
        required: ["from", "to", "artifact_path"],
      },
    },
    {
      name: "pipeline_state",
      description: "Read the current pipeline state from .omcp/state/pipeline-state.json",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  let { name, arguments: args } = request.params;
  // Tolerate the Copilot-CLI client-side namespace prefix `mcp__omcp__`.
  // Real Copilot sessions strip this prefix before forwarding to the
  // server, but skill prose and other docs use the prefixed form. Direct
  // stdio clients (validation scripts, tests, other MCP-aware tooling)
  // can pass either form here without dispatch confusion.
  const PREFIX = "mcp__omcp__";
  if (typeof name === "string" && name.startsWith(PREFIX)) {
    name = name.slice(PREFIX.length);
  }

  try {
    let result;
    switch (name) {
      case "state_read": {
        // Two forms accepted:
        //   (1) {key} — read .omcp/state/<key>.json verbatim
        //   (2) {mode} — read .omcp/state/<mode>-state.json (compat shorthand)
        let resolvedKey = args?.key;
        if (!resolvedKey && typeof args?.mode === "string" && args.mode.length > 0) {
          resolvedKey = `${args.mode}-state`;
        }
        if (!resolvedKey) {
          throw new Error("state_read requires either 'key' or 'mode'");
        }
        result = await stateRead(resolvedKey);
        break;
      }
      case "state_write": {
        // Two forms accepted:
        //   (1) {key, value} — write verbatim
        //   (2) {mode, ...rest} — write rest (minus mode/key/value) as value
        //       to .omcp/state/<mode>-state.json
        let resolvedKey = args?.key;
        let resolvedValue = args?.value;
        if (!resolvedKey && typeof args?.mode === "string" && args.mode.length > 0) {
          resolvedKey = `${args.mode}-state`;
          // Build value from all args except mode/key/value
          const v = { ...(args ?? {}) };
          delete v.mode;
          delete v.key;
          delete v.value;
          // If caller passed an explicit `value` field alongside mode-form
          // top-level fields, prefer mode-form (top-level + state subobject).
          // If neither key nor value was passed and v is empty, value = {}.
          resolvedValue = v;
        }
        if (!resolvedKey) {
          throw new Error("state_write requires either 'key' or 'mode'");
        }
        if (resolvedValue === undefined) {
          throw new Error("state_write requires 'value' (form 1) or mode-form fields");
        }
        result = await stateWrite(resolvedKey, resolvedValue);
        break;
      }
      case "state_list": {
        result = await stateList();
        break;
      }
      case "state_clear": {
        result = await stateClear({
          key: args?.key,
          mode: args?.mode,
          session_id: args?.session_id,
          cancelTtl: args?.cancelTtl,
        });
        break;
      }
      case "state_get_status": {
        result = await stateGetStatus({ mode: args?.mode });
        break;
      }
      case "state_list_active": {
        result = await stateListActive();
        break;
      }
      case "notepad_read": {
        result = await notepadRead({ tail: args.tail });
        break;
      }
      case "notepad_write": {
        result = await notepadWrite({ entry: args.entry, priority: args.priority });
        break;
      }
      case "notepad_write_priority": {
        result = await notepadWritePriority({ entry: args?.entry });
        break;
      }
      case "notepad_write_working": {
        result = await notepadWriteWorking({ entry: args?.entry });
        break;
      }
      case "notepad_prune": {
        result = await notepadPrune({
          maxAgeDays: args?.maxAgeDays,
          lane: args?.lane,
        });
        break;
      }
      case "notepad_stats": {
        result = await notepadStats();
        break;
      }
      case "plan_list": {
        result = await planList();
        break;
      }
      case "wiki_add": {
        result = await wikiAdd({
          title: args?.title,
          body: args?.body,
          tags: args?.tags,
          slug: args?.slug,
        });
        break;
      }
      case "wiki_read": {
        result = await wikiRead({ slug: args?.slug });
        break;
      }
      case "wiki_list": {
        result = await wikiList({ tag: args?.tag });
        break;
      }
      case "wiki_query": {
        result = await wikiQuery({ q: args?.q, k: args?.k });
        break;
      }
      case "wiki_delete": {
        result = await wikiDelete({ slug: args?.slug });
        break;
      }
      case "wiki_ingest": {
        result = await wikiIngest({
          path: args?.path,
          slug: args?.slug,
          tags: args?.tags,
        });
        break;
      }
      case "wiki_lint": {
        result = await wikiLint();
        break;
      }
      case "shared_memory_write": {
        result = await sharedMemoryWrite({
          channel: args?.channel,
          kind: args?.kind,
          payload: args?.payload,
          from: args?.from,
          to: args?.to,
        });
        break;
      }
      case "shared_memory_read": {
        result = await sharedMemoryRead({
          channel: args?.channel,
          kind: args?.kind,
          from: args?.from,
          since: args?.since,
          limit: args?.limit,
        });
        break;
      }
      case "shared_memory_list": {
        result = await sharedMemoryList();
        break;
      }
      case "shared_memory_delete": {
        result = await sharedMemoryDelete({ channel: args?.channel });
        break;
      }
      case "shared_memory_cleanup": {
        result = await sharedMemoryCleanup({ maxAgeDays: args?.maxAgeDays });
        break;
      }
      case "rules_context_for_file": {
        result = await rulesContextForFile({
          path: args?.path,
          filePath: args?.filePath,
          tool: args?.tool,
          session_id: args?.session_id,
          markPending: args?.markPending,
        });
        break;
      }
      case "rules_pending_read": {
        result = await rulesPendingRead({
          session_id: args?.session_id,
          limit: args?.limit,
        });
        break;
      }
      case "rules_pending_clear": {
        result = await rulesPendingClear({ session_id: args?.session_id });
        break;
      }
      case "rules_policy_report": {
        result = await rulesPolicyReport({ path: args?.path });
        break;
      }
      case "trace_write": {
        result = await traceWrite(args ?? {});
        break;
      }
      case "trace_summary": {
        result = await traceSummary({ session_id: args?.session_id });
        break;
      }
      case "trace_timeline": {
        result = await traceTimeline({
          session_id: args?.session_id,
          kind: args?.kind,
          limit: args?.limit,
        });
        break;
      }
      case "trace_list_sessions": {
        result = await traceListSessions();
        break;
      }
      case "project_memory_read": {
        result = await projectMemoryRead({
          kind: args?.kind,
          tag: args?.tag,
          limit: args?.limit,
        });
        break;
      }
      case "project_memory_write": {
        result = await projectMemoryWrite({ facts: args?.facts });
        break;
      }
      case "project_memory_add_note": {
        result = await projectMemoryAddNote({
          text: args?.text,
          tags: args?.tags,
        });
        break;
      }
      case "project_memory_add_directive": {
        result = await projectMemoryAddDirective({
          text: args?.text,
          scope: args?.scope,
        });
        break;
      }
      case "pipeline_record_transition": {
        const from = args.from === "null" ? null : args.from;
        transitionRecord({ from, to: args.to, artifact: args.artifact_path });
        result = { ok: true, recorded_at: new Date().toISOString() };
        break;
      }
      case "pipeline_state": {
        result = readStage();
        break;
      }
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return await listResources();
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return listResourceTemplates();
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return await readResource(request.params);
});

server.setRequestHandler(SubscribeRequestSchema, async (request) => {
  subscribeResource(request.params.uri);
  return {};
});

server.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
  unsubscribeResource(request.params.uri);
  return {};
});

// Forward resource-change events from the store bus to subscribed clients
// via notifications/resources/updated.
resourceEvents.on("updated", (uri) => {
  if (!isResourceSubscribed(uri)) return;
  // Fire-and-forget — notification delivery is best-effort.
  server
    .notification({
      method: "notifications/resources/updated",
      params: { uri },
    })
    .catch(() => {});
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return await listPrompts();
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  return await getPrompt(request.params);
});

const transport = new StdioServerTransport();
await server.connect(transport);

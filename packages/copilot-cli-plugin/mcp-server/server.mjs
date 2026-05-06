#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
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
import { readStage, transitionRecord } from "../orchestrator/orchestrator.mjs";

const server = new Server(
  { name: "omcp", version: "0.5.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "state_read",
      description: "Read a JSON value from .omcp/state/<key>.json",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string", description: "State key (filename without .json)" },
        },
        required: ["key"],
      },
    },
    {
      name: "state_write",
      description: "Atomically write a JSON value to .omcp/state/<key>.json",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string", description: "State key" },
          value: { description: "JSON-serializable value to store" },
        },
        required: ["key", "value"],
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
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case "state_read": {
        result = await stateRead(args.key);
        break;
      }
      case "state_write": {
        result = await stateWrite(args.key, args.value);
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

const transport = new StdioServerTransport();
await server.connect(transport);

#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { stateRead, stateWrite, stateList } from "./state-store.mjs";
import { notepadRead, notepadWrite } from "./notepad-store.mjs";
import { planList } from "./plan-store.mjs";
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
      case "notepad_read": {
        result = await notepadRead({ tail: args.tail });
        break;
      }
      case "notepad_write": {
        result = await notepadWrite({ entry: args.entry, priority: args.priority });
        break;
      }
      case "plan_list": {
        result = await planList();
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

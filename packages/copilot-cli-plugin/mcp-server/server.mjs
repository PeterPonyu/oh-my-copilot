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

const server = new Server(
  { name: "oh-my-copilot", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "state_read",
      description: "Read a JSON value from .omc/state/<key>.json",
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
      description: "Atomically write a JSON value to .omc/state/<key>.json",
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
      description: "List all keys present in .omc/state/",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "notepad_read",
      description: "Read .omc/notepad.md, optionally limiting to the last N lines",
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
      description: "Append a timestamped entry to .omc/notepad.md",
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
      description: "Enumerate all plan files in .omc/plans/*.md",
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

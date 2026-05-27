#!/usr/bin/env node
// validate-readme-counts.mjs — #75 guard: assert README surface counts match live inventory.
// Counts are derived from plugin.json / filesystem inventories / hooks.json / server.mjs.
// Run via: node scripts/validate-readme-counts.mjs

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const PLUGIN_ROOT = join(REPO_ROOT, "packages", "copilot-cli-plugin");

function read(p) {
  return readFileSync(p, "utf8");
}

function countFiles(dir, predicate) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && predicate(e.name))
    .length;
}

function countDirs(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).length;
}

// --- Live inventory ---

const agentCount = countFiles(join(PLUGIN_ROOT, "agents"), (f) => f.endsWith(".agent.md"));

const skillCount = countDirs(join(PLUGIN_ROOT, "skills"));

const commandCount = countFiles(join(PLUGIN_ROOT, "commands"), (f) => f.endsWith(".md"));

const hooksJson = JSON.parse(read(join(PLUGIN_ROOT, "hooks.json")));
const hookCount = Object.keys(hooksJson.hooks || {}).length;

// Count MCP tools: look for lines matching `  name: "<toolname>"` inside server.mjs
const serverSrc = read(join(PLUGIN_ROOT, "mcp-server", "server.mjs"));
const toolNameRe = /^\s+name:\s+"[a-z]/gm;
const mcpToolCount = (serverSrc.match(toolNameRe) || []).length;

// --- README claims ---

const readme = read(join(REPO_ROOT, "README.md"));

// Extract the lead sentence: "NN agents, NN skills, NN typed slash commands, NN hook events, and a NN-tool MCP server"
const leadRe =
  /(\d+)\s+agents,\s+(\d+)\s+skills,\s+(\d+)\s+typed slash commands,\s+(\d+)\s+hook events,\s+and a\s+(\d+)-tool MCP server/;
const leadMatch = readme.match(leadRe);
if (!leadMatch) {
  console.error(
    "FAIL: README lead sentence does not match expected count pattern: " +
      '"NN agents, NN skills, NN typed slash commands, NN hook events, and a NN-tool MCP server"',
  );
  process.exit(1);
}

const [, claimedAgents, claimedSkills, claimedCommands, claimedHooks, claimedTools] =
  leadMatch.map(Number);

const checks = [
  { label: "agents", claimed: claimedAgents, live: agentCount },
  { label: "skills", claimed: claimedSkills, live: skillCount },
  { label: "slash commands", claimed: claimedCommands, live: commandCount },
  { label: "hook events", claimed: claimedHooks, live: hookCount },
  { label: "MCP tools", claimed: claimedTools, live: mcpToolCount },
];

let failed = false;
for (const { label, claimed, live } of checks) {
  if (claimed !== live) {
    console.error(
      `FAIL: README claims ${claimed} ${label} but live inventory has ${live}; update README.md`,
    );
    failed = true;
  } else {
    console.log(`ok: README ${label} count (${claimed}) matches live inventory`);
  }
}

if (failed) process.exit(1);
console.log("ok: all README surface counts match live inventory");

#!/usr/bin/env node
// Validate docs/surface-inventory.json against the live plugin package, README counts,
// and public host-boundary wording. Dependency-free by design for CI/focused gates.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const PLUGIN_ROOT = join(REPO_ROOT, "packages", "copilot-cli-plugin");

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`ok: ${message}`);
}

function read(relativePath) {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

function readJson(relativePath) {
  try {
    return JSON.parse(read(relativePath));
  } catch (error) {
    fail(`could not parse ${relativePath}: ${error.message}`);
  }
}

function sorted(values) {
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

function listSkillNames() {
  const skillsDir = join(PLUGIN_ROOT, "skills");
  return sorted(
    readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(skillsDir, entry.name, "SKILL.md")))
      .map((entry) => entry.name),
  );
}

function listMarkdownNames(relativeDir, suffix) {
  const dir = join(REPO_ROOT, relativeDir);
  return sorted(
    readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
      .map((entry) => entry.name.slice(0, -suffix.length)),
  );
}

function listHookEvents() {
  const hooks = readJson("packages/copilot-cli-plugin/hooks.json").hooks;
  if (!hooks || typeof hooks !== "object" || Array.isArray(hooks)) {
    fail("packages/copilot-cli-plugin/hooks.json must contain an object hooks field");
  }
  return sorted(Object.keys(hooks));
}

function listMcpToolNames() {
  const server = read("packages/copilot-cli-plugin/mcp-server/server.mjs");
  return sorted([...server.matchAll(/^\s+name:\s+"([a-z][a-z0-9_]*)"/gm)].map((match) => match[1]));
}

function assertArray(label, expected, actual) {
  const left = sorted(expected || []);
  const right = sorted(actual || []);
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    const missing = left.filter((value) => !right.includes(value));
    const extra = right.filter((value) => !left.includes(value));
    fail(`${label} drift: missing [${missing.join(", ")}], extra [${extra.join(", ")}]`);
  }
  log(`${label} names match (${right.length})`);
}

function assertCount(label, declared, actual) {
  if (declared !== actual) {
    fail(`${label} count drift: inventory declares ${declared}, live inventory has ${actual}`);
  }
  log(`${label} count is ${actual}`);
}

function assertReadmeCounts(inventory) {
  const readme = read("README.md");
  const pluginReadme = read("packages/copilot-cli-plugin/README.md");
  const checks = [
    ["README lead count sentence", new RegExp(`${inventory.surfaces.agents.count} agents, ${inventory.surfaces.skills.count} skills, ${inventory.surfaces.commands.count} typed slash commands, ${inventory.surfaces.hooks.count} hook events, and a ${inventory.surfaces.mcpTools.count}-tool MCP server`)],
    ["README typed slash command count", new RegExp(`${inventory.surfaces.commands.count} user-invocable routes`)],
    ["README agent table count", new RegExp(`\\| Agents \\| ${inventory.surfaces.agents.count} \\|`)],
    ["README skill table count", new RegExp(`\\| Skills \\| ${inventory.surfaces.skills.count} \\|`)],
    ["README command table count", new RegExp(`\\| Slash commands \\| ${inventory.surfaces.commands.count} \\|`)],
    ["README hook table count", new RegExp(`\\| Hook events \\| ${inventory.surfaces.hooks.count} \\|`)],
    ["README MCP table count", new RegExp(`\\| MCP server tools \\| ${inventory.surfaces.mcpTools.count} \\|`)],
    ["plugin README agent table count", new RegExp(`\\| Agents \\| ${inventory.surfaces.agents.count} \\|`), pluginReadme],
    ["plugin README skill table count", new RegExp(`\\| Skills \\| ${inventory.surfaces.skills.count} \\|`), pluginReadme],
    ["plugin README command table count", new RegExp(`\\| Slash commands \\| ${inventory.surfaces.commands.count} \\|`), pluginReadme],
    ["plugin README hook table count", new RegExp(`\\| Hook events \\| ${inventory.surfaces.hooks.count} \\|`), pluginReadme],
    ["plugin README MCP table count", new RegExp(`\\| MCP server tools \\| ${inventory.surfaces.mcpTools.count} \\|`), pluginReadme],
  ];
  for (const [label, pattern, text = readme] of checks) {
    if (!pattern.test(text)) fail(`${label} is missing or stale`);
    log(label);
  }
}


function assertSurfaceInventoryEntries(inventory) {
  const entries = inventory.surface_inventory;
  if (!Array.isArray(entries)) {
    fail("surface_inventory must be an array for suite-wide inventory gates");
  }
  const requiredKeys = ["name", "kind", "classification", "path", "first_run", "rationale", "validator"];
  for (const [index, entry] of entries.entries()) {
    for (const key of requiredKeys) {
      if (typeof entry[key] !== "string" || !entry[key].trim()) {
        fail(`surface_inventory[${index}] missing required string field ${key}`);
      }
    }
  }
  const expectedCount =
    inventory.surfaces.skills.count +
    inventory.surfaces.commands.count +
    inventory.surfaces.agents.count +
    inventory.surfaces.hooks.count +
    inventory.surfaces.mcpTools.count;
  if (entries.length !== expectedCount) {
    fail(`surface_inventory count drift: expected ${expectedCount}, got ${entries.length}`);
  }
  const byKind = (kind) => sorted(entries.filter((entry) => entry.kind === kind).map((entry) => entry.name));
  assertArray("surface_inventory skills", inventory.surfaces.skills.names, byKind("skill"));
  assertArray("surface_inventory commands", inventory.surfaces.commands.names, byKind("command"));
  assertArray("surface_inventory agents", inventory.surfaces.agents.names, byKind("agent"));
  assertArray("surface_inventory hooks", inventory.surfaces.hooks.events, byKind("hook"));
  assertArray("surface_inventory MCP tools", inventory.surfaces.mcpTools.names, byKind("mcp_tool"));
  log(`surface_inventory entries validated (${entries.length})`);
}

function assertHostBoundaries() {
  const readme = read("README.md");
  const limitations = read("docs/known-limitations.md");
  const boundary = read("docs/plugin-boundary-review.md");
  const checks = [
    ["README keeps CLI-first boundary", readme, /Copilot CLI-first/],
    ["README keeps no-runtime-framework boundary", readme, /No runtime framework/],
    ["README names out-of-scope host surfaces", readme, /Copilot cloud agent, IDE integrations, SDK runtimes, supported Cursor host surface/],
    ["README separates host-product proof", readme, /Copilot host-product behavior .* GitHub documentation/],
    ["README prevents adjacent-host proof overclaim", readme, /Adjacent-host references .* never used as proof/],
    ["known limitations keep cloud-agent boundary", limitations, /Copilot cloud agent, IDE integration, SDK runtime/],
    ["known limitations keep Cursor boundary", limitations, /not direct proof that\s+`oh-my-copilot` currently supports Cursor/],
    ["plugin boundary keeps support tooling non-product", boundary, /support tooling pretending to be the main shipped surface/],
    ["plugin boundary separates host-product capabilities", boundary, /Host-product documentation plus bounded repo wording/],
  ];
  for (const [label, text, pattern] of checks) {
    if (!pattern.test(text)) fail(label);
    log(label);
  }
}

function main() {
  const inventory = readJson("docs/surface-inventory.json");
  if (inventory.schemaVersion !== 1) fail("inventory schemaVersion must be 1");
  if (inventory.host !== "github-copilot-cli") fail("inventory host must be github-copilot-cli");
  if (inventory.package !== "oh-my-copilot") fail("inventory package must be oh-my-copilot");

  const live = {
    skills: listSkillNames(),
    commands: listMarkdownNames("packages/copilot-cli-plugin/commands", ".md"),
    agents: listMarkdownNames("packages/copilot-cli-plugin/agents", ".agent.md"),
    hooks: listHookEvents(),
    mcpTools: listMcpToolNames(),
  };

  assertArray("skills", inventory.surfaces.skills.names, live.skills);
  assertArray("commands", inventory.surfaces.commands.names, live.commands);
  assertArray("agents", inventory.surfaces.agents.names, live.agents);
  assertArray("hooks", inventory.surfaces.hooks.events, live.hooks);
  assertArray("MCP tools", inventory.surfaces.mcpTools.names, live.mcpTools);

  assertCount("skills", inventory.surfaces.skills.count, live.skills.length);
  assertCount("commands", inventory.surfaces.commands.count, live.commands.length);
  assertCount("agents", inventory.surfaces.agents.count, live.agents.length);
  assertCount("hooks", inventory.surfaces.hooks.count, live.hooks.length);
  assertCount("MCP tools", inventory.surfaces.mcpTools.count, live.mcpTools.length);

  assertReadmeCounts(inventory);
  assertSurfaceInventoryEntries(inventory);
  assertHostBoundaries();
  console.log("SURFACE_INVENTORY_OK");
}

main();

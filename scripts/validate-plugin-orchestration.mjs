#!/usr/bin/env node
// Validate the OMCP plugin as the canonical Copilot CLI customization source.
// This is intentionally dependency-free so it can run in CI before installs.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const PLUGIN_ROOT = join(REPO_ROOT, "packages", "copilot-cli-plugin");
const AGENTS_DIR = join(PLUGIN_ROOT, "agents");
const SKILLS_DIR = join(PLUGIN_ROOT, "skills");
const COMMANDS_DIR = join(PLUGIN_ROOT, "commands");
const INSTRUCTIONS_DIR = join(PLUGIN_ROOT, "instructions");

const MAIN_FEATURE_SKILLS = [
  "autopilot",
  "ralph",
  "ralplan",
  "team",
  "ultrawork",
  "ultraqa",
  "deep-interview",
  "plan",
  "review",
  "verify",
  "docs-ship",
  "debug",
  "trace",
  "parity-guard",
  "omc-doctor",
];

const REQUIRED_VALIDATION_SURFACES = [
  "scripts/check-mirror-drift.sh",
  "scripts/validate-plugin-orchestration.mjs",
  "scripts/run-validation.sh",
  "scripts/smoke-copilot-cli.sh",
  "scripts/audit-tool-refs.mjs",
  "scripts/validate-release-readiness.sh",
  ".github/workflows/docs-check.yml",
];

const errors = [];
const notes = [];

function rel(path) {
  return relative(REPO_ROOT, path);
}

function fail(message) {
  errors.push(message);
}

function note(message) {
  notes.push(message);
}

function read(path) {
  return readFileSync(path, "utf8");
}

function listFiles(dir, predicate) {
  if (!existsSync(dir)) return [];
  const result = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      result.push(...listFiles(full, predicate));
    } else if (predicate(full)) {
      result.push(full);
    }
  }
  return result.sort();
}

function parseFrontmatter(path) {
  const text = read(path);
  if (!text.startsWith("---\n")) {
    fail(`${rel(path)} missing YAML frontmatter`);
    return { data: {}, body: text };
  }
  const end = text.indexOf("\n---", 4);
  if (end === -1) {
    fail(`${rel(path)} has unterminated YAML frontmatter`);
    return { data: {}, body: "" };
  }
  const raw = text.slice(4, end);
  const data = {};
  for (const line of raw.splitlines ? raw.splitlines() : raw.split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#") || !line.includes(":")) continue;
    const [key, ...rest] = line.split(":");
    data[key.trim()] = rest.join(":").trim().replace(/^["']|["']$/g, "");
  }
  return { data, body: text.slice(end + 4).trim() };
}


function makeFakeInstalledHome() {
  const root = mkdtempSync(join(tmpdir(), "omcp-install-root-"));
  const direct = join(root, ".copilot", "installed-plugins", "_direct");
  mkdirSync(direct, { recursive: true });
  symlinkSync(PLUGIN_ROOT, join(direct, "copilot-cli-plugin"), "dir");
  return root;
}

function runWithFakeInstall(command, { input = "", timeout = 3000 } = {}) {
  return runProcessWithFakeInstall("bash", ["-lc", command], { input, timeout });
}

function runProcessWithFakeInstall(command, args, { input = "", timeout = 3000 } = {}) {
  const home = makeFakeInstalledHome();
  const cwd = mkdtempSync(join(tmpdir(), "omcp-non-plugin-cwd-"));
  try {
    return spawnSync(command, args, {
      cwd,
      env: { ...process.env, HOME: home },
      input,
      encoding: "utf8",
      timeout,
      maxBuffer: 1024 * 1024,
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  }
}

function validateInstalledRuntimeLaunchers() {
  const mcpPath = join(PLUGIN_ROOT, ".mcp.json");
  const hooksPath = join(PLUGIN_ROOT, "hooks.json");
  const mcp = JSON.parse(read(mcpPath));
  const server = mcp.mcpServers?.omcp;
  if (!server) {
    fail("packages/copilot-cli-plugin/.mcp.json missing omcp server");
  } else {
    const args = Array.isArray(server.args) ? server.args : [];
    const launcher = args.join("\n");
    if (server.command !== "bash" || !args.includes("-lc")) {
      fail("omcp MCP launcher must use bash -lc so it can discover the installed plugin root from any cwd");
    }
    if (launcher.includes("./mcp-server/dist/server.mjs")) {
      fail("omcp MCP launcher must not rely on ./mcp-server/dist/server.mjs relative to cwd");
    }
    if (!launcher.includes("installed-plugins") || !launcher.includes("plugin.json")) {
      fail("omcp MCP launcher must search installed plugin roots by plugin.json");
    }
    const init = `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "validator", version: "0" } } })}\n`;
    const result = runProcessWithFakeInstall(server.command, args, { input: init, timeout: 1500 });
    if (!String(result.stdout || "").includes('"serverInfo":{"name":"omcp"')) {
      fail(`omcp MCP launcher did not initialize from non-plugin cwd via fake installed cache (status=${result.status}, signal=${result.signal}, stderr=${String(result.stderr || "").slice(0, 300)})`);
    }
  }

  const hooks = JSON.parse(read(hooksPath));
  for (const [eventName, entries] of Object.entries(hooks.hooks || {})) {
    for (const [index, entry] of entries.entries()) {
      const bash = String(entry.bash || "");
      if (bash.includes("packages/copilot-cli-plugin/scripts/")) {
        fail(`hook ${eventName}[${index}] must not call packages/copilot-cli-plugin/scripts relative to cwd`);
      }
      if (!bash.includes("installed-plugins") || !bash.includes("plugin.json")) {
        fail(`hook ${eventName}[${index}] must discover installed plugin roots by plugin.json`);
      }
      const result = runWithFakeInstall(bash, { input: "{}\n", timeout: 3000 });
      if (result.status !== 0) {
        fail(`hook ${eventName}[${index}] failed from non-plugin cwd via fake installed cache (status=${result.status}, stderr=${String(result.stderr || "").slice(0, 300)})`);
      }
      const stderr = String(result.stderr || "");
      if (stderr.includes("No such file or directory")) {
        fail(`hook ${eventName}[${index}] still emits No such file or directory from non-plugin cwd`);
      }
      if (stderr.includes("common.sh not found")) {
        fail(`hook ${eventName}[${index}] could not find bundled common.sh from non-plugin cwd`);
      }
    }
  }
  note("installed-runtime launchers: MCP + hooks resolve outside plugin cwd");
}

function parseAgentList(value) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function main() {
  const pluginJsonPath = join(PLUGIN_ROOT, "plugin.json");
  if (!existsSync(pluginJsonPath)) fail("missing packages/copilot-cli-plugin/plugin.json");
  const manifest = JSON.parse(read(pluginJsonPath));
  if (manifest.name !== "omcp") fail(`plugin name must remain omcp, got ${manifest.name}`);
  for (const key of ["agents", "skills", "commands", "hooks", "mcpServers"]) {
    if (!(key in manifest)) fail(`plugin.json missing ${key}`);
  }

  const agentFiles = listFiles(AGENTS_DIR, (path) => path.endsWith(".agent.md"));
  const agentIds = new Set();
  for (const file of agentFiles) {
    const id = basename(file, ".agent.md");
    const { data, body } = parseFrontmatter(file);
    agentIds.add(id);
    if (data.name && data.name !== id) fail(`${rel(file)} frontmatter name ${data.name} != file id ${id}`);
    if (!data.description) fail(`${rel(file)} missing description`);
    if (!body) fail(`${rel(file)} has empty body`);
  }
  if (agentIds.size < 15) fail(`expected at least 15 plugin agents, found ${agentIds.size}`);
  note(`agents: ${agentIds.size}`);

  const skillFiles = listFiles(SKILLS_DIR, (path) => basename(path) === "SKILL.md");
  const skillIds = new Set(skillFiles.map((file) => basename(dirname(file))));
  if (skillIds.size < 30) fail(`expected at least 30 plugin skills, found ${skillIds.size}`);
  note(`skills: ${skillIds.size}`);

  for (const id of MAIN_FEATURE_SKILLS) {
    const path = join(SKILLS_DIR, id, "SKILL.md");
    if (!existsSync(path)) {
      fail(`main feature skill missing: ${rel(path)}`);
      continue;
    }
    const { data, body } = parseFrontmatter(path);
    if (data.name !== id) fail(`${rel(path)} name must be ${id}`);
    if (!String(data.description || "").includes("[OMCP]")) {
      fail(`${rel(path)} main feature description must include [OMCP]`);
    }
    const orchestrated = parseAgentList(data["orchestrates-agents"]);
    if (orchestrated.length === 0) {
      fail(`${rel(path)} missing orchestrates-agents metadata`);
    }
    for (const agent of orchestrated) {
      if (!agentIds.has(agent)) fail(`${rel(path)} references missing agent role: ${agent}`);
    }
    if (!/Agent orchestration|orchestrat/i.test(body)) {
      fail(`${rel(path)} must explain its agent orchestration role in the body`);
    }
  }

  const commandFiles = listFiles(COMMANDS_DIR, (path) => path.endsWith(".md"));
  if (commandFiles.length < 40) fail(`expected at least 40 plugin command files, found ${commandFiles.length}`);
  for (const file of commandFiles) {
    const id = basename(file, ".md");
    const { data, body } = parseFrontmatter(file);
    if (data.name !== id) fail(`${rel(file)} command name must match filename ${id}`);
    if (!skillIds.has(id)) fail(`${rel(file)} has no matching skill directory packages/copilot-cli-plugin/skills/${id}`);
    if (data.agent && !agentIds.has(data.agent)) fail(`${rel(file)} references missing agent: ${data.agent}`);
    if (!body.includes(`{{ARGUMENTS}}`) && !body.includes(`/omcp:${id}`)) {
      fail(`${rel(file)} should mention {{ARGUMENTS}} or /omcp:${id}`);
    }
  }
  note(`commands: ${commandFiles.length}`);

  for (const path of [
    join(INSTRUCTIONS_DIR, "AGENTS.md"),
    join(INSTRUCTIONS_DIR, "copilot-instructions.md"),
    join(INSTRUCTIONS_DIR, "instructions", "docs.instructions.md"),
    join(INSTRUCTIONS_DIR, "instructions", "copilot-surfaces.instructions.md"),
    join(INSTRUCTIONS_DIR, "instructions", "scripts.instructions.md"),
  ]) {
    if (!existsSync(path)) fail(`missing canonical instruction source: ${rel(path)}`);
  }

  for (const path of REQUIRED_VALIDATION_SURFACES.map((p) => join(REPO_ROOT, p))) {
    if (!existsSync(path)) fail(`missing validation surface: ${rel(path)}`);
  }

  validateInstalledRuntimeLaunchers();

  const workflow = read(join(REPO_ROOT, ".github", "workflows", "docs-check.yml"));
  for (const snippet of [
    "scripts/check-mirror-drift.sh",
    "scripts/validate-plugin-orchestration.mjs",
    "scripts/run-validation.sh",
    "npm test",
  ]) {
    if (!workflow.includes(snippet)) fail(`docs-check workflow missing ${snippet}`);
  }

  const release = read(join(REPO_ROOT, "scripts", "validate-release-readiness.sh"));
  for (const snippet of ["check-mirror-drift.sh", "validate-plugin-orchestration.mjs", "run-validation.sh"]) {
    if (!release.includes(snippet)) fail(`release readiness missing ${snippet}`);
  }

  if (errors.length) {
    console.error("Plugin orchestration validation FAILED");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  for (const item of notes) console.log(`ok: ${item}`);
  console.log("ok: plugin orchestration metadata, command routes, source instructions, and CI hooks validate");
}

main();

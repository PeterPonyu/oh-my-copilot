#!/usr/bin/env node
// node:test unit tests for validate-skill-command-parity.mjs (COPILOT-8).
// Each test stages a synthetic plugin tree under a temp dir, then asserts the
// validator passes on a faithful copy and FAILS loudly on a deliberate
// skill <-> command parity break — so the gate is proven, not assumed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, unlinkSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const SCRIPT = join(REPO_ROOT, "scripts", "validate-skill-command-parity.mjs");
const PLUGIN_ROOT = join(REPO_ROOT, "packages", "copilot-cli-plugin");

function run(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

// Stage a writable copy of the real plugin's skills/commands/agents.
function stagePlugin() {
  const dir = mkdtempSync(join(tmpdir(), "omcp-parity-"));
  for (const sub of ["skills", "commands", "agents"]) {
    cpSync(join(PLUGIN_ROOT, sub), join(dir, sub), { recursive: true });
  }
  return dir;
}

test("parity: real plugin tree passes (exit 0)", () => {
  const result = run("--plugin-root", PLUGIN_ROOT);
  assert.equal(
    result.status,
    0,
    `expected pass on real tree:\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
  );
  assert.match(result.stdout, /skill-command parity validates/);
});

test("parity: unknown argument exits 2", () => {
  const result = run("--bogus");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown argument/i);
});

test("parity FAILS when a user-invocable skill loses its command", () => {
  const dir = stagePlugin();
  try {
    unlinkSync(join(dir, "commands", "wiki.md"));
    const result = run("--plugin-root", dir, "--readme", "none");
    assert.equal(result.status, 1, `expected exit 1, got ${result.status}`);
    assert.match(result.stderr, /skill 'wiki' is user-invocable but has no commands\/wiki\.md/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("parity FAILS when a command has no matching skill", () => {
  const dir = stagePlugin();
  try {
    writeFileSync(
      join(dir, "commands", "ghost.md"),
      "---\nname: ghost\n---\n/omcp:ghost {{ARGUMENTS}}\n",
    );
    const result = run("--plugin-root", dir, "--readme", "none");
    assert.equal(result.status, 1, `expected exit 1, got ${result.status}`);
    assert.match(result.stderr, /command 'ghost\.md' has no matching skills/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("parity FAILS when a second skill becomes user-invocable:false", () => {
  const dir = stagePlugin();
  try {
    const skillPath = join(dir, "skills", "wiki", "SKILL.md");
    const text = readFileSync(skillPath, "utf8");
    // Insert user-invocable: false into the frontmatter block.
    writeFileSync(skillPath, text.replace("---\nname: wiki", "---\nname: wiki\nuser-invocable: false"));
    const result = run("--plugin-root", dir, "--readme", "none");
    assert.equal(result.status, 1, `expected exit 1, got ${result.status}`);
    assert.match(result.stderr, /must be the only user-invocable:false skill/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("parity FAILS when README counts disagree with live inventory", () => {
  const dir = stagePlugin();
  const readme = join(dir, "README.md");
  try {
    // README claims 45 commands, but we delete one command -> 44 live.
    unlinkSync(join(dir, "commands", "cancel.md"));
    // Re-create a matching skill-less state is irrelevant; we only need the
    // count cross-check. Write a README whose lead sentence claims 45.
    writeFileSync(
      readme,
      "# oh-my-copilot\n\n22 agents, 46 skills, 45 typed slash commands, 4 hook events, and a 41-tool MCP server.\n",
    );
    const result = run("--plugin-root", dir, "--readme", readme);
    assert.equal(result.status, 1, `expected exit 1, got ${result.status}`);
    assert.match(result.stderr, /README claims 45 slash commands but live inventory has 44/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

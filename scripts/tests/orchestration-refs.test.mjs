#!/usr/bin/env node
// node:test unit tests for scripts/lib/orchestration-refs.mjs (COPILOT-7).
// Proves the orchestration-reference checker — used by
// validate-plugin-orchestration.mjs — fails clearly at LOAD time when a skill
// references a non-existent agent (orchestrates-agents) or a broken next-skill
// chain. Each test stages a synthetic plugin tree under a temp dir.

import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { checkOrchestrationRefs } from "../lib/orchestration-refs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(__dirname, "..", "..", "packages", "copilot-cli-plugin");

function stagePlugin() {
  const dir = mkdtempSync(join(tmpdir(), "omcp-orch-"));
  for (const sub of ["skills", "agents"]) {
    cpSync(join(PLUGIN_ROOT, sub), join(dir, sub), { recursive: true });
  }
  return dir;
}

test("orchestration refs: real plugin tree resolves cleanly (no errors)", () => {
  const errors = checkOrchestrationRefs(PLUGIN_ROOT);
  assert.deepEqual(errors, [], `unexpected orchestration ref errors: ${errors.join("; ")}`);
});

test("orchestration refs: FAILS on a non-existent agent in orchestrates-agents", () => {
  const dir = stagePlugin();
  try {
    const skillPath = join(dir, "skills", "wiki", "SKILL.md");
    const text = readFileSync(skillPath, "utf8");
    writeFileSync(
      skillPath,
      text.replace("---\nname: wiki", '---\nname: wiki\norchestrates-agents: "executor, ghost-agent-404"'),
    );
    const errors = checkOrchestrationRefs(dir);
    assert.ok(
      errors.some((e) => /orchestrates-agents references missing agent: ghost-agent-404/.test(e)),
      `expected a missing-agent error, got: ${errors.join("; ")}`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("orchestration refs: FAILS on a broken next-skill chain reference", () => {
  const dir = stagePlugin();
  try {
    const skillPath = join(dir, "skills", "wiki", "SKILL.md");
    const text = readFileSync(skillPath, "utf8");
    writeFileSync(
      skillPath,
      text.replace("---\nname: wiki", "---\nname: wiki\nnext-skill: this-skill-does-not-exist"),
    );
    const errors = checkOrchestrationRefs(dir);
    assert.ok(
      errors.some((e) => /next-skill references missing skill: this-skill-does-not-exist/.test(e)),
      `expected a broken next-skill error, got: ${errors.join("; ")}`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("orchestration refs: a valid next-skill chain does NOT error", () => {
  const dir = stagePlugin();
  try {
    const skillPath = join(dir, "skills", "wiki", "SKILL.md");
    const text = readFileSync(skillPath, "utf8");
    // 'plan' is a real skill in the staged tree.
    writeFileSync(skillPath, text.replace("---\nname: wiki", "---\nname: wiki\nnext-skill: plan"));
    const errors = checkOrchestrationRefs(dir);
    assert.deepEqual(errors, [], `did not expect errors for valid next-skill: ${errors.join("; ")}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

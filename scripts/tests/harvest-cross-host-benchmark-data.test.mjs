#!/usr/bin/env node
// node:test unit tests for harvest-cross-host-benchmark-data.mjs
// Tests cover argument parsing and the auto-resolve / error paths that
// don't require a real oh-my-cursor checkout.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, "..", "harvest-cross-host-benchmark-data.mjs");

function run(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

test("harvest: --help exits 0 and prints usage", () => {
  const result = run("--help");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /usage:/i);
  assert.match(result.stdout, /--cursor-root/);
});

test("harvest: unknown argument exits 2", () => {
  const result = run("--unknown-flag");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown argument/i);
});

test("harvest: missing cursor-root with nonexistent auto-resolve candidate exits 2", () => {
  // Use a copilot-root that has no ../oh-my-cursor sibling so auto-resolve fails.
  const result = run("--copilot-root", "/tmp");
  assert.equal(result.status, 2, `expected exit 2, got ${result.status}; stderr: ${result.stderr}`);
  assert.match(result.stderr, /--cursor-root/i);
});

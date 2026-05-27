#!/usr/bin/env node
// node:test unit tests for validate-cross-host-benchmark-data.mjs
// Tests run the script against the committed sample data under
// apps/cross-host-benchmark-site/generated/ and against deliberate
// failure cases constructed in a temp directory.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, "..", "validate-cross-host-benchmark-data.mjs");
const SAMPLE_APP_ROOT = join(__dirname, "..", "..", "apps", "cross-host-benchmark-site");

function run(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

test("validate: --help exits 0 and prints usage", () => {
  const result = run("--help");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /usage:/i);
  assert.match(result.stdout, /--app-root/);
});

test("validate: unknown argument exits 2", () => {
  const result = run("--unknown-flag");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown argument/i);
});

test("validate: committed sample data passes", () => {
  const result = run("--app-root", SAMPLE_APP_ROOT);
  assert.equal(
    result.status,
    0,
    `validation failed on committed sample data:\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
  );
  assert.match(result.stdout, /ok:.*validation complete/i);
});

test("validate: missing generated dir exits 1", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "omcp-validate-"));
  try {
    // app root exists but has no generated/ subdir
    const result = run("--app-root", tmpDir);
    assert.equal(result.status, 1, `expected exit 1, got ${result.status}`);
    assert.match(result.stderr, /FAIL:/i);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("validate: empty copilot snapshot array exits 1", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "omcp-validate-"));
  try {
    const genDir = join(tmpDir, "generated");
    mkdirSync(genDir, { recursive: true });
    // Copy the committed manifest and cursor snapshots verbatim; use empty copilot array.
    const sampleGen = join(SAMPLE_APP_ROOT, "generated");
    const manifest = JSON.parse(readFileSync(join(sampleGen, "manifest.json"), "utf8"));
    writeFileSync(join(genDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    writeFileSync(
      join(genDir, "cursor-snapshots.json"),
      readFileSync(join(sampleGen, "cursor-snapshots.json"), "utf8"),
    );
    writeFileSync(join(genDir, "copilot-snapshots.json"), "[]");
    const result = run("--app-root", tmpDir);
    assert.equal(result.status, 1, `expected exit 1, got ${result.status}`);
    assert.match(result.stderr, /FAIL:/i);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

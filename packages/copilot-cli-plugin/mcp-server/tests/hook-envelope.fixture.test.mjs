import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..", "..", "..", "..");
const HOOKS_DIR = resolve(REPO_ROOT, "packages/copilot-cli-plugin/scripts");
const TRACES_FILE = resolve(REPO_ROOT, ".omcp/traces/default.jsonl");

function runHook(scriptName, stdin = "") {
  return new Promise((resolveFn, rejectFn) => {
    const proc = spawn("bash", [resolve(HOOKS_DIR, scriptName)], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => resolveFn({ code, stdout, stderr }));
    proc.on("error", rejectFn);
    if (stdin) proc.stdin.write(stdin);
    proc.stdin.end();

    setTimeout(() => proc.kill("SIGTERM"), 10_000);
  });
}

function tracesContaining(predicate) {
  if (!existsSync(TRACES_FILE)) return [];
  const raw = readFileSync(TRACES_FILE, "utf8");
  const entries = [];
  for (const line of raw.split("\n")) {
    if (line.length === 0) continue;
    try {
      const ev = JSON.parse(line);
      if (predicate(ev)) entries.push(ev);
    } catch {
      // skip malformed
    }
  }
  return entries;
}

test("post-tool-audit emits {continue:true} on success envelope", async () => {
  const envelope = JSON.stringify({ tool: "TestSuccess", exit_code: 0 });
  const { code, stdout } = await runHook("post-tool-audit.sh", envelope);
  assert.equal(code, 0, "hook exits 0 on success envelope");
  assert.match(stdout, /\{"continue":true\}/);
});

test("post-tool-audit writes trace event on tool_failure envelope", async () => {
  const marker = `c3-fixture-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const envelope = JSON.stringify({
    tool: marker,
    exit_code: 127,
    stderr: "command not found: nonexistent",
  });

  const before = tracesContaining((e) => e.tool === marker);
  assert.equal(before.length, 0, "no trace entry exists pre-test");

  const { code } = await runHook("post-tool-audit.sh", envelope);
  assert.equal(code, 0, "hook exits 0 even when writing failure trace");

  const after = tracesContaining((e) => e.tool === marker);
  assert.equal(after.length, 1, `expected exactly 1 trace entry with tool=${marker}, got ${after.length}`);
  const entry = after[0];
  assert.equal(entry.kind, "tool_failure");
  assert.equal(entry.exit_code, 127);
  assert.match(entry.stderr_snippet ?? "", /command not found/);
});

test("post-tool-audit handles unknown envelope keys without crashing", async () => {
  const envelope = JSON.stringify({
    tool: "TestUnknown",
    exit_code: 0,
    new_unknown_key: "future Copilot field",
    nested_extra: { foo: "bar" },
  });
  const { code, stdout } = await runHook("post-tool-audit.sh", envelope);
  assert.equal(code, 0, "hook tolerates unknown keys (forward-compat)");
  assert.match(stdout, /\{"continue":true\}/);
});

test("post-tool-audit handles malformed JSON envelope gracefully", async () => {
  const { code, stdout } = await runHook("post-tool-audit.sh", "{not json");
  assert.equal(code, 0, "hook tolerates malformed envelope");
  assert.match(stdout, /\{"continue":true\}/);
});

test("log-session-start completes successfully", async () => {
  const { code, stdout } = await runHook("log-session-start.sh");
  assert.equal(code, 0, "log-session-start exits 0");
  assert.match(stdout, /\{"continue":true\}/);
});

test("session-end-audit completes successfully", async () => {
  const { code } = await runHook("session-end-audit.sh");
  assert.equal(code, 0, "session-end-audit exits 0");
});

test("omcp_call_store bridge exits 0 even when target module is missing", async () => {
  // Invoke the bridge directly via a one-line bash that sources common.sh
  // and calls a non-existent store. Should exit 0 with stderr warning.
  const cmd = `source "${resolve(REPO_ROOT, ".copilot-hooks/common.sh")}" && \
omcp_call_store nonexistent-store fakeFn '{}'`;
  const { code, stderr } = await new Promise((resolveFn, rejectFn) => {
    const proc = spawn("bash", ["-c", cmd], { cwd: REPO_ROOT });
    let stderrBuf = "";
    proc.stderr.on("data", (d) => (stderrBuf += d.toString()));
    proc.on("close", (c) => resolveFn({ code: c, stderr: stderrBuf }));
    proc.on("error", rejectFn);
  });
  assert.equal(code, 0, "bridge absorbs missing-module error");
  assert.match(stderr, /\[omcp-bridge\]/, "bridge emits [omcp-bridge] tag on stderr");
});

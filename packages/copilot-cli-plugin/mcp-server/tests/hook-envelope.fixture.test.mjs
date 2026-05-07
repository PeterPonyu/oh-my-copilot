import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..", "..", "..", "..");
const HOOKS_DIR = resolve(REPO_ROOT, "packages/copilot-cli-plugin/scripts");
const TRACES_FILE = resolve(REPO_ROOT, ".omcp/traces/default.jsonl");
const EVENTS_FILE = resolve(REPO_ROOT, ".copilot-hooks/events.jsonl");
const SESSION_LOG = resolve(REPO_ROOT, ".copilot-hooks/session.log");

function runHook(scriptName, stdin = "") {
  return new Promise((resolveFn, rejectFn) => {
    const proc = spawn("bash", [resolve(HOOKS_DIR, scriptName)], {
      cwd: REPO_ROOT,
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

function snapshotFile(path) {
  if (!existsSync(path)) return { exists: false, size: 0, lineCount: 0, raw: "" };
  const raw = readFileSync(path, "utf8");
  const lines = raw.split("\n").filter((l) => l.length > 0);
  return {
    exists: true,
    size: statSync(path).size,
    lineCount: lines.length,
    lastLine: lines[lines.length - 1] ?? "",
    raw,
  };
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

test("post-tool-audit on success envelope: appends events.jsonl, writes NO trace, returns exact continue payload", async () => {
  const before = snapshotFile(EVENTS_FILE);
  const beforeTraces = tracesContaining(() => true).length;

  const marker = `validation-success-${Date.now()}`;
  const envelope = JSON.stringify({ tool: marker, exit_code: 0 });
  const { code, stdout, stderr } = await runHook("post-tool-audit.sh", envelope);

  // Exit semantics
  assert.equal(code, 0, "hook exits 0");

  // Stdout shape — must be exactly the continue envelope (parseable JSON)
  const trimmed = stdout.trim();
  assert.equal(trimmed, '{"continue":true}', "stdout is exactly continue envelope");
  const parsed = JSON.parse(trimmed);
  assert.deepEqual(parsed, { continue: true });

  // events.jsonl appended exactly one new postToolUse line referencing the
  // workspace, with valid schema_version and the source label
  const after = snapshotFile(EVENTS_FILE);
  assert.ok(after.exists, "events.jsonl must exist after run");
  assert.equal(after.lineCount, before.lineCount + 1, "exactly one new event line");
  const newEvent = JSON.parse(after.lastLine);
  assert.equal(newEvent.event, "postToolUse");
  assert.equal(newEvent.source, "plugin");
  assert.equal(newEvent.schema_version, 1);
  assert.ok(newEvent.timestamp, "event has ISO timestamp");
  assert.ok(typeof newEvent.payload_bytes === "number", "payload_bytes recorded");

  // CRITICAL: success envelope must NOT trigger trace_write
  const afterTraces = tracesContaining(() => true).length;
  assert.equal(afterTraces, beforeTraces, "success envelope writes 0 trace events");

  // No bridge errors on success path
  assert.doesNotMatch(stderr, /\[omcp-bridge\]/, "no bridge errors on success");
});

test("post-tool-audit on tool_failure envelope: writes trace with full schema, preserves stderr_snippet, exits 0", async () => {
  const marker = `validation-failure-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const stderrSample = "command not found: nonexistent-tool-for-test";
  const envelope = JSON.stringify({
    tool: marker,
    exit_code: 127,
    stderr: stderrSample,
  });

  const before = tracesContaining((e) => e.tool === marker);
  assert.equal(before.length, 0, "no trace entry for marker pre-test");

  const { code } = await runHook("post-tool-audit.sh", envelope);
  assert.equal(code, 0, "hook exits 0 even when writing failure trace");

  const after = tracesContaining((e) => e.tool === marker);
  assert.equal(after.length, 1, `expected exactly 1 trace entry with tool=${marker}, got ${after.length}`);

  const entry = after[0];
  // Required schema fields per trace-store.mjs contract
  assert.equal(entry.kind, "tool_failure");
  assert.equal(entry.tool, marker);
  assert.equal(entry.exit_code, 127);
  assert.equal(entry.session_id, "default", "default session when none specified");
  assert.match(entry.stderr_snippet ?? "", /command not found/, "stderr passed through");
  // Ensure stderr_snippet was truncated at 500 if too long, otherwise preserved
  assert.ok(
    (entry.stderr_snippet?.length ?? 0) <= 500,
    "stderr_snippet capped at 500 bytes",
  );
  // Timestamp must be a valid ISO-8601 string
  assert.ok(entry.ts && !Number.isNaN(Date.parse(entry.ts)), "ts is parseable ISO-8601");
  // Trace was written within 10 seconds of test start
  const tsAge = Date.now() - Date.parse(entry.ts);
  assert.ok(tsAge >= 0 && tsAge < 10_000, `trace ts is fresh (age=${tsAge}ms)`);
});

test("post-tool-audit handles unknown envelope keys without crashing AND without writing spurious traces", async () => {
  const beforeTraces = tracesContaining(() => true).length;
  const envelope = JSON.stringify({
    tool: "TestUnknown",
    exit_code: 0,
    new_unknown_key: "future Copilot field",
    nested_extra: { foo: "bar" },
    array_extra: [1, 2, 3],
  });
  const { code, stdout } = await runHook("post-tool-audit.sh", envelope);
  assert.equal(code, 0, "hook tolerates unknown keys (forward-compat)");
  assert.equal(stdout.trim(), '{"continue":true}');

  // Unknown keys with exit_code=0 must NOT trigger a trace write
  const afterTraces = tracesContaining(() => true).length;
  assert.equal(afterTraces, beforeTraces, "no spurious traces from unknown-key envelope");
});

test("post-tool-audit handles malformed JSON envelope gracefully without writing trace", async () => {
  const beforeTraces = tracesContaining(() => true).length;
  const { code, stdout } = await runHook("post-tool-audit.sh", "{not json");
  assert.equal(code, 0, "hook tolerates malformed envelope");
  assert.equal(stdout.trim(), '{"continue":true}');
  const afterTraces = tracesContaining(() => true).length;
  assert.equal(afterTraces, beforeTraces, "malformed JSON yields zero trace writes");
});

test("log-session-start: appends session.log AND events.jsonl with sessionStart event", async () => {
  const beforeSession = snapshotFile(SESSION_LOG);
  const beforeEvents = snapshotFile(EVENTS_FILE);

  const { code, stdout } = await runHook("log-session-start.sh");
  assert.equal(code, 0);
  assert.equal(stdout.trim(), '{"continue":true}');

  const afterSession = snapshotFile(SESSION_LOG);
  const afterEvents = snapshotFile(EVENTS_FILE);

  // session.log must have at least one new line, and the latest line must be a sessionStart marker
  assert.ok(
    afterSession.lineCount >= beforeSession.lineCount + 1,
    `session.log must grow: was ${beforeSession.lineCount}, now ${afterSession.lineCount}`,
  );
  assert.match(
    afterSession.lastLine,
    /event=sessionStart|active_modes=/,
    "session.log last line is a sessionStart record",
  );

  // events.jsonl gets a structured event with parseable JSON + correct event name
  assert.equal(afterEvents.lineCount, beforeEvents.lineCount + 1);
  const newEvent = JSON.parse(afterEvents.lastLine);
  assert.equal(newEvent.event, "sessionStart");
  assert.equal(newEvent.source, "plugin");
});

test("session-end-audit: appends session.log with sessionEnd marker AND emits structured event line", async () => {
  const beforeSession = snapshotFile(SESSION_LOG);
  const beforeEvents = snapshotFile(EVENTS_FILE);

  const { code } = await runHook("session-end-audit.sh");
  assert.equal(code, 0);

  const afterSession = snapshotFile(SESSION_LOG);
  const afterEvents = snapshotFile(EVENTS_FILE);

  // session.log gets an explicit "event=sessionEnd" marker line
  assert.ok(afterSession.lineCount > beforeSession.lineCount, "session.log appended");
  assert.match(afterSession.lastLine, /event=sessionEnd/);

  // events.jsonl gets a sessionEnd JSON line with ts/cwd
  assert.equal(afterEvents.lineCount, beforeEvents.lineCount + 1);
  const newEvent = JSON.parse(afterEvents.lastLine);
  assert.equal(newEvent.event, "sessionEnd");
  assert.equal(newEvent.source, "plugin");
  assert.ok(newEvent.timestamp);
});

test("omcp_call_store bridge absorbs missing-module error AND emits diagnostic [omcp-bridge] tag", async () => {
  const cmd = `source "${resolve(REPO_ROOT, ".copilot-hooks/common.sh")}" && \
omcp_call_store nonexistent-store fakeFn '{}'`;
  const { code, stderr, stdout } = await new Promise((resolveFn, rejectFn) => {
    const proc = spawn("bash", ["-c", cmd], { cwd: REPO_ROOT });
    let stderrBuf = "";
    let stdoutBuf = "";
    proc.stderr.on("data", (d) => (stderrBuf += d.toString()));
    proc.stdout.on("data", (d) => (stdoutBuf += d.toString()));
    proc.on("close", (c) => resolveFn({ code: c, stderr: stderrBuf, stdout: stdoutBuf }));
    proc.on("error", rejectFn);
  });
  assert.equal(code, 0, "bridge absorbs missing-module error");
  assert.match(stderr, /\[omcp-bridge\]/, "bridge emits [omcp-bridge] tag");
  assert.match(stderr, /nonexistent-store/, "stderr names the failed module");
  assert.equal(stdout.trim(), "", "no JSON written to stdout when bridge fails");
});

test("omcp_call_store bridge: successful round-trip writes valid JSON to stdout", async () => {
  // Call notepad-store.notepadStats which exists in the real install.
  // Expects {total, byLane, oldest, newest, unparseable} shape.
  const cmd = `source "${resolve(REPO_ROOT, ".copilot-hooks/common.sh")}" && \
omcp_call_store notepad-store notepadStats '{}'`;
  const { code, stdout } = await new Promise((resolveFn, rejectFn) => {
    const proc = spawn("bash", ["-c", cmd], { cwd: REPO_ROOT });
    let stdoutBuf = "";
    proc.stdout.on("data", (d) => (stdoutBuf += d.toString()));
    proc.on("close", (c) => resolveFn({ code: c, stdout: stdoutBuf }));
    proc.on("error", rejectFn);
  });
  assert.equal(code, 0);
  // stdout MUST be valid JSON with the expected shape
  const result = JSON.parse(stdout.trim());
  assert.ok("total" in result, "result has 'total' key");
  assert.ok("byLane" in result, "result has 'byLane' key");
  assert.ok(typeof result.byLane.manual === "number", "byLane.manual is numeric");
  assert.ok(typeof result.byLane.working === "number", "byLane.working is numeric");
  assert.ok(typeof result.byLane.priority === "number", "byLane.priority is numeric");
});

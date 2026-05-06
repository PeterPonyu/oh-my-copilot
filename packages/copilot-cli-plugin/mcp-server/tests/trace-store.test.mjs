import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  traceWrite,
  traceTimeline,
  traceSummary,
  traceListSessions,
} from "../trace-store.mjs";

const originalCwd = process.cwd();

function freshCwd() {
  const dir = mkdtempSync(join(tmpdir(), "omcp-tr-"));
  process.chdir(dir);
  return dir;
}

function teardown(dir) {
  process.chdir(originalCwd);
  rmSync(dir, { recursive: true, force: true });
}

test("traceWrite appends a JSONL event with default session", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const r = await traceWrite({ kind: "note", text: "hello" });
  assert.equal(r.ok, true);
  assert.equal(r.session_id, "default");
  assert.equal(r.kind, "note");

  const raw = readFileSync(join(dir, ".omcp", "traces", "default.jsonl"), "utf8");
  const event = JSON.parse(raw.trim());
  assert.equal(event.kind, "note");
  assert.equal(event.text, "hello");
  assert.equal(event.session_id, "default");
  assert.ok(event.ts);
});

test("traceWrite scopes to custom session_id", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await traceWrite({ kind: "hypothesis", hypothesis: "race condition", session_id: "s1" });
  await traceWrite({ kind: "note", text: "in s2", session_id: "s2" });

  const raw1 = readFileSync(join(dir, ".omcp", "traces", "s1.jsonl"), "utf8");
  const raw2 = readFileSync(join(dir, ".omcp", "traces", "s2.jsonl"), "utf8");
  assert.match(raw1, /race condition/);
  assert.match(raw2, /in s2/);
  assert.doesNotMatch(raw1, /in s2/);
});

test("traceWrite rejects unknown kind", async () => {
  await assert.rejects(
    traceWrite({ kind: "bogus" }),
    /kind must be one of/,
  );
});

test("traceWrite rejects path traversal in session_id", async () => {
  await assert.rejects(
    traceWrite({ kind: "note", text: "x", session_id: "../escape" }),
    /must not contain/,
  );
  await assert.rejects(
    traceWrite({ kind: "note", text: "x", session_id: "with/slash" }),
    /must not contain/,
  );
});

test("traceTimeline returns events in append order", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await traceWrite({ kind: "note", text: "1" });
  await traceWrite({ kind: "note", text: "2" });
  await traceWrite({ kind: "note", text: "3" });

  const { events } = await traceTimeline({});
  assert.equal(events.length, 3);
  assert.deepEqual(events.map((e) => e.text), ["1", "2", "3"]);
});

test("traceTimeline filters by kind", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await traceWrite({ kind: "hypothesis", hypothesis: "h1" });
  await traceWrite({ kind: "evidence", evidence: "e1" });
  await traceWrite({ kind: "hypothesis", hypothesis: "h2" });
  await traceWrite({ kind: "outcome", outcome: "fixed" });

  const { events } = await traceTimeline({ kind: "hypothesis" });
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((e) => e.hypothesis), ["h1", "h2"]);
});

test("traceTimeline limits to last N events", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  for (let i = 1; i <= 5; i++) {
    await traceWrite({ kind: "note", text: `n${i}` });
  }

  const { events } = await traceTimeline({ limit: 2 });
  assert.deepEqual(events.map((e) => e.text), ["n4", "n5"]);
});

test("traceTimeline returns empty when session has no events", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const { events } = await traceTimeline({ session_id: "nonexistent" });
  assert.deepEqual(events, []);
});

test("traceSummary aggregates by kind and reports timestamps", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await traceWrite({ kind: "tool_call", tool: "Read" });
  await traceWrite({ kind: "tool_failure", tool: "Bash", exit_code: 1 });
  await traceWrite({ kind: "hypothesis", hypothesis: "perms issue" });
  await traceWrite({ kind: "evidence", evidence: "errno EACCES" });
  await traceWrite({ kind: "outcome", outcome: "added chmod" });

  const summary = await traceSummary({});
  assert.equal(summary.total, 5);
  assert.equal(summary.byKind.tool_failure, 1);
  assert.equal(summary.byKind.hypothesis, 1);
  assert.equal(summary.byKind.outcome, 1);
  assert.deepEqual(summary.hypotheses, ["perms issue"]);
  assert.equal(summary.last_outcome.outcome, "added chmod");
  assert.ok(summary.first_ts);
  assert.ok(summary.last_ts);
});

test("traceSummary tracks last_outcome correctly when multiple outcomes exist", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await traceWrite({ kind: "outcome", outcome: "first" });
  await traceWrite({ kind: "outcome", outcome: "second" });
  await traceWrite({ kind: "outcome", outcome: "third" });

  const summary = await traceSummary({});
  assert.equal(summary.last_outcome.outcome, "third");
});

test("traceSummary on missing session returns zero counts", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const summary = await traceSummary({ session_id: "ghost" });
  assert.equal(summary.session_id, "ghost");
  assert.equal(summary.total, 0);
  assert.deepEqual(summary.hypotheses, []);
  assert.equal(summary.last_outcome, null);
});

test("traceListSessions enumerates jsonl files", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await traceWrite({ kind: "note", text: "x", session_id: "alpha" });
  await traceWrite({ kind: "note", text: "y", session_id: "beta" });
  await traceWrite({ kind: "note", text: "z", session_id: "gamma" });

  const { sessions } = await traceListSessions();
  assert.deepEqual(sessions, ["alpha", "beta", "gamma"]);
});

test("traceListSessions returns empty when traces dir does not exist", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const { sessions } = await traceListSessions();
  assert.deepEqual(sessions, []);
});

test("malformed jsonl lines are skipped, not thrown", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await traceWrite({ kind: "note", text: "valid 1" });
  // Append a malformed line
  const filePath = join(dir, ".omcp", "traces", "default.jsonl");
  const { appendFileSync } = await import("node:fs");
  appendFileSync(filePath, "{this is not json\n", "utf8");
  await traceWrite({ kind: "note", text: "valid 2" });

  const { events } = await traceTimeline({});
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((e) => e.text), ["valid 1", "valid 2"]);
});

test("tool_failure event captures all relevant fields", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await traceWrite({
    kind: "tool_failure",
    tool: "Bash",
    exit_code: 127,
    stderr_snippet: "command not found: foo",
    text: "user requested foo",
  });

  const { events } = await traceTimeline({ kind: "tool_failure" });
  assert.equal(events.length, 1);
  const e = events[0];
  assert.equal(e.tool, "Bash");
  assert.equal(e.exit_code, 127);
  assert.equal(e.stderr_snippet, "command not found: foo");
  assert.equal(e.text, "user requested foo");
});

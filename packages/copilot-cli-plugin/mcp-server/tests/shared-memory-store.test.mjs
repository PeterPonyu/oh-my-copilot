import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  sharedMemoryWrite,
  sharedMemoryRead,
  sharedMemoryList,
  sharedMemoryDelete,
  sharedMemoryCleanup,
} from "../shared-memory-store.mjs";

const originalCwd = process.cwd();

function freshCwd() {
  const dir = mkdtempSync(join(tmpdir(), "omcp-sm-"));
  process.chdir(dir);
  return dir;
}

function teardown(dir) {
  process.chdir(originalCwd);
  rmSync(dir, { recursive: true, force: true });
}

test("sharedMemoryWrite appends a JSONL event", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const r = await sharedMemoryWrite({
    channel: "team-alpha",
    kind: "finding",
    from: "worker-1",
    payload: { line: 42, file: "main.ts" },
  });
  assert.equal(r.ok, true);
  assert.equal(r.channel, "team-alpha");

  const filePath = join(dir, ".omcp", "shared-memory", "team-alpha.jsonl");
  const raw = readFileSync(filePath, "utf8");
  const event = JSON.parse(raw.trim());
  assert.equal(event.kind, "finding");
  assert.equal(event.from, "worker-1");
  assert.deepEqual(event.payload, { line: 42, file: "main.ts" });
  assert.ok(event.ts);
});

test("sharedMemoryWrite rejects unknown kind", async () => {
  await assert.rejects(
    sharedMemoryWrite({ channel: "c", kind: "bogus" }),
    /kind must be one of/,
  );
});

test("sharedMemoryWrite rejects bad channel id", async () => {
  await assert.rejects(
    sharedMemoryWrite({ channel: "../escape", kind: "note" }),
    /alphanumeric/,
  );
  await assert.rejects(
    sharedMemoryWrite({ channel: "with/slash", kind: "note" }),
    /alphanumeric/,
  );
  await assert.rejects(
    sharedMemoryWrite({ channel: "", kind: "note" }),
    /alphanumeric/,
  );
});

test("sharedMemoryRead returns events in append order", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await sharedMemoryWrite({ channel: "ch", kind: "note", payload: 1 });
  await sharedMemoryWrite({ channel: "ch", kind: "note", payload: 2 });
  await sharedMemoryWrite({ channel: "ch", kind: "note", payload: 3 });

  const { events } = await sharedMemoryRead({ channel: "ch" });
  assert.deepEqual(events.map((e) => e.payload), [1, 2, 3]);
});

test("sharedMemoryRead filters by kind, from, since, limit", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await sharedMemoryWrite({ channel: "ch", kind: "task_assigned", from: "leader", payload: 1 });
  await sharedMemoryWrite({ channel: "ch", kind: "finding", from: "worker-1", payload: 2 });
  await sharedMemoryWrite({ channel: "ch", kind: "finding", from: "worker-2", payload: 3 });
  await sharedMemoryWrite({ channel: "ch", kind: "task_done", from: "worker-1", payload: 4 });

  const findings = await sharedMemoryRead({ channel: "ch", kind: "finding" });
  assert.equal(findings.events.length, 2);

  const fromW1 = await sharedMemoryRead({ channel: "ch", from: "worker-1" });
  assert.equal(fromW1.events.length, 2);

  const last2 = await sharedMemoryRead({ channel: "ch", limit: 2 });
  assert.deepEqual(last2.events.map((e) => e.payload), [3, 4]);
});

test("sharedMemoryRead missing channel returns empty events", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const { events } = await sharedMemoryRead({ channel: "ghost" });
  assert.deepEqual(events, []);
});

test("sharedMemoryList returns channels with last_seen metadata", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await sharedMemoryWrite({ channel: "alpha", kind: "note", from: "a" });
  await sharedMemoryWrite({ channel: "beta", kind: "finding", from: "b" });

  const { channels } = await sharedMemoryList();
  assert.equal(channels.length, 2);
  const alpha = channels.find((c) => c.channel === "alpha");
  assert.ok(alpha.last_seen);
  assert.equal(alpha.last_kind, "note");
  assert.equal(alpha.last_from, "a");
});

test("sharedMemoryList on empty dir returns empty array", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const { channels } = await sharedMemoryList();
  assert.deepEqual(channels, []);
});

test("sharedMemoryDelete removes file and meta entry", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await sharedMemoryWrite({ channel: "doomed", kind: "note" });
  const filePath = join(dir, ".omcp", "shared-memory", "doomed.jsonl");
  assert.equal(existsSync(filePath), true);

  await sharedMemoryDelete({ channel: "doomed" });
  assert.equal(existsSync(filePath), false);

  const { channels } = await sharedMemoryList();
  assert.equal(channels.length, 0);
});

test("sharedMemoryDelete on missing channel is a no-op (still ok)", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const r = await sharedMemoryDelete({ channel: "ghost" });
  assert.equal(r.ok, true);
});

test("sharedMemoryCleanup purges channels whose last_seen is past cutoff", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await sharedMemoryWrite({ channel: "fresh", kind: "note" });
  await sharedMemoryWrite({ channel: "stale", kind: "note" });

  // Backdate stale's meta
  const metaPath = join(dir, ".omcp", "shared-memory", "_meta.json");
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  meta.stale.last_seen = "2020-01-01T00:00:00.000Z";
  const { writeFileSync } = await import("node:fs");
  writeFileSync(metaPath, JSON.stringify(meta), "utf8");

  const result = await sharedMemoryCleanup({ maxAgeDays: 7 });
  assert.deepEqual(result.removed, ["stale"]);

  const { channels } = await sharedMemoryList();
  assert.deepEqual(channels.map((c) => c.channel), ["fresh"]);
});

test("sharedMemoryCleanup is idempotent", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const r1 = await sharedMemoryCleanup({ maxAgeDays: 7 });
  const r2 = await sharedMemoryCleanup({ maxAgeDays: 7 });
  assert.deepEqual(r1.removed, []);
  assert.deepEqual(r2.removed, []);
});

test("sharedMemoryCleanup rejects negative maxAgeDays", async () => {
  await assert.rejects(
    sharedMemoryCleanup({ maxAgeDays: -1 }),
    /non-negative/,
  );
});

test("malformed jsonl lines are skipped, not thrown", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await sharedMemoryWrite({ channel: "ch", kind: "note", payload: "valid 1" });
  const filePath = join(dir, ".omcp", "shared-memory", "ch.jsonl");
  const { appendFileSync } = await import("node:fs");
  appendFileSync(filePath, "{this is not json\n", "utf8");
  await sharedMemoryWrite({ channel: "ch", kind: "note", payload: "valid 2" });

  const { events } = await sharedMemoryRead({ channel: "ch" });
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((e) => e.payload), ["valid 1", "valid 2"]);
});

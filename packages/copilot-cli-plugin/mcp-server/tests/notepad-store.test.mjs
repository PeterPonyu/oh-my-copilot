import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  notepadRead,
  notepadWrite,
  notepadWritePriority,
  notepadWriteWorking,
  notepadPrune,
  notepadStats,
} from "../notepad-store.mjs";

const originalCwd = process.cwd();

function freshCwd() {
  const dir = mkdtempSync(join(tmpdir(), "omcp-np-"));
  process.chdir(dir);
  return dir;
}

function teardown(dir) {
  process.chdir(originalCwd);
  rmSync(dir, { recursive: true, force: true });
}

function notepadFile(dir) {
  return join(dir, ".omcp", "notepad.md");
}

function seedNotepad(dir, lines) {
  mkdirSync(join(dir, ".omcp"), { recursive: true });
  writeFileSync(notepadFile(dir), lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
}

test("notepadWritePriority appends with priority lane", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await notepadWritePriority({ entry: "important rule" });
  const raw = readFileSync(notepadFile(dir), "utf8");
  assert.match(raw, /\[priority\] important rule/);
});

test("notepadWriteWorking appends with working lane", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await notepadWriteWorking({ entry: "midway thought" });
  const raw = readFileSync(notepadFile(dir), "utf8");
  assert.match(raw, /\[working\] midway thought/);
});

test("notepadWrite (default) lands in manual lane", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await notepadWrite({ entry: "default lane" });
  const raw = readFileSync(notepadFile(dir), "utf8");
  assert.match(raw, /\[manual\] default lane/);
});

test("notepadWrite rejects invalid priority", async () => {
  await assert.rejects(
    notepadWrite({ entry: "x", priority: "bogus" }),
    /priority must be one of/,
  );
});

test("notepadWrite rejects empty entry", async () => {
  await assert.rejects(notepadWrite({ entry: "" }), /non-empty 'entry'/);
  await assert.rejects(notepadWrite({}), /non-empty 'entry'/);
});

test("notepadStats on missing file returns empty stats", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const stats = await notepadStats();
  assert.equal(stats.total, 0);
  assert.deepEqual(stats.byLane, { manual: 0, working: 0, priority: 0 });
  assert.equal(stats.oldest, null);
  assert.equal(stats.newest, null);
});

test("notepadStats counts by lane and reports oldest/newest", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  seedNotepad(dir, [
    "[2026-01-01T00:00:00.000Z] [manual] one",
    "[2026-02-01T00:00:00.000Z] [working] two",
    "[2026-03-01T00:00:00.000Z] [priority] three",
    "[2026-04-01T00:00:00.000Z] [working] four",
  ]);

  const stats = await notepadStats();
  assert.equal(stats.total, 4);
  assert.deepEqual(stats.byLane, { manual: 1, working: 2, priority: 1 });
  assert.equal(stats.oldest, "2026-01-01T00:00:00.000Z");
  assert.equal(stats.newest, "2026-04-01T00:00:00.000Z");
  assert.equal(stats.unparseable, 0);
});

test("notepadStats counts unparseable lines separately", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  seedNotepad(dir, [
    "[2026-01-01T00:00:00.000Z] [manual] valid",
    "this is just freeform text",
    "[2026-02-01T00:00:00.000Z] [priority] still valid",
  ]);

  const stats = await notepadStats();
  assert.equal(stats.total, 2);
  assert.equal(stats.unparseable, 1);
});

test("notepadPrune default drops old manual/working but preserves priority", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const ancient = "2020-01-01T00:00:00.000Z";
  const recent = new Date().toISOString();

  seedNotepad(dir, [
    `[${ancient}] [manual] old manual`,
    `[${ancient}] [working] old working`,
    `[${ancient}] [priority] ancient priority`,
    `[${recent}] [manual] fresh manual`,
  ]);

  const result = await notepadPrune({});
  assert.equal(result.pruned, 2);
  assert.equal(result.kept, 2);

  const raw = readFileSync(notepadFile(dir), "utf8");
  assert.match(raw, /ancient priority/);
  assert.match(raw, /fresh manual/);
  assert.doesNotMatch(raw, /old manual/);
  assert.doesNotMatch(raw, /old working/);
});

test("notepadPrune with explicit lane prunes only that lane", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const ancient = "2020-01-01T00:00:00.000Z";
  seedNotepad(dir, [
    `[${ancient}] [manual] old manual`,
    `[${ancient}] [working] old working`,
    `[${ancient}] [priority] old priority`,
  ]);

  const result = await notepadPrune({ lane: "priority" });
  assert.equal(result.pruned, 1);
  assert.equal(result.kept, 2);

  const raw = readFileSync(notepadFile(dir), "utf8");
  assert.doesNotMatch(raw, /old priority/);
  assert.match(raw, /old manual/);
  assert.match(raw, /old working/);
});

test("notepadPrune with maxAgeDays=0 prunes everything in target lanes", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const recent = new Date().toISOString();
  seedNotepad(dir, [
    `[${recent}] [manual] one`,
    `[${recent}] [working] two`,
    `[${recent}] [priority] three`,
  ]);

  const result = await notepadPrune({ maxAgeDays: 0 });
  assert.equal(result.pruned, 2);
  assert.equal(result.kept, 1);

  const raw = readFileSync(notepadFile(dir), "utf8");
  assert.match(raw, /three/);
  assert.doesNotMatch(raw, /one/);
  assert.doesNotMatch(raw, /two/);
});

test("notepadPrune preserves unparseable lines", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const ancient = "2020-01-01T00:00:00.000Z";
  seedNotepad(dir, [
    `[${ancient}] [manual] old`,
    "freeform unparseable",
    `[${ancient}] [working] also old`,
  ]);

  await notepadPrune({});
  const raw = readFileSync(notepadFile(dir), "utf8");
  assert.match(raw, /freeform unparseable/);
  assert.doesNotMatch(raw, /old/);
});

test("notepadPrune on missing file is a no-op", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const result = await notepadPrune({});
  assert.deepEqual(result, { ok: true, kept: 0, pruned: 0 });
});

test("notepadPrune rejects invalid lane and negative maxAgeDays", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await assert.rejects(notepadPrune({ lane: "bogus" }), /lane must be/);
  await assert.rejects(notepadPrune({ maxAgeDays: -1 }), /non-negative/);
});

test("read/write round trip preserves entries (write-many then read)", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await notepadWritePriority({ entry: "first" });
  await notepadWriteWorking({ entry: "second" });
  await notepadWrite({ entry: "third" });

  const { content } = await notepadRead();
  assert.match(content, /\[priority\] first/);
  assert.match(content, /\[working\] second/);
  assert.match(content, /\[manual\] third/);
});

test("write does not leave .tmp residue", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await notepadWriteWorking({ entry: "x" });
  await notepadPrune({ maxAgeDays: 999 });

  const { readdirSync } = await import("node:fs");
  const entries = readdirSync(join(dir, ".omcp"));
  assert.deepEqual(entries.filter((e) => e.includes(".tmp.")), []);
});

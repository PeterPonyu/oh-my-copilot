import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  projectMemoryRead,
  projectMemoryWrite,
  projectMemoryAddNote,
  projectMemoryAddDirective,
} from "../project-memory-store.mjs";

const originalCwd = process.cwd();

function freshCwd() {
  const dir = mkdtempSync(join(tmpdir(), "omcp-pm-"));
  process.chdir(dir);
  return dir;
}

function teardown(dir) {
  process.chdir(originalCwd);
  rmSync(dir, { recursive: true, force: true });
}

test("projectMemoryRead returns empty memory when file missing", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const result = await projectMemoryRead();
  assert.equal(result.version, 1);
  assert.deepEqual(result.notes, []);
  assert.deepEqual(result.directives, []);
  assert.deepEqual(result.facts, {});
});

test("projectMemoryAddNote appends a note with auto id and tags", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const r1 = await projectMemoryAddNote({ text: "first note", tags: ["arch"] });
  const r2 = await projectMemoryAddNote({ text: "second note" });

  assert.equal(r1.note.id, "n_1");
  assert.equal(r1.note.text, "first note");
  assert.deepEqual(r1.note.tags, ["arch"]);
  assert.ok(r1.note.ts, "timestamp recorded");

  assert.equal(r2.note.id, "n_2");
  assert.deepEqual(r2.note.tags, []);

  const { notes } = await projectMemoryRead({ kind: "notes" });
  assert.equal(notes.length, 2);
});

test("projectMemoryAddNote rejects empty text", async () => {
  await assert.rejects(projectMemoryAddNote({ text: "" }), /requires non-empty 'text'/);
  await assert.rejects(projectMemoryAddNote({}), /requires non-empty 'text'/);
});

test("projectMemoryAddDirective records scope and assigns d_ id", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const r1 = await projectMemoryAddDirective({ text: "always run tests" });
  const r2 = await projectMemoryAddDirective({ text: "session-only", scope: "session" });

  assert.equal(r1.directive.id, "d_1");
  assert.equal(r1.directive.scope, "permanent");
  assert.equal(r2.directive.id, "d_2");
  assert.equal(r2.directive.scope, "session");
});

test("projectMemoryAddDirective rejects invalid scope", async () => {
  await assert.rejects(
    projectMemoryAddDirective({ text: "x", scope: "bogus" }),
    /scope must be/,
  );
});

test("seq counter is shared across notes and directives", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const n1 = await projectMemoryAddNote({ text: "a" });
  const d1 = await projectMemoryAddDirective({ text: "b" });
  const n2 = await projectMemoryAddNote({ text: "c" });

  assert.equal(n1.note.id, "n_1");
  assert.equal(d1.directive.id, "d_2");
  assert.equal(n2.note.id, "n_3");
});

test("projectMemoryWrite merges facts and deletes on null", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await projectMemoryWrite({ facts: { lang: "ts", framework: "react" } });
  const r1 = await projectMemoryRead({ kind: "facts" });
  assert.deepEqual(r1.facts, { lang: "ts", framework: "react" });

  await projectMemoryWrite({ facts: { lang: "rust", db: "postgres" } });
  const r2 = await projectMemoryRead({ kind: "facts" });
  assert.deepEqual(r2.facts, { lang: "rust", framework: "react", db: "postgres" });

  await projectMemoryWrite({ facts: { framework: null } });
  const r3 = await projectMemoryRead({ kind: "facts" });
  assert.deepEqual(r3.facts, { lang: "rust", db: "postgres" });
});

test("projectMemoryWrite rejects non-object facts", async () => {
  await assert.rejects(projectMemoryWrite({}), /requires 'facts' object/);
  await assert.rejects(projectMemoryWrite({ facts: null }), /requires 'facts' object/);
  await assert.rejects(projectMemoryWrite({ facts: [] }), /requires 'facts' object/);
});

test("projectMemoryRead filters notes by tag", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await projectMemoryAddNote({ text: "a", tags: ["arch"] });
  await projectMemoryAddNote({ text: "b", tags: ["test"] });
  await projectMemoryAddNote({ text: "c", tags: ["arch", "test"] });
  await projectMemoryAddNote({ text: "d" });

  const arch = await projectMemoryRead({ kind: "notes", tag: "arch" });
  assert.equal(arch.notes.length, 2);
  assert.deepEqual(arch.notes.map((n) => n.text), ["a", "c"]);

  const test = await projectMemoryRead({ kind: "notes", tag: "test" });
  assert.equal(test.notes.length, 2);
});

test("projectMemoryRead caps by limit (returns most-recent N)", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  for (let i = 1; i <= 5; i++) {
    await projectMemoryAddNote({ text: `note ${i}` });
  }

  const last2 = await projectMemoryRead({ kind: "notes", limit: 2 });
  assert.deepEqual(last2.notes.map((n) => n.text), ["note 4", "note 5"]);
});

test("write is atomic (no .tmp leftovers in steady state)", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await projectMemoryAddNote({ text: "a" });
  await projectMemoryWrite({ facts: { x: 1 } });

  const omcpDir = join(dir, ".omcp");
  const { readdirSync } = await import("node:fs");
  const entries = readdirSync(omcpDir);
  assert.deepEqual(
    entries.filter((e) => e.includes(".tmp.")),
    [],
    "no temp files left behind",
  );
});

test("read tolerates corrupted JSON file", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await projectMemoryAddNote({ text: "valid" });
  const filePath = join(dir, ".omcp", "project-memory.json");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(filePath, "{not valid json", "utf8");

  const result = await projectMemoryRead();
  assert.deepEqual(result.notes, []);
  assert.deepEqual(result.facts, {});
});

test("memory persists across calls and matches on-disk JSON", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await projectMemoryAddNote({ text: "alpha" });
  await projectMemoryAddDirective({ text: "be careful" });
  await projectMemoryWrite({ facts: { ans: 42 } });

  const filePath = join(dir, ".omcp", "project-memory.json");
  const onDisk = JSON.parse(readFileSync(filePath, "utf8"));

  assert.equal(onDisk.version, 1);
  assert.equal(onDisk._seq, 2);
  assert.equal(onDisk.notes.length, 1);
  assert.equal(onDisk.directives.length, 1);
  assert.deepEqual(onDisk.facts, { ans: 42 });
});

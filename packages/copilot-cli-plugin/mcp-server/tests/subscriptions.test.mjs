import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  listResources,
  readResource,
  subscribeResource,
  unsubscribeResource,
  isResourceSubscribed,
  listResourceSubscriptions,
  _clearResourceSubscriptions,
} from "../resources.mjs";
import { resourceEvents } from "../events.mjs";
import { stateWrite, stateClear } from "../state-store.mjs";
import { transitionRecord } from "../../orchestrator/orchestrator.mjs";
import { notepadWrite, notepadPrune } from "../notepad-store.mjs";
import {
  projectMemoryAddNote,
  projectMemoryAddDirective,
} from "../project-memory-store.mjs";

const originalCwd = process.cwd();

function freshCwd() {
  const dir = mkdtempSync(join(tmpdir(), "omcp-sub-"));
  process.chdir(dir);
  _clearResourceSubscriptions();
  return dir;
}

function teardown(dir) {
  process.chdir(originalCwd);
  _clearResourceSubscriptions();
  rmSync(dir, { recursive: true, force: true });
}

// --- Resource extension: state + pipeline -------------------------------

test("listResources includes state entries written via stateWrite", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  await stateWrite("team-state", { active: true });
  await stateWrite("ralph-state", { iteration: 1 });

  const r = await listResources();
  const stateUris = r.resources
    .map((x) => x.uri)
    .filter((u) => u.startsWith("omcp://state/"))
    .sort();
  assert.deepEqual(stateUris, [
    "omcp://state/ralph-state",
    "omcp://state/team-state",
  ]);
});

test("listResources always includes the pipeline state singleton", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  const r = await listResources();
  const pipeline = r.resources.find((x) => x.uri === "omcp://pipeline/state");
  assert.ok(pipeline, "expected omcp://pipeline/state in listResources");
  assert.equal(pipeline.mimeType, "application/json");
});

test("readResource on omcp://state/<key> returns the stored JSON", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  await stateWrite("autopilot-state", { phase: "plan", iteration: 3 });

  const r = await readResource({ uri: "omcp://state/autopilot-state" });
  assert.equal(r.contents[0].mimeType, "application/json");
  const parsed = JSON.parse(r.contents[0].text);
  assert.equal(parsed.phase, "plan");
  assert.equal(parsed.iteration, 3);
});

test("readResource on missing state key throws", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  await assert.rejects(
    () => readResource({ uri: "omcp://state/no-such" }),
    /not found/
  );
});

test("readResource on omcp://pipeline/state returns the pipeline JSON", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  transitionRecord({ from: null, to: "spec", artifact: "/tmp/a.md" });
  transitionRecord({ from: "spec", to: "plan", artifact: "/tmp/b.md" });

  const r = await readResource({ uri: "omcp://pipeline/state" });
  const parsed = JSON.parse(r.contents[0].text);
  assert.equal(parsed.transitions.length, 2);
  assert.equal(parsed.transitions[1].to, "plan");
});

test("readResource on omcp://pipeline/state works even when no transitions recorded", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  const r = await readResource({ uri: "omcp://pipeline/state" });
  const parsed = JSON.parse(r.contents[0].text);
  assert.deepEqual(parsed, { stages: [], transitions: [] });
});

// --- Subscription registry ---------------------------------------------

test("subscribeResource records the uri", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  subscribeResource("omcp://state/foo");
  assert.ok(isResourceSubscribed("omcp://state/foo"));
  assert.ok(!isResourceSubscribed("omcp://state/bar"));
});

test("unsubscribeResource removes the uri", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  subscribeResource("omcp://pipeline/state");
  assert.ok(isResourceSubscribed("omcp://pipeline/state"));
  const r = unsubscribeResource("omcp://pipeline/state");
  assert.equal(r.removed, true);
  assert.ok(!isResourceSubscribed("omcp://pipeline/state"));
});

test("unsubscribeResource on an unknown uri is a no-op (returns removed=false)", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  const r = unsubscribeResource("omcp://state/never-subscribed");
  assert.equal(r.removed, false);
});

test("listResourceSubscriptions returns the current set", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  subscribeResource("omcp://state/a");
  subscribeResource("omcp://state/b");
  const subs = listResourceSubscriptions().sort();
  assert.deepEqual(subs, ["omcp://state/a", "omcp://state/b"]);
});

test("subscribe rejects empty/missing uri", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  assert.throws(() => subscribeResource(""), /non-empty 'uri'/);
  assert.throws(() => subscribeResource(null), /non-empty 'uri'/);
});

test("subscribe rejects unsupported uri", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  assert.throws(
    () => subscribeResource("omcp://garbage/x"),
    /unsupported uri/
  );
  assert.throws(
    () => subscribeResource("not-a-uri"),
    /unsupported uri/
  );
});

// --- Event emission on writes ------------------------------------------

function captureEvents(timeoutMs = 50) {
  const events = [];
  const listener = (uri) => events.push(uri);
  resourceEvents.on("updated", listener);
  return {
    stop: () => resourceEvents.off("updated", listener),
    events,
    async wait() {
      await new Promise((r) => setTimeout(r, timeoutMs));
    },
  };
}

test("stateWrite emits omcp://state/<key> on the resourceEvents bus", async (t) => {
  const dir = freshCwd();
  const cap = captureEvents();
  t.after(() => {
    cap.stop();
    teardown(dir);
  });

  await stateWrite("ralph-state", { iteration: 1 });
  await cap.wait();

  assert.ok(
    cap.events.includes("omcp://state/ralph-state"),
    `expected omcp://state/ralph-state in events, got: ${JSON.stringify(cap.events)}`
  );
});

test("stateClear (which internally writes a tombstone) also emits an update", async (t) => {
  const dir = freshCwd();
  const cap = captureEvents();
  t.after(() => {
    cap.stop();
    teardown(dir);
  });

  await stateClear({ mode: "team", session_id: "s1" });
  await cap.wait();

  assert.ok(
    cap.events.includes("omcp://state/team-state"),
    `expected omcp://state/team-state in events, got: ${JSON.stringify(cap.events)}`
  );
});

test("transitionRecord emits omcp://pipeline/state", async (t) => {
  const dir = freshCwd();
  const cap = captureEvents();
  t.after(() => {
    cap.stop();
    teardown(dir);
  });

  transitionRecord({ from: null, to: "spec", artifact: "/tmp/a.md" });
  await cap.wait();

  assert.ok(
    cap.events.includes("omcp://pipeline/state"),
    `expected omcp://pipeline/state in events, got: ${JSON.stringify(cap.events)}`
  );
});

// --- notepad resource + emission ---------------------------------------

test("listResources includes omcp://notepad singleton", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  const r = await listResources();
  const notepad = r.resources.find((x) => x.uri === "omcp://notepad");
  assert.ok(notepad, "expected omcp://notepad in listResources");
  assert.equal(notepad.mimeType, "text/markdown");
});

test("readResource on omcp://notepad returns markdown content", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  await notepadWrite({ entry: "note one" });
  await notepadWrite({ entry: "note two", priority: "priority" });

  const r = await readResource({ uri: "omcp://notepad" });
  assert.equal(r.contents[0].mimeType, "text/markdown");
  assert.match(r.contents[0].text, /note one/);
  assert.match(r.contents[0].text, /note two/);
  assert.match(r.contents[0].text, /\[priority\]/);
});

test("readResource on omcp://notepad returns empty when no notepad written", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  const r = await readResource({ uri: "omcp://notepad" });
  assert.equal(r.contents[0].text, "");
});

test("notepadWrite emits omcp://notepad", async (t) => {
  const dir = freshCwd();
  const cap = captureEvents();
  t.after(() => {
    cap.stop();
    teardown(dir);
  });
  await notepadWrite({ entry: "hello" });
  await cap.wait();
  assert.ok(
    cap.events.includes("omcp://notepad"),
    `expected omcp://notepad in events, got: ${JSON.stringify(cap.events)}`
  );
});

test("notepadPrune emits omcp://notepad only when entries were actually pruned", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  // First: prune a fresh notepad — should emit nothing
  const cap1 = captureEvents();
  await notepadPrune({ maxAgeDays: 0 });
  await cap1.wait();
  cap1.stop();
  assert.ok(
    !cap1.events.includes("omcp://notepad"),
    "prune on empty notepad should NOT emit"
  );

  // Write an entry, wait a moment so its timestamp is older than `now`,
  // then prune with maxAgeDays=0 — cutoff is now, the entry's ts is in
  // the past, so it gets pruned.
  await notepadWrite({ entry: "stale note" });
  await new Promise((r) => setTimeout(r, 10));
  const cap2 = captureEvents();
  await notepadPrune({ maxAgeDays: 0 });
  await cap2.wait();
  cap2.stop();
  assert.ok(
    cap2.events.includes("omcp://notepad"),
    `prune that removed entries should emit; got events: ${JSON.stringify(cap2.events)}`
  );
});

// --- project-memory resources + emission --------------------------------

test("listResources includes both project-memory singletons", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  const r = await listResources();
  const uris = new Set(r.resources.map((x) => x.uri));
  assert.ok(uris.has("omcp://project-memory/notes"));
  assert.ok(uris.has("omcp://project-memory/directives"));
});

test("readResource on omcp://project-memory/notes returns the notes array", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  await projectMemoryAddNote({ text: "first note", tags: ["alpha"] });
  await projectMemoryAddNote({ text: "second note" });

  const r = await readResource({ uri: "omcp://project-memory/notes" });
  const parsed = JSON.parse(r.contents[0].text);
  assert.equal(parsed.notes.length, 2);
  assert.equal(parsed.notes[0].text, "first note");
  assert.deepEqual(parsed.notes[0].tags, ["alpha"]);
});

test("readResource on omcp://project-memory/directives returns the directives array", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  await projectMemoryAddDirective({
    text: "always run tests before commit",
    scope: "permanent",
  });

  const r = await readResource({ uri: "omcp://project-memory/directives" });
  const parsed = JSON.parse(r.contents[0].text);
  assert.equal(parsed.directives.length, 1);
  assert.equal(parsed.directives[0].text, "always run tests before commit");
  assert.equal(parsed.directives[0].scope, "permanent");
});

test("readResource project-memory returns empty arrays when nothing written", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  const notes = JSON.parse(
    (await readResource({ uri: "omcp://project-memory/notes" })).contents[0].text
  );
  const dirs = JSON.parse(
    (await readResource({ uri: "omcp://project-memory/directives" })).contents[0].text
  );
  assert.deepEqual(notes, { notes: [] });
  assert.deepEqual(dirs, { directives: [] });
});

test("projectMemoryAddNote emits omcp://project-memory/notes (and not directives)", async (t) => {
  const dir = freshCwd();
  const cap = captureEvents();
  t.after(() => {
    cap.stop();
    teardown(dir);
  });
  await projectMemoryAddNote({ text: "n" });
  await cap.wait();
  assert.ok(cap.events.includes("omcp://project-memory/notes"));
  assert.ok(!cap.events.includes("omcp://project-memory/directives"));
});

test("projectMemoryAddDirective emits omcp://project-memory/directives (and not notes)", async (t) => {
  const dir = freshCwd();
  const cap = captureEvents();
  t.after(() => {
    cap.stop();
    teardown(dir);
  });
  await projectMemoryAddDirective({ text: "d" });
  await cap.wait();
  assert.ok(cap.events.includes("omcp://project-memory/directives"));
  assert.ok(!cap.events.includes("omcp://project-memory/notes"));
});

test("subscribe accepts all four new singleton URIs", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));
  subscribeResource("omcp://notepad");
  subscribeResource("omcp://project-memory/notes");
  subscribeResource("omcp://project-memory/directives");
  assert.ok(isResourceSubscribed("omcp://notepad"));
  assert.ok(isResourceSubscribed("omcp://project-memory/notes"));
  assert.ok(isResourceSubscribed("omcp://project-memory/directives"));
});

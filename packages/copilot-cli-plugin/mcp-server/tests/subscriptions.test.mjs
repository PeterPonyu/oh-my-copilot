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

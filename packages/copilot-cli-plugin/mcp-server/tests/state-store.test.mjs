import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  stateRead,
  stateWrite,
  stateList,
  stateClear,
  stateGetStatus,
  stateListActive,
} from "../state-store.mjs";

const originalCwd = process.cwd();

function freshCwd() {
  const dir = mkdtempSync(join(tmpdir(), "omcp-state-"));
  process.chdir(dir);
  return dir;
}

function teardown(dir) {
  process.chdir(originalCwd);
  rmSync(dir, { recursive: true, force: true });
}

test("stateClear with mode writes a tombstone with TTL", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await stateClear({ mode: "ralph", session_id: "s1", cancelTtl: 5 });
  const { value, exists } = await stateRead("ralph-state");

  assert.equal(exists, true);
  assert.equal(value.cancelled, true);
  assert.equal(value.mode, "ralph");
  assert.equal(value.session_id, "s1");
  assert.ok(value.cleared_at, "cleared_at present");
  assert.ok(value.expires_at, "expires_at present");

  const expiresMs = Date.parse(value.expires_at);
  const clearedMs = Date.parse(value.cleared_at);
  assert.equal(expiresMs - clearedMs, 5_000, "TTL is exactly cancelTtl seconds");
});

test("stateClear with explicit key writes tombstone to that key", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await stateClear({ key: "custom-key", cancelTtl: 1 });
  const { value, exists } = await stateRead("custom-key");

  assert.equal(exists, true);
  assert.equal(value.cancelled, true);
  assert.equal(value.mode, null);
});

test("stateClear with neither key nor mode rejects", async () => {
  await assert.rejects(
    stateClear({}),
    /requires either 'mode' or 'key'/,
  );
});

test("stateGetStatus reports active when state.active=true", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await stateWrite("ralph-state", {
    active: true,
    session_id: "s1",
    started_at: "2026-01-01T00:00:00Z",
  });
  const status = await stateGetStatus({ mode: "ralph" });

  assert.equal(status.exists, true);
  assert.equal(status.active, true);
  assert.equal(status.session_id, "s1");
  assert.equal(status.started_at, "2026-01-01T00:00:00Z");
  assert.equal(status.cancelled, undefined);
});

test("stateGetStatus reports inactive when state file missing", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const status = await stateGetStatus({ mode: "ralph" });

  assert.equal(status.exists, false);
  assert.equal(status.active, false);
});

test("stateGetStatus reports cancelled with grace period for fresh tombstone", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await stateClear({ mode: "ralph", cancelTtl: 30 });
  const status = await stateGetStatus({ mode: "ralph" });

  assert.equal(status.cancelled, true);
  assert.equal(status.in_grace_period, true);
  assert.equal(status.active, false);
});

test("stateGetStatus reports no grace period after TTL expiry", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await stateWrite("ralph-state", {
    cancelled: true,
    mode: "ralph",
    session_id: null,
    cleared_at: "2020-01-01T00:00:00Z",
    expires_at: "2020-01-01T00:00:30Z",
  });
  const status = await stateGetStatus({ mode: "ralph" });

  assert.equal(status.cancelled, true);
  assert.equal(status.in_grace_period, false);
});

test("stateGetStatus requires mode argument", async () => {
  await assert.rejects(
    stateGetStatus({}),
    /requires 'mode'/,
  );
});

test("stateListActive returns only modes with active=true", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await stateWrite("ralph-state", { active: true, session_id: "s1" });
  await stateWrite("autopilot-state", { active: false });
  await stateWrite("team-state", { active: true, session_id: "s2" });

  const { active } = await stateListActive();
  const modes = active.map((a) => a.mode).sort();

  assert.deepEqual(modes, ["ralph", "team"]);
  const ralph = active.find((a) => a.mode === "ralph");
  assert.equal(ralph.session_id, "s1");
});

test("stateListActive ignores tombstones (cancelled state, no active flag)", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await stateClear({ mode: "ralph" });
  await stateClear({ mode: "team" });

  const { active } = await stateListActive();
  assert.equal(active.length, 0);
});

test("stateListActive ignores keys not ending in -state suffix", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await stateWrite("ralph-state", { active: true });
  await stateWrite("pipeline", { active: true });
  await stateWrite("misc", { active: true });

  const { active } = await stateListActive();
  const modes = active.map((a) => a.mode);
  assert.deepEqual(modes, ["ralph"]);
});

test("stateListActive returns empty list when state dir does not exist", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const { active } = await stateListActive();
  assert.deepEqual(active, []);
});

// #72: corrupt JSON must be distinguished from missing state
test("stateRead returns corrupt:true for JSON parse error, not silent exists:false", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  // Write valid state first, then corrupt it
  await stateWrite("my-key", { active: true });
  const { writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  writeFileSync(join(dir, ".omcp", "state", "my-key.json"), "{bad json", "utf8");

  const result = await stateRead("my-key");
  assert.equal(result.exists, false, "exists should be false for corrupt file");
  assert.equal(result.corrupt, true, "corrupt flag must be set to distinguish from missing");
  assert.ok(typeof result.error === "string" && result.error.length > 0, "error message must be present");
});

test("stateRead returns exists:false (no corrupt flag) for genuinely missing key", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const result = await stateRead("nonexistent");
  assert.equal(result.exists, false);
  assert.equal(result.corrupt, undefined, "no corrupt flag on missing file");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { listResources, readResource } from "../resources.mjs";
import { wikiAdd } from "../wiki-store.mjs";
import { traceWrite } from "../trace-store.mjs";
import { rulesContextForFile } from "../rules-store.mjs";

const originalCwd = process.cwd();

function freshCwd() {
  const dir = mkdtempSync(join(tmpdir(), "omcp-res-"));
  process.chdir(dir);
  return dir;
}

function teardown(dir) {
  process.chdir(originalCwd);
  rmSync(dir, { recursive: true, force: true });
}

test("listResources returns only the always-on singletons when nothing else exists", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const r = await listResources();
  // Always-on singletons: pipeline state, notepad, project-memory notes,
  // project-memory directives, and rules policy resources. Wiki/traces/state
  // are empty in a fresh workspace.
  const uris = r.resources.map((x) => x.uri).sort();
  assert.deepEqual(uris, [
    "omcp://notepad",
    "omcp://pipeline/state",
    "omcp://project-memory/directives",
    "omcp://project-memory/notes",
    "omcp://rules/pending",
    "omcp://rules/policy-report",
  ]);
});

test("listResources enumerates wiki slugs as omcp://wiki/<slug>", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await wikiAdd({ title: "Auth Flow", body: "OAuth notes", tags: ["security"] });
  await wikiAdd({ title: "Deploy Pipeline", body: "ci/cd notes" });

  const r = await listResources();
  const wikiUris = r.resources
    .map((x) => x.uri)
    .filter((u) => u.startsWith("omcp://wiki/"))
    .sort();
  assert.deepEqual(wikiUris, ["omcp://wiki/auth-flow", "omcp://wiki/deploy-pipeline"]);

  const auth = r.resources.find((x) => x.uri === "omcp://wiki/auth-flow");
  assert.equal(auth.mimeType, "text/markdown");
  assert.equal(auth.name, "Auth Flow");
  assert.match(auth.description, /security/);
});

test("listResources enumerates trace sessions as timeline + summary URIs", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await traceWrite({ session_id: "sess-1", kind: "hypothesis", lane: "L1", payload: { note: "a" } });
  await traceWrite({ session_id: "sess-2", kind: "hypothesis", lane: "L2", payload: { note: "b" } });

  const r = await listResources();
  const traceUris = r.resources
    .map((x) => x.uri)
    .filter((u) => u.startsWith("omcp://traces/"))
    .sort();
  assert.deepEqual(traceUris, [
    "omcp://traces/sess-1/summary",
    "omcp://traces/sess-1/timeline",
    "omcp://traces/sess-2/summary",
    "omcp://traces/sess-2/timeline",
  ]);

  const timeline = r.resources.find((x) => x.uri === "omcp://traces/sess-1/timeline");
  assert.equal(timeline.mimeType, "application/json");
});

test("readResource on omcp://wiki/<slug> returns markdown body", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await wikiAdd({ title: "Notes", body: "# Hello\n\nbody text" });
  const r = await readResource({ uri: "omcp://wiki/notes" });
  assert.equal(r.contents.length, 1);
  assert.equal(r.contents[0].uri, "omcp://wiki/notes");
  assert.equal(r.contents[0].mimeType, "text/markdown");
  assert.equal(r.contents[0].text, "# Hello\n\nbody text");
});

test("readResource on omcp://wiki/<missing> throws", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await assert.rejects(
    () => readResource({ uri: "omcp://wiki/no-such" }),
    /not found/
  );
});

test("readResource on omcp://traces/<sid>/timeline returns JSON events", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await traceWrite({ session_id: "t1", kind: "hypothesis", lane: "L1", payload: { p: 1 } });
  await traceWrite({ session_id: "t1", kind: "evidence", lane: "L1", payload: { p: 2 } });

  const r = await readResource({ uri: "omcp://traces/t1/timeline" });
  assert.equal(r.contents[0].mimeType, "application/json");
  const parsed = JSON.parse(r.contents[0].text);
  assert.ok(Array.isArray(parsed.events));
  assert.equal(parsed.events.length, 2);
});

test("readResource on omcp://traces/<sid>/summary returns aggregated JSON", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await traceWrite({ session_id: "t2", kind: "hypothesis", lane: "L1", payload: {} });
  await traceWrite({ session_id: "t2", kind: "evidence", lane: "L1", payload: {} });
  await traceWrite({ session_id: "t2", kind: "evidence", lane: "L1", payload: {} });

  const r = await readResource({ uri: "omcp://traces/t2/summary" });
  const parsed = JSON.parse(r.contents[0].text);
  assert.equal(parsed.session_id, "t2");
  assert.equal(parsed.total, 3);
  assert.equal(parsed.byKind.evidence, 2);
  assert.equal(parsed.byKind.hypothesis, 1);
});

test("readResource on omcp://traces/<sid> defaults to timeline view", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await traceWrite({ session_id: "tD", kind: "hypothesis", lane: "L", payload: {} });

  const r = await readResource({ uri: "omcp://traces/tD" });
  const parsed = JSON.parse(r.contents[0].text);
  assert.ok(Array.isArray(parsed.events));
});

test("readResource returns pending rules and policy report singletons", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await import("node:fs/promises").then(async ({ mkdir, writeFile }) => {
    await writeFile("package.json", "{}\n", "utf8");
    await mkdir(".omcp/rules", { recursive: true });
    await writeFile("example.js", "console.log('x')\n", "utf8");
    await writeFile(".omcp/rules/always.md", "---\nalwaysApply: true\n---\nUse the rule.\n", "utf8");
  });
  await rulesContextForFile({ path: "example.js", tool: "read", session_id: "res" });

  const pending = await readResource({ uri: "omcp://rules/pending" });
  const pendingJson = JSON.parse(pending.contents[0].text);
  assert.equal(pendingJson.entries.length, 1);
  assert.equal(pendingJson.entries[0].project_root, undefined);
  assert.equal(pendingJson.entries[0].rules[0].content, undefined);
  assert.equal(pendingJson.entries[0].rules[0].content_redacted, true);
  assert.equal(pending.contents[0].mimeType, "application/json");

  const report = await readResource({ uri: "omcp://rules/policy-report" });
  const reportJson = JSON.parse(report.contents[0].text);
  assert.match(reportJson.policy.rules, /Long-lived constraints/);
});

test("readResource rejects malformed uri", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await assert.rejects(
    () => readResource({ uri: "not-a-resource" }),
    /unsupported resource uri/
  );
  await assert.rejects(
    () => readResource({ uri: "omcp://other/foo" }),
    /unsupported resource uri/
  );
  await assert.rejects(
    () => readResource({}),
    /non-empty 'uri'/
  );
});

test("readResource rejects unsupported trace view", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await traceWrite({ session_id: "tX", kind: "hypothesis", lane: "L", payload: {} });
  await assert.rejects(
    () => readResource({ uri: "omcp://traces/tX/raw" }),
    /unsupported trace view/
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";

import { listResourceTemplates } from "../resources.mjs";

test("listResourceTemplates returns the four parametric families", () => {
  const r = listResourceTemplates();
  const templates = r.resourceTemplates.map((t) => t.uriTemplate).sort();
  assert.deepEqual(templates, [
    "omcp://state/{key}",
    "omcp://traces/{session_id}/summary",
    "omcp://traces/{session_id}/timeline",
    "omcp://wiki/{slug}",
  ]);
});

test("each template has a name, description, and mimeType", () => {
  const r = listResourceTemplates();
  for (const t of r.resourceTemplates) {
    assert.ok(typeof t.name === "string" && t.name.length > 0, `name missing on ${t.uriTemplate}`);
    assert.ok(typeof t.description === "string" && t.description.length > 0, `description missing on ${t.uriTemplate}`);
    assert.ok(typeof t.mimeType === "string" && t.mimeType.length > 0, `mimeType missing on ${t.uriTemplate}`);
  }
});

test("wiki template uses markdown mime", () => {
  const r = listResourceTemplates();
  const wiki = r.resourceTemplates.find((t) => t.uriTemplate === "omcp://wiki/{slug}");
  assert.equal(wiki.mimeType, "text/markdown");
});

test("state and traces templates use json mime", () => {
  const r = listResourceTemplates();
  const wantJson = [
    "omcp://state/{key}",
    "omcp://traces/{session_id}/timeline",
    "omcp://traces/{session_id}/summary",
  ];
  for (const uri of wantJson) {
    const tpl = r.resourceTemplates.find((t) => t.uriTemplate === uri);
    assert.equal(tpl.mimeType, "application/json", `${uri} should be json`);
  }
});

test("descriptions reference how to discover the parameter values", () => {
  const r = listResourceTemplates();
  const wiki = r.resourceTemplates.find((t) => t.uriTemplate === "omcp://wiki/{slug}");
  const state = r.resourceTemplates.find((t) => t.uriTemplate === "omcp://state/{key}");
  const trace = r.resourceTemplates.find(
    (t) => t.uriTemplate === "omcp://traces/{session_id}/timeline"
  );
  assert.match(wiki.description, /wiki_list|wiki_query/);
  assert.match(state.description, /state_list/);
  assert.match(trace.description, /trace_list_sessions/);
});

test("templates do NOT include the four always-on singletons", () => {
  const r = listResourceTemplates();
  const uris = r.resourceTemplates.map((t) => t.uriTemplate);
  for (const singleton of [
    "omcp://pipeline/state",
    "omcp://notepad",
    "omcp://project-memory/notes",
    "omcp://project-memory/directives",
  ]) {
    assert.ok(!uris.includes(singleton), `singleton ${singleton} should not be a template`);
  }
});

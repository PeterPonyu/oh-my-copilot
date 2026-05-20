import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const SERVER_PATH = resolve(dirname(__filename), "..", "server.mjs");

class StdioClient {
  constructor(cwd) {
    this.proc = spawn("node", [SERVER_PATH], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.buffer = "";
    this.pending = new Map();
    this.notifications = [];
    this.notificationWaiters = [];
    this.proc.stdout.on("data", (chunk) => this._onData(chunk.toString()));
    this.stderr = "";
    this.proc.stderr.on("data", (d) => (this.stderr += d.toString()));
    this.nextId = 1;
  }

  _onData(chunk) {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim().startsWith("{")) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if (msg.id != null) {
        const resolver = this.pending.get(msg.id);
        if (resolver) {
          this.pending.delete(msg.id);
          resolver(msg);
        }
      } else if (msg.method) {
        // server-initiated notification (no id, has method)
        this.notifications.push(msg);
        const waiters = this.notificationWaiters;
        this.notificationWaiters = [];
        for (const w of waiters) w(msg);
      }
    }
  }

  async send(method, params = {}) {
    const id = this.nextId++;
    const promise = new Promise((resolve) => this.pending.set(id, resolve));
    this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout id=${id} method=${method}`)), 5000)),
    ]);
  }

  async callTool(name, args = {}) {
    return this.send("tools/call", { name, arguments: args });
  }

  // Wait until a notification matching predicate arrives, or timeout.
  // Returns the matching message, or throws on timeout.
  async awaitNotification(predicate, timeoutMs = 3000) {
    // Check already-arrived first
    const existing = this.notifications.find(predicate);
    if (existing) return existing;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.notificationWaiters.indexOf(handler);
        if (idx >= 0) this.notificationWaiters.splice(idx, 1);
        reject(new Error(`timeout waiting for notification`));
      }, timeoutMs);
      const handler = (msg) => {
        if (predicate(msg)) {
          clearTimeout(timer);
          resolve(msg);
        } else {
          // not the one we want — re-register
          this.notificationWaiters.push(handler);
        }
      };
      this.notificationWaiters.push(handler);
    });
  }

  close() {
    this.proc.stdin.end();
    return new Promise((resolve) => this.proc.on("close", resolve));
  }
}

function unwrap(resp) {
  const text = resp?.result?.content?.[0]?.text;
  if (text == null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isError(resp) {
  return resp?.result?.isError === true;
}

test("integration: tools/list returns all 35 registered tools with valid schemas", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const resp = await client.send("tools/list");
  const tools = resp.result.tools;
  assert.equal(tools.length, 35, `expected 35 tools, got ${tools.length}`);

  for (const tool of tools) {
    assert.ok(tool.name, "tool must have a name");
    assert.ok(tool.description, `${tool.name} must have a description`);
    assert.equal(tool.inputSchema?.type, "object", `${tool.name} schema must be type=object`);
  }

  const names = tools.map((t) => t.name);
  const required = [
    "state_read", "state_write", "state_list", "state_clear", "state_get_status", "state_list_active",
    "notepad_read", "notepad_write", "notepad_write_priority", "notepad_write_working", "notepad_prune", "notepad_stats",
    "project_memory_read", "project_memory_write", "project_memory_add_note", "project_memory_add_directive",
    "trace_write", "trace_summary", "trace_timeline", "trace_list_sessions",
    "wiki_add", "wiki_read", "wiki_list", "wiki_query", "wiki_delete", "wiki_ingest", "wiki_lint",
    "shared_memory_write", "shared_memory_read", "shared_memory_list", "shared_memory_delete", "shared_memory_cleanup",
    "plan_list", "pipeline_record_transition", "pipeline_state",
  ];
  for (const name of required) {
    assert.ok(names.includes(name), `missing required tool: ${name}`);
  }
});

test("integration: shared memory round-trip", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  await client.callTool("shared_memory_write", { channel: "alpha", kind: "task_assigned", from: "leader", to: "worker-1", payload: { task: "review" } });
  await client.callTool("shared_memory_write", { channel: "alpha", kind: "finding", from: "worker-1", payload: { line: 42 } });
  await client.callTool("shared_memory_write", { channel: "alpha", kind: "task_done", from: "worker-1" });

  const all = unwrap(await client.callTool("shared_memory_read", { channel: "alpha" }));
  assert.equal(all.events.length, 3);

  const findings = unwrap(await client.callTool("shared_memory_read", { channel: "alpha", kind: "finding" }));
  assert.equal(findings.events.length, 1);
  assert.equal(findings.events[0].payload.line, 42);

  const list = unwrap(await client.callTool("shared_memory_list", {}));
  assert.equal(list.channels.length, 1);
  assert.equal(list.channels[0].channel, "alpha");
  assert.equal(list.channels[0].last_kind, "task_done");

  const cleanup = unwrap(await client.callTool("shared_memory_cleanup", { maxAgeDays: 999 }));
  assert.deepEqual(cleanup.removed, []);

  const del = unwrap(await client.callTool("shared_memory_delete", { channel: "alpha" }));
  assert.equal(del.ok, true);

  const post = unwrap(await client.callTool("shared_memory_list", {}));
  assert.equal(post.channels.length, 0);
});

test("integration: state round-trip via real MCP transport", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const w = await client.callTool("state_write", { key: "ralph-state", value: { active: true, session_id: "s1" } });
  assert.ok(!isError(w), "state_write must succeed");
  assert.equal(unwrap(w).ok, true);

  const r = await client.callTool("state_read", { key: "ralph-state" });
  assert.equal(unwrap(r).value.session_id, "s1");

  const status = await client.callTool("state_get_status", { mode: "ralph" });
  assert.equal(unwrap(status).active, true);

  const active = await client.callTool("state_list_active", {});
  assert.equal(unwrap(active).active.length, 1);

  const cleared = await client.callTool("state_clear", { mode: "ralph", session_id: "s1" });
  assert.equal(unwrap(cleared).ok, true);

  const post = await client.callTool("state_get_status", { mode: "ralph" });
  assert.equal(unwrap(post).cancelled, true);
});

test("integration: state_write mode-form translates to <mode>-state.json", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  // Write via mode-form (OMC-style pseudocode used in ported skills)
  const w = await client.callTool("state_write", {
    mode: "team",
    active: true,
    current_phase: "team-plan",
    state: { workers: 3, lead: "agent-1" },
  });
  assert.ok(!isError(w), "mode-form state_write must succeed");
  const wResult = unwrap(w);
  assert.equal(wResult.ok, true);
  assert.match(wResult.path, /team-state\.json$/);

  // Read back via mode-form
  const rByMode = await client.callTool("state_read", { mode: "team" });
  const rmValue = unwrap(rByMode).value;
  assert.equal(rmValue.active, true);
  assert.equal(rmValue.current_phase, "team-plan");
  assert.deepEqual(rmValue.state, { workers: 3, lead: "agent-1" });

  // mode field MUST be stripped from value (it's the key, not data)
  assert.equal(rmValue.mode, undefined, "mode field stripped from stored value");

  // Read back via key-form — should resolve to same file
  const rByKey = await client.callTool("state_read", { key: "team-state" });
  assert.deepEqual(unwrap(rByKey).value, rmValue, "mode-form and key-form read same data");
});

test("integration: state mode-form rejects missing mode and key", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const w = await client.callTool("state_write", {});
  assert.equal(isError(w), true);
  assert.match(w.result.content[0].text, /requires either 'key' or 'mode'/);

  const r = await client.callTool("state_read", {});
  assert.equal(isError(r), true);
  assert.match(r.result.content[0].text, /requires either 'key' or 'mode'/);
});

test("integration: state_write key-form unchanged by mode-form addition", async (t) => {
  // Regression test — original {key, value} form must still work as before
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const w = await client.callTool("state_write", {
    key: "custom-key",
    value: { foo: "bar" },
  });
  assert.equal(unwrap(w).ok, true);
  assert.match(unwrap(w).path, /custom-key\.json$/);

  const r = await client.callTool("state_read", { key: "custom-key" });
  assert.deepEqual(unwrap(r).value, { foo: "bar" });
});

test("integration: notepad lanes round-trip", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  await client.callTool("notepad_write", { entry: "manual" });
  await client.callTool("notepad_write_priority", { entry: "important" });
  await client.callTool("notepad_write_working", { entry: "wip" });

  const stats = unwrap(await client.callTool("notepad_stats", {}));
  assert.equal(stats.total, 3);
  assert.equal(stats.byLane.priority, 1);
  assert.equal(stats.byLane.working, 1);
  assert.equal(stats.byLane.manual, 1);

  const pruned = unwrap(await client.callTool("notepad_prune", { maxAgeDays: 999 }));
  assert.equal(pruned.kept, 3);
  assert.equal(pruned.pruned, 0);
});

test("integration: project memory round-trip", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const n = unwrap(await client.callTool("project_memory_add_note", { text: "n1", tags: ["a"] }));
  assert.equal(n.note.id, "n_1");

  const d = unwrap(await client.callTool("project_memory_add_directive", { text: "always test" }));
  assert.equal(d.directive.id, "d_2");

  await client.callTool("project_memory_write", { facts: { lang: "ts", db: "pg" } });
  const r = unwrap(await client.callTool("project_memory_read", {}));
  assert.equal(r.facts.lang, "ts");
  assert.equal(r.facts.db, "pg");
  assert.equal(r.notes.length, 1);
  assert.equal(r.directives.length, 1);
});

test("integration: trace round-trip", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  await client.callTool("trace_write", { kind: "note", text: "first" });
  await client.callTool("trace_write", { kind: "tool_failure", tool: "Bash", exit_code: 127 });
  await client.callTool("trace_write", { kind: "outcome", outcome: "fixed" });

  const summary = unwrap(await client.callTool("trace_summary", {}));
  assert.equal(summary.total, 3);
  assert.equal(summary.byKind.tool_failure, 1);
  assert.equal(summary.last_outcome.outcome, "fixed");

  const timeline = unwrap(await client.callTool("trace_timeline", { kind: "tool_failure" }));
  assert.equal(timeline.events.length, 1);
  assert.equal(timeline.events[0].tool, "Bash");

  const sessions = unwrap(await client.callTool("trace_list_sessions", {}));
  assert.deepEqual(sessions.sessions, ["default"]);
});

test("integration: wiki round-trip", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const added = unwrap(await client.callTool("wiki_add", { title: "Auth Setup", body: "uses JWT", tags: ["security"] }));
  assert.equal(added.slug, "auth-setup");

  const read = unwrap(await client.callTool("wiki_read", { slug: "auth-setup" }));
  assert.equal(read.body, "uses JWT");
  assert.deepEqual(read.tags, ["security"]);

  const list = unwrap(await client.callTool("wiki_list", { tag: "security" }));
  assert.equal(list.entries.length, 1);

  const query = unwrap(await client.callTool("wiki_query", { q: "JWT" }));
  assert.equal(query.results.length, 1);
  assert.ok(query.results[0].score >= 1);

  const lint = unwrap(await client.callTool("wiki_lint", {}));
  assert.deepEqual(lint.orphans, []);
  assert.deepEqual(lint.untracked, []);

  const deleted = unwrap(await client.callTool("wiki_delete", { slug: "auth-setup" }));
  assert.equal(deleted.ok, true);
  const post = unwrap(await client.callTool("wiki_list", {}));
  assert.equal(post.entries.length, 0);
});

test("integration: unknown tool returns isError envelope", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const resp = await client.callTool("no_such_tool", {});
  assert.equal(isError(resp), true);
  assert.match(resp.result.content[0].text, /Unknown tool/);
});

test("integration: server tolerates mcp__omcp__ prefix on tool names (Wave-H)", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  // Prefixed form (what skill prose uses)
  const prefixed = await client.callTool("mcp__omcp__wiki_add", {
    title: "Prefix Test",
    body: "tolerance",
  });
  assert.ok(!isError(prefixed), "prefixed form must succeed");
  assert.equal(unwrap(prefixed).slug, "prefix-test");

  // Bare form (what server registers, what validation scripts use)
  const bare = await client.callTool("wiki_read", { slug: "prefix-test" });
  assert.equal(unwrap(bare).body, "tolerance");

  // Unknown tool with valid prefix is still rejected (we don't accept any prefix)
  const unknownPrefixed = await client.callTool("mcp__omcp__no_such_tool", {});
  assert.equal(isError(unknownPrefixed), true);
  assert.match(unknownPrefixed.result.content[0].text, /Unknown tool/);
});

test("integration: invalid arguments produce isError envelope (validation)", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const resp = await client.callTool("trace_write", { kind: "bogus" });
  assert.equal(isError(resp), true);
  assert.match(resp.result.content[0].text, /kind must be one of/);
});

test("integration: bundled dist/server.mjs is functional (Wave-K-b)", async (t) => {
  // Production .mcp.json points at dist/server.mjs (the esbuild bundle).
  // This test exercises the BUNDLED artifact, not the source — catches any
  // bundling regression that would silently break end-user installs.
  const BUNDLE_PATH = resolve(dirname(__filename), "..", "dist", "server.mjs");
  const cwd = mkdtempSync(join(tmpdir(), "omcp-bundle-"));

  // Custom client targeting the bundle
  class BundleClient extends StdioClient {
    constructor(cwd) {
      super(cwd);
      // Override the proc with one targeting the bundle
      this.proc.kill();
      this.pending.clear();
      const p = spawn("node", [BUNDLE_PATH], { cwd, stdio: ["pipe", "pipe", "pipe"] });
      this.proc = p;
      this.buffer = "";
      this.pending = new Map();
      this.nextId = 1;
      p.stdout.on("data", (chunk) => this._onData(chunk.toString()));
      p.stderr.on("data", (d) => (this.stderr += d.toString()));
    }
  }

  const client = new BundleClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  // tools/list returns 35 tools
  const list = await client.send("tools/list");
  assert.equal(list.result.tools.length, 35, "bundle exposes all 35 tools");

  // Round-trip a write+read to verify dispatch + store I/O work in the bundle
  const w = await client.callTool("state_write", { key: "bundle-test", value: { ok: 1 } });
  assert.equal(unwrap(w).ok, true);
  const r = await client.callTool("state_read", { key: "bundle-test" });
  assert.deepEqual(unwrap(r).value, { ok: 1 });

  // Wave-H prefix tolerance must work in the bundle too
  const prefixed = await client.callTool("mcp__omcp__notepad_stats", {});
  assert.ok(!isError(prefixed), "prefix tolerance preserved in bundle");
  assert.ok("byLane" in unwrap(prefixed));
});

// ===========================================================================
// Resources / Templates / Prompts / Subscriptions — wire-level E2E
// ===========================================================================
//
// The block above proves Tools work end-to-end. Below proves the three
// non-Tool primitives + subscription delivery work over the actual MCP
// JSON-RPC transport, not just at the handler function layer.

test("integration: resources/list returns the four always-on singletons in a fresh workspace", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const resp = await client.send("resources/list");
  const uris = resp.result.resources.map((r) => r.uri).sort();
  assert.deepEqual(uris, [
    "omcp://notepad",
    "omcp://pipeline/state",
    "omcp://project-memory/directives",
    "omcp://project-memory/notes",
  ]);
});

test("integration: resources/list includes a wiki entry after wiki_add", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  await client.callTool("wiki_add", { title: "Auth Notes", body: "JWT details", tags: ["sec"] });

  const resp = await client.send("resources/list");
  const wiki = resp.result.resources.find((r) => r.uri === "omcp://wiki/auth-notes");
  assert.ok(wiki, "expected omcp://wiki/auth-notes in resources/list");
  assert.equal(wiki.mimeType, "text/markdown");
  assert.equal(wiki.name, "Auth Notes");
});

test("integration: resources/templates/list returns the four parametric URI templates", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const resp = await client.send("resources/templates/list");
  const templates = resp.result.resourceTemplates.map((t) => t.uriTemplate).sort();
  assert.deepEqual(templates, [
    "omcp://state/{key}",
    "omcp://traces/{session_id}/summary",
    "omcp://traces/{session_id}/timeline",
    "omcp://wiki/{slug}",
  ]);
});

test("integration: resources/read for omcp://wiki/<slug> returns markdown body", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  await client.callTool("wiki_add", { title: "Topic", body: "# Hello\n\nbody text" });

  const resp = await client.send("resources/read", { uri: "omcp://wiki/topic" });
  const contents = resp.result.contents;
  assert.equal(contents.length, 1);
  assert.equal(contents[0].uri, "omcp://wiki/topic");
  assert.equal(contents[0].mimeType, "text/markdown");
  assert.equal(contents[0].text, "# Hello\n\nbody text");
});

test("integration: resources/read for omcp://state/<key> returns the stored JSON", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  await client.callTool("state_write", { key: "team-state", value: { phase: "exec", n: 3 } });

  const resp = await client.send("resources/read", { uri: "omcp://state/team-state" });
  const contents = resp.result.contents;
  assert.equal(contents[0].mimeType, "application/json");
  const parsed = JSON.parse(contents[0].text);
  assert.equal(parsed.phase, "exec");
  assert.equal(parsed.n, 3);
});

test("integration: resources/read for omcp://pipeline/state returns the pipeline JSON", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  await client.callTool("pipeline_record_transition", {
    from: null,
    to: "spec",
    artifact: "/tmp/spec.md",
  });

  const resp = await client.send("resources/read", { uri: "omcp://pipeline/state" });
  const parsed = JSON.parse(resp.result.contents[0].text);
  assert.equal(parsed.transitions.length, 1);
  assert.equal(parsed.transitions[0].to, "spec");
});

test("integration: resources/read on unsupported URI returns an error", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const resp = await client.send("resources/read", { uri: "omcp://garbage/x" });
  assert.ok(resp.error || resp.result?.isError, `expected error response, got: ${JSON.stringify(resp)}`);
});

test("integration: prompts/list returns ≥30 prompts including known skills", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const resp = await client.send("prompts/list");
  const prompts = resp.result.prompts;
  assert.ok(prompts.length >= 30, `expected many prompts, got ${prompts.length}`);
  const names = new Set(prompts.map((p) => p.name));
  for (const expected of ["autopilot", "ralph", "team", "wiki", "trace"]) {
    assert.ok(names.has(expected), `expected ${expected} in prompts/list`);
  }
  // Each prompt declares a single optional `args` argument
  for (const p of prompts) {
    assert.equal(p.arguments.length, 1);
    assert.equal(p.arguments[0].name, "args");
    assert.equal(p.arguments[0].required, false);
  }
});

test("integration: prompts/get returns the skill body as a user message", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const resp = await client.send("prompts/get", { name: "autopilot" });
  const msgs = resp.result.messages;
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].role, "user");
  assert.equal(msgs[0].content.type, "text");
  // The actual autopilot SKILL.md mentions Autopilot in its body
  assert.match(msgs[0].content.text, /[Aa]utopilot/);
});

test("integration: prompts/get with args appends them to the prompt body", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const resp = await client.send("prompts/get", {
    name: "ralph",
    arguments: { args: "build a TODO app" },
  });
  const text = resp.result.messages[0].content.text;
  assert.match(text, /## Arguments provided by caller/);
  assert.match(text, /build a TODO app/);
});

test("integration: resources/subscribe + state_write tool call → notifications/resources/updated delivered", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const subUri = "omcp://state/team-state";

  // Subscribe via real MCP wire
  const sub = await client.send("resources/subscribe", { uri: subUri });
  assert.ok(sub.result !== undefined, `subscribe should succeed, got: ${JSON.stringify(sub)}`);

  // Trigger a write via a real tool call (NOT a direct store import)
  await client.callTool("state_write", { key: "team-state", value: { phase: "plan" } });

  // The notification should arrive over stdio. Wait up to 3 seconds.
  const notif = await client.awaitNotification(
    (msg) =>
      msg.method === "notifications/resources/updated" && msg.params?.uri === subUri
  );
  assert.equal(notif.method, "notifications/resources/updated");
  assert.equal(notif.params.uri, subUri);
});

test("integration: unsubscribe stops notifications for that URI", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const subUri = "omcp://state/ralph-state";
  await client.send("resources/subscribe", { uri: subUri });
  await client.send("resources/unsubscribe", { uri: subUri });

  // Track notifications observed during the post-unsubscribe write window
  const before = client.notifications.filter(
    (m) => m.method === "notifications/resources/updated" && m.params?.uri === subUri
  ).length;

  await client.callTool("state_write", { key: "ralph-state", value: { i: 1 } });
  // Give the server a window to (incorrectly) emit a notification
  await new Promise((r) => setTimeout(r, 200));

  const after = client.notifications.filter(
    (m) => m.method === "notifications/resources/updated" && m.params?.uri === subUri
  ).length;
  assert.equal(after, before, `expected no new notifications after unsubscribe, before=${before} after=${after}`);
});

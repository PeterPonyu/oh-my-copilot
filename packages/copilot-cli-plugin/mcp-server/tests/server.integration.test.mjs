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
      const resolver = this.pending.get(msg.id);
      if (resolver) {
        this.pending.delete(msg.id);
        resolver(msg);
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

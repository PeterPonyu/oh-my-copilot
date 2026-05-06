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

test("integration: tools/list returns all 30 registered tools with valid schemas", async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "omcp-int-"));
  const client = new StdioClient(cwd);
  t.after(async () => {
    await client.close();
    rmSync(cwd, { recursive: true, force: true });
  });

  const resp = await client.send("tools/list");
  const tools = resp.result.tools;
  assert.equal(tools.length, 30, `expected 30 tools, got ${tools.length}`);

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
    "plan_list", "pipeline_record_transition", "pipeline_state",
  ];
  for (const name of required) {
    assert.ok(names.includes(name), `missing required tool: ${name}`);
  }
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

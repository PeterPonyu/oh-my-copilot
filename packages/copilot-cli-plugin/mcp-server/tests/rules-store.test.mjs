import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, symlinkSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  rulesContextForFile,
  rulesPendingRead,
  rulesPendingClear,
  rulesPolicyReport,
  redactSecrets,
  _clearRulesStateForTests,
} from "../rules-store.mjs";

const originalCwd = process.cwd();

function freshCwd() {
  const dir = mkdtempSync(join(tmpdir(), "omcp-rules-"));
  process.chdir(dir);
  writeFileSync(join(dir, "package.json"), "{}\n", "utf8");
  return dir;
}

function teardown(dir) {
  process.chdir(originalCwd);
  rmSync(dir, { recursive: true, force: true });
}

test("rulesContextForFile matches glob-scoped project rules and dedupes per session", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  mkdirSync(join(dir, "src"), { recursive: true });
  mkdirSync(join(dir, ".omcp", "rules"), { recursive: true });
  writeFileSync(join(dir, "src", "example.test.mjs"), "test('x', () => {})\n", "utf8");
  writeFileSync(join(dir, "root.test.mjs"), "test('root', () => {})\n", "utf8");
  writeFileSync(
    join(dir, ".omcp", "rules", "testing.md"),
    [
      "---",
      "description: Test policy",
      "globs:",
      '  - "**/*.test.mjs"',
      "---",
      "Run the nearest focused test before claiming the change is done.",
      "",
    ].join("\n"),
    "utf8",
  );

  const first = await rulesContextForFile({
    path: "src/example.test.mjs",
    tool: "read",
    session_id: "session-1",
  });
  assert.equal(first.ok, true);
  assert.equal(first.matched, 1);
  assert.equal(first.entry.rules[0].relativePath, ".omcp/rules/testing.md");
  assert.match(first.entry.rules[0].content, /nearest focused test/);

  const second = await rulesContextForFile({
    path: "src/example.test.mjs",
    tool: "read",
    session_id: "session-1",
  });
  assert.equal(second.matched, 0, "same session should dedupe already injected rule");

  const pending = await rulesPendingRead({ session_id: "session-1" });
  assert.equal(pending.entries.length, 1);
  assert.equal(pending.entries[0].rules.length, 1);

  const rootFile = await rulesContextForFile({
    path: "root.test.mjs",
    tool: "read",
    session_id: "session-root",
  });
  assert.equal(rootFile.matched, 1, "**/*.test.mjs should match repo-root test files");
  assert.equal(rootFile.entry.rules[0].relativePath, ".omcp/rules/testing.md");

  const cleared = await rulesPendingClear({ session_id: "session-1" });
  assert.equal(cleared.removed, 1);
  assert.deepEqual((await rulesPendingRead({ session_id: "session-1" })).entries, []);
});

test("rulesContextForFile treats GitHub applyTo frontmatter as file globs", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  mkdirSync(join(dir, "packages", "cli"), { recursive: true });
  mkdirSync(join(dir, ".github", "instructions"), { recursive: true });
  writeFileSync(join(dir, "packages", "cli", "build.sh"), "echo build\n", "utf8");
  writeFileSync(
    join(dir, ".github", "instructions", "scripts.instructions.md"),
    [
      "---",
      'applyTo: "scripts/**/*.sh,packages/**/*.sh"',
      "---",
      "Shell scripts must use set -euo pipefail.",
      "",
    ].join("\n"),
    "utf8",
  );

  const result = await rulesContextForFile({
    path: "packages/cli/build.sh",
    tool: "read",
    session_id: "apply-to",
  });
  assert.equal(result.matched, 1);
  assert.equal(result.entry.rules[0].source, "github-instructions");
  assert.equal(result.entry.rules[0].matchReason, "glob: packages/**/*.sh");
});

test("rulesContextForFile uses the workspace root for nested package files", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  mkdirSync(join(dir, "packages", "plugin", "mcp-server"), { recursive: true });
  mkdirSync(join(dir, ".github"), { recursive: true });
  writeFileSync(join(dir, "packages", "plugin", "package.json"), "{}\n", "utf8");
  writeFileSync(join(dir, "packages", "plugin", "mcp-server", "server.mjs"), "export {}\n", "utf8");
  writeFileSync(join(dir, ".github", "copilot-instructions.md"), "Use repo-root instructions.\n", "utf8");

  const result = await rulesContextForFile({
    path: "packages/plugin/mcp-server/server.mjs",
    tool: "read",
    session_id: "nested-package",
  });
  assert.equal(result.matched, 1);
  assert.equal(result.entry.project_root, dir);
  assert.equal(result.entry.rules[0].source, "github-copilot-instructions");
});

test("rulesContextForFile supports alwaysApply GitHub instructions without writing pending state in preview mode", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  mkdirSync(join(dir, "src"), { recursive: true });
  mkdirSync(join(dir, ".github", "instructions"), { recursive: true });
  writeFileSync(join(dir, "src", "example.js"), "console.log('x')\n", "utf8");
  writeFileSync(
    join(dir, ".github", "instructions", "scripts.instructions.md"),
    [
      "---",
      "description: Script policy",
      "alwaysApply: true",
      "---",
      "Shell scripts must use set -euo pipefail.",
      "",
    ].join("\n"),
    "utf8",
  );

  const preview = await rulesContextForFile({
    path: "src/example.js",
    tool: "read",
    session_id: "session-2",
    markPending: false,
  });
  assert.equal(preview.matched, 1);
  assert.equal(preview.entry.rules[0].source, "github-instructions");

  const pending = await rulesPendingRead({ session_id: "session-2" });
  assert.deepEqual(pending.entries, []);
});

test("rulesPolicyReport documents storage ownership and discovered source counts", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  mkdirSync(join(dir, ".github"), { recursive: true });
  mkdirSync(join(dir, ".github", "instructions"), { recursive: true });
  mkdirSync(join(dir, ".omcp", "rules"), { recursive: true });
  writeFileSync(join(dir, ".github", "copilot-instructions.md"), "Always be concise.\n", "utf8");
  writeFileSync(join(dir, ".github", "instructions", "docs.instructions.md"), "---\napplyTo: \"README.md\"\n---\nDocs rule.\n", "utf8");
  writeFileSync(join(dir, ".omcp", "rules", "local.md"), "---\nalwaysApply: true\n---\nLocal rule.\n", "utf8");

  const report = await rulesPolicyReport();
  assert.equal(report.version, 1);
  assert.equal(report.discovered_counts["github-copilot-instructions"], 1);
  assert.equal(report.discovered_counts["github-instructions"], 1);
  assert.equal(report.discovered_counts["omcp-rules"], 1);
  assert.match(report.policy.rules, /Long-lived constraints/);
  assert.match(report.policy.projectMemory, /\.omcp\/project-memory\.json/);
});

test("rulesContextForFile rejects paths outside the current workspace", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const external = mkdtempSync(join(tmpdir(), "omcp-rules-outside-"));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  const outside = join(external, "outside.js");
  writeFileSync(outside, "console.log('outside')\n", "utf8");

  await assert.rejects(
    () => rulesContextForFile({ path: outside, tool: "read", session_id: "outside" }),
    /current workspace/
  );
});

test("rulesContextForFile skips symlinked rule files and directories", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  writeFileSync(join(dir, "index.js"), "console.log('x')\n", "utf8");
  const external = mkdtempSync(join(tmpdir(), "omcp-rules-external-"));
  t.after(() => rmSync(external, { recursive: true, force: true }));

  mkdirSync(join(dir, ".github"), { recursive: true });
  writeFileSync(join(external, "secret.md"), "---\nalwaysApply: true\n---\nexternal secret\n", "utf8");
  symlinkSync(join(external, "secret.md"), join(dir, ".github", "copilot-instructions.md"));

  mkdirSync(join(dir, ".omcp"), { recursive: true });
  mkdirSync(join(external, "rules"), { recursive: true });
  writeFileSync(join(external, "rules", "always.md"), "---\nalwaysApply: true\n---\nexternal dir\n", "utf8");
  symlinkSync(join(external, "rules"), join(dir, ".omcp", "rules"));

  const result = await rulesContextForFile({
    path: "index.js",
    tool: "read",
    session_id: "symlink",
  });
  assert.equal(result.matched, 0);
});

test("rulesPendingRead redacts content and project roots unless session-scoped", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  mkdirSync(join(dir, ".omcp", "rules"), { recursive: true });
  writeFileSync(join(dir, "index.js"), "console.log('x')\n", "utf8");
  writeFileSync(
    join(dir, ".omcp", "rules", "always.md"),
    "---\nalwaysApply: true\n---\nSensitive local rule text.\n",
    "utf8",
  );

  await rulesContextForFile({ path: "index.js", tool: "read", session_id: "redact" });
  const unscoped = await rulesPendingRead();
  assert.equal(unscoped.entries.length, 1);
  assert.equal(unscoped.entries[0].project_root, undefined);
  assert.equal(unscoped.entries[0].rules[0].content, undefined);
  assert.equal(unscoped.entries[0].rules[0].content_redacted, true);

  const scoped = await rulesPendingRead({ session_id: "redact" });
  assert.equal(scoped.entries[0].project_root, dir);
  assert.match(scoped.entries[0].rules[0].content, /Sensitive local rule text/);
});

describe("secret redaction", () => {
  test("AWS key in rule content is redacted on write (verified on disk)", async (t) => {
    const dir = freshCwd();
    t.after(() => teardown(dir));

    mkdirSync(join(dir, ".omcp", "rules"), { recursive: true });
    writeFileSync(join(dir, "index.js"), "console.log('x')\n", "utf8");
    writeFileSync(
      join(dir, ".omcp", "rules", "always.md"),
      "---\nalwaysApply: true\n---\nAWS key here AKIA1234567890123456 and a non-secret tail.\n",
      "utf8",
    );

    const result = await rulesContextForFile({
      path: "index.js",
      tool: "read",
      session_id: "aws-redact",
    });
    assert.equal(result.matched, 1);

    const raw = readFileSync(join(dir, ".omcp", "state", "rules-pending.json"), "utf8");
    assert.equal(raw.includes("AKIA"), false, "AKIA prefix must not appear on disk");
    assert.ok(raw.includes("[REDACTED:AWS_KEY]"), "redaction marker must appear on disk");
    assert.ok(raw.includes("non-secret tail"), "non-secret content preserved");
  });

  test("Bearer token in pre-existing pending state is redacted on read", async (t) => {
    const dir = freshCwd();
    t.after(() => teardown(dir));

    mkdirSync(join(dir, ".omcp", "state"), { recursive: true });
    const staged = {
      version: 1,
      updated_at: new Date().toISOString(),
      entries: [
        {
          id: "rules_staged_1",
          ts: new Date().toISOString(),
          session_id: "bearer_read",
          tool: "read",
          file_path: "index.js",
          project_root: dir,
          rules: [
            {
              relativePath: ".omcp/rules/staged.md",
              source: "omcp-rules",
              matchReason: "alwaysApply",
              contentHash: "abc123",
              content: "Authorization: Bearer abcdefghijklmnopqrstuvwxyz1234567890",
            },
          ],
        },
      ],
    };
    writeFileSync(join(dir, ".omcp", "state", "rules-pending.json"), JSON.stringify(staged), "utf8");

    const scoped = await rulesPendingRead({ session_id: "bearer_read" });
    assert.equal(scoped.entries.length, 1);
    const content = scoped.entries[0].rules[0].content;
    assert.match(content, /Bearer \[REDACTED\]/);
    assert.equal(/Bearer abcdefghijklmnopqrstuvwxyz/.test(content), false);
  });

  test("plain-text rule body passes through unchanged at both boundaries", async (t) => {
    const dir = freshCwd();
    t.after(() => teardown(dir));

    mkdirSync(join(dir, ".omcp", "rules"), { recursive: true });
    writeFileSync(join(dir, "index.js"), "console.log('x')\n", "utf8");
    const body = "This is a normal rule about logging and indentation. No secrets here.";
    writeFileSync(
      join(dir, ".omcp", "rules", "always.md"),
      `---\nalwaysApply: true\n---\n${body}\n`,
      "utf8",
    );

    const result = await rulesContextForFile({
      path: "index.js",
      tool: "read",
      session_id: "plain",
    });
    assert.equal(result.matched, 1);
    assert.equal(result.entry.rules[0].content, body);

    const scoped = await rulesPendingRead({ session_id: "plain" });
    assert.equal(scoped.entries[0].rules[0].content, body);

    assert.equal(redactSecrets(body), body);
  });
});

test("rulesPendingClear can clear all pending entries", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  mkdirSync(join(dir, ".omcp", "rules"), { recursive: true });
  writeFileSync("index.js", "console.log('x')\n", "utf8");
  writeFileSync(
    join(dir, ".omcp", "rules", "always.md"),
    "---\nalwaysApply: true\n---\nRemember the local rule.\n",
    "utf8",
  );

  await rulesContextForFile({ path: "index.js", tool: "read", session_id: "a" });
  await rulesContextForFile({ path: "index.js", tool: "read", session_id: "b" });
  assert.equal((await rulesPendingRead()).entries.length, 2);

  const cleared = await rulesPendingClear();
  assert.equal(cleared.removed, 2);
  assert.equal(existsSync(join(dir, ".omcp", "state", "rules-pending.json")), true);
  assert.equal((await rulesPendingRead()).entries.length, 0);
});

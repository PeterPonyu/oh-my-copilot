import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { listPrompts, getPrompt } from "../prompts.mjs";

function freshSkillsDir() {
  return mkdtempSync(join(tmpdir(), "omcp-pr-"));
}

function teardown(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function writeSkill(skillsDir, name, frontmatter, body) {
  mkdirSync(join(skillsDir, name), { recursive: true });
  const fm = Object.entries(frontmatter)
    .map(([k, v]) =>
      typeof v === "string" && (v.includes("[") || v.includes(":") || v.includes(",") || v.includes(" "))
        ? `${k}: "${v}"`
        : `${k}: ${v}`
    )
    .join("\n");
  writeFileSync(join(skillsDir, name, "SKILL.md"), `---\n${fm}\n---\n${body}`);
}

test("listPrompts returns empty list when no skills dir", async (t) => {
  const dir = freshSkillsDir();
  rmSync(dir, { recursive: true, force: true });
  t.after(() => teardown(dir));
  const r = await listPrompts(dir);
  assert.deepEqual(r, { prompts: [] });
});

test("listPrompts returns empty list when skills dir is empty", async (t) => {
  const dir = freshSkillsDir();
  t.after(() => teardown(dir));
  const r = await listPrompts(dir);
  assert.deepEqual(r, { prompts: [] });
});

test("listPrompts enumerates each skill with frontmatter-derived name + description", async (t) => {
  const dir = freshSkillsDir();
  t.after(() => teardown(dir));

  writeSkill(
    dir,
    "alpha",
    {
      name: "alpha",
      description: "[OMCP] Alpha skill",
      "argument-hint": "<task>",
    },
    "# Alpha\n\nDo alpha things."
  );
  writeSkill(
    dir,
    "beta",
    {
      name: "beta",
      description: "[OMCP] Beta skill",
    },
    "# Beta\n\nDo beta things."
  );

  const r = await listPrompts(dir);
  assert.equal(r.prompts.length, 2);
  assert.equal(r.prompts[0].name, "alpha");
  assert.equal(r.prompts[0].description, "[OMCP] Alpha skill");
  assert.equal(r.prompts[1].name, "beta");

  // Single optional `args` argument
  assert.equal(r.prompts[0].arguments.length, 1);
  assert.equal(r.prompts[0].arguments[0].name, "args");
  assert.equal(r.prompts[0].arguments[0].required, false);
  assert.match(r.prompts[0].arguments[0].description, /<task>/);
});

test("listPrompts sorts prompts alphabetically", async (t) => {
  const dir = freshSkillsDir();
  t.after(() => teardown(dir));
  writeSkill(dir, "zulu", { name: "zulu", description: "Z" }, "z body");
  writeSkill(dir, "alpha", { name: "alpha", description: "A" }, "a body");
  writeSkill(dir, "mike", { name: "mike", description: "M" }, "m body");

  const r = await listPrompts(dir);
  assert.deepEqual(
    r.prompts.map((p) => p.name),
    ["alpha", "mike", "zulu"]
  );
});

test("listPrompts skips non-directories and dirs missing SKILL.md", async (t) => {
  const dir = freshSkillsDir();
  t.after(() => teardown(dir));
  // Real skill
  writeSkill(dir, "real", { name: "real", description: "R" }, "real body");
  // Dir without SKILL.md
  mkdirSync(join(dir, "empty-dir"));
  // File at the skills level (shouldn't be considered a skill)
  writeFileSync(join(dir, "stray-file.md"), "stray");

  const r = await listPrompts(dir);
  assert.deepEqual(
    r.prompts.map((p) => p.name),
    ["real"]
  );
});

test("getPrompt returns skill body as a user message", async (t) => {
  const dir = freshSkillsDir();
  t.after(() => teardown(dir));
  writeSkill(
    dir,
    "autopilot",
    { name: "autopilot", description: "[OMCP] Autopilot" },
    "# Autopilot\n\nStep 1. Step 2."
  );

  const r = await getPrompt({ name: "autopilot" }, dir);
  assert.equal(r.description, "[OMCP] Autopilot");
  assert.equal(r.messages.length, 1);
  assert.equal(r.messages[0].role, "user");
  assert.equal(r.messages[0].content.type, "text");
  assert.match(r.messages[0].content.text, /# Autopilot/);
  assert.match(r.messages[0].content.text, /Step 1\. Step 2\./);
  // No caller args section appended
  assert.doesNotMatch(r.messages[0].content.text, /Arguments provided by caller/);
});

test("getPrompt appends caller args when provided", async (t) => {
  const dir = freshSkillsDir();
  t.after(() => teardown(dir));
  writeSkill(
    dir,
    "ralph",
    { name: "ralph", description: "[OMCP] Ralph" },
    "Ralph instructions."
  );

  const r = await getPrompt(
    { name: "ralph", arguments: { args: "build a TODO app" } },
    dir
  );
  const text = r.messages[0].content.text;
  assert.match(text, /Ralph instructions/);
  assert.match(text, /## Arguments provided by caller/);
  assert.match(text, /build a TODO app/);
});

test("getPrompt ignores empty/missing args", async (t) => {
  const dir = freshSkillsDir();
  t.after(() => teardown(dir));
  writeSkill(dir, "team", { name: "team", description: "T" }, "team body");

  const r1 = await getPrompt({ name: "team", arguments: { args: "" } }, dir);
  assert.doesNotMatch(r1.messages[0].content.text, /Arguments provided/);

  const r2 = await getPrompt({ name: "team", arguments: { args: "   " } }, dir);
  assert.doesNotMatch(r2.messages[0].content.text, /Arguments provided/);

  const r3 = await getPrompt({ name: "team" }, dir);
  assert.doesNotMatch(r3.messages[0].content.text, /Arguments provided/);
});

test("getPrompt throws on missing name", async (t) => {
  const dir = freshSkillsDir();
  t.after(() => teardown(dir));
  await assert.rejects(() => getPrompt({}, dir), /non-empty 'name'/);
  await assert.rejects(() => getPrompt({ name: "" }, dir), /non-empty 'name'/);
});

test("getPrompt rejects path-traversal-shaped names", async (t) => {
  const dir = freshSkillsDir();
  t.after(() => teardown(dir));
  await assert.rejects(
    () => getPrompt({ name: "../etc/passwd" }, dir),
    /invalid prompt name/
  );
  await assert.rejects(
    () => getPrompt({ name: "team/sub" }, dir),
    /invalid prompt name/
  );
  await assert.rejects(
    () => getPrompt({ name: "UPPER" }, dir),
    /invalid prompt name/
  );
});

test("getPrompt throws when prompt does not exist", async (t) => {
  const dir = freshSkillsDir();
  t.after(() => teardown(dir));
  await assert.rejects(
    () => getPrompt({ name: "no-such-skill" }, dir),
    /not found/
  );
});

test("listPrompts falls back to dir name when frontmatter lacks name", async (t) => {
  const dir = freshSkillsDir();
  t.after(() => teardown(dir));
  mkdirSync(join(dir, "no-meta"));
  writeFileSync(join(dir, "no-meta", "SKILL.md"), "no frontmatter here, just body.");

  const r = await listPrompts(dir);
  assert.equal(r.prompts.length, 1);
  assert.equal(r.prompts[0].name, "no-meta");
  assert.match(r.prompts[0].description, /no-meta/);
});

test("default skills dir (no explicit path) resolves to the real plugin", async () => {
  // Sanity: when called with no arg, it finds the real plugin's skills dir
  // and returns the 42 omcp skills.
  const r = await listPrompts();
  assert.ok(r.prompts.length >= 30, `expected many prompts from real plugin, got ${r.prompts.length}`);
  // Must include known skill names
  const names = new Set(r.prompts.map((p) => p.name));
  for (const expected of ["autopilot", "ralph", "team", "wiki", "trace"]) {
    assert.ok(names.has(expected), `expected '${expected}' in default prompt list`);
  }
});

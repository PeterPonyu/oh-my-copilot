import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  wikiAdd,
  wikiRead,
  wikiList,
  wikiQuery,
  wikiDelete,
  wikiIngest,
  wikiLint,
} from "../wiki-store.mjs";

const originalCwd = process.cwd();

function freshCwd() {
  const dir = mkdtempSync(join(tmpdir(), "omcp-wk-"));
  process.chdir(dir);
  return dir;
}

function teardown(dir) {
  process.chdir(originalCwd);
  rmSync(dir, { recursive: true, force: true });
}

test("wikiAdd derives slug from title and writes file + index", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const r = await wikiAdd({ title: "Hello World!", body: "# Hello\n\nbody" });
  assert.equal(r.ok, true);
  assert.equal(r.slug, "hello-world");

  const filePath = join(dir, ".omcp", "wiki", "hello-world.md");
  assert.equal(existsSync(filePath), true);
  assert.equal(readFileSync(filePath, "utf8"), "# Hello\n\nbody");

  const index = JSON.parse(readFileSync(join(dir, ".omcp", "wiki", "_index.json"), "utf8"));
  assert.equal(index["hello-world"].title, "Hello World!");
});

test("wikiAdd respects explicit slug", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const r = await wikiAdd({ title: "Hello World", body: "x", slug: "custom-slug" });
  assert.equal(r.slug, "custom-slug");
  assert.ok(existsSync(join(dir, ".omcp", "wiki", "custom-slug.md")));
});

test("wikiAdd records tags", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await wikiAdd({ title: "X", body: "y", tags: ["arch", "infra"] });
  const { entries } = await wikiList();
  assert.deepEqual(entries[0].tags, ["arch", "infra"]);
});

test("wikiAdd rejects invalid slug shape", async () => {
  await assert.rejects(
    wikiAdd({ title: "X", body: "y", slug: "Bad Slug!" }),
    /lowercase alphanumeric/,
  );
  await assert.rejects(
    wikiAdd({ title: "X", body: "y", slug: "../escape" }),
    /lowercase alphanumeric/,
  );
});

test("wikiAdd rejects empty title and non-string body", async () => {
  await assert.rejects(wikiAdd({ title: "", body: "x" }), /non-empty 'title'/);
  await assert.rejects(wikiAdd({ title: "X", body: 123 }), /'body' string/);
});

test("wikiRead returns body and meta", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await wikiAdd({ title: "Page", body: "content", tags: ["t1"] });
  const r = await wikiRead({ slug: "page" });
  assert.equal(r.exists, true);
  assert.equal(r.title, "Page");
  assert.equal(r.body, "content");
  assert.deepEqual(r.tags, ["t1"]);
  assert.ok(r.mtime);
});

test("wikiRead missing slug returns exists=false", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const r = await wikiRead({ slug: "ghost" });
  assert.equal(r.exists, false);
});

test("wikiList returns all entries sorted by slug", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await wikiAdd({ title: "Beta", body: "b" });
  await wikiAdd({ title: "Alpha", body: "a" });
  await wikiAdd({ title: "Gamma", body: "g" });

  const { entries } = await wikiList();
  assert.deepEqual(entries.map((e) => e.slug), ["alpha", "beta", "gamma"]);
});

test("wikiList filters by tag", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await wikiAdd({ title: "A", body: "x", tags: ["arch"] });
  await wikiAdd({ title: "B", body: "x", tags: ["test"] });
  await wikiAdd({ title: "C", body: "x", tags: ["arch", "test"] });

  const { entries } = await wikiList({ tag: "arch" });
  assert.deepEqual(entries.map((e) => e.slug).sort(), ["a", "c"]);
});

test("wikiQuery scoring: title>tags>body, sorted desc with slug tiebreak", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  // Title hit (+3) + body hit (+1) = 4
  await wikiAdd({ title: "Auth Setup", body: "intro about auth", tags: [] });
  // Body hits only (+3, capped)
  await wikiAdd({ title: "Other", body: "auth auth auth", tags: [] });
  // Tag hit (+2)
  await wikiAdd({ title: "Tag-only", body: "irrelevant", tags: ["auth"] });

  const { results } = await wikiQuery({ q: "auth" });
  assert.equal(results.length, 3);
  assert.equal(results[0].slug, "auth-setup", "title+body wins");
  assert.equal(results[1].slug, "other", "3 body hits beats 1 tag");
  assert.equal(results[2].slug, "tag-only");
});

test("wikiQuery returns top-K", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await wikiAdd({ title: "alpha foo", body: "" });
  await wikiAdd({ title: "beta foo", body: "" });
  await wikiAdd({ title: "gamma foo", body: "" });
  await wikiAdd({ title: "delta foo", body: "" });

  const { results } = await wikiQuery({ q: "foo", k: 2 });
  assert.equal(results.length, 2);
});

test("wikiQuery returns empty results when no matches", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await wikiAdd({ title: "page", body: "content" });
  const { results } = await wikiQuery({ q: "missing-keyword" });
  assert.deepEqual(results, []);
});

test("wikiQuery rejects empty query", async () => {
  await assert.rejects(wikiQuery({ q: "" }), /non-empty 'q'/);
});

test("wikiDelete removes file and index entry", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await wikiAdd({ title: "x", body: "y" });
  assert.ok(existsSync(join(dir, ".omcp", "wiki", "x.md")));

  await wikiDelete({ slug: "x" });
  assert.equal(existsSync(join(dir, ".omcp", "wiki", "x.md")), false);

  const { entries } = await wikiList();
  assert.equal(entries.length, 0);
});

test("wikiDelete on missing slug is a no-op (still ok)", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const r = await wikiDelete({ slug: "missing" });
  assert.equal(r.ok, true);
});

test("wikiIngest derives title from H1 first line", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const sourcePath = join(dir, "source.md");
  writeFileSync(sourcePath, "# My Awesome Doc\n\nSome content here.\n", "utf8");

  const r = await wikiIngest({ path: "source.md" });
  assert.equal(r.slug, "my-awesome-doc");

  const read = await wikiRead({ slug: "my-awesome-doc" });
  assert.equal(read.title, "My Awesome Doc");
  assert.match(read.body, /Some content here/);
});

test("wikiIngest accepts explicit slug and tags", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const sourcePath = join(dir, "source.md");
  writeFileSync(sourcePath, "no heading here\n", "utf8");

  const r = await wikiIngest({ path: "source.md", slug: "raw", tags: ["import"] });
  assert.equal(r.slug, "raw");

  const read = await wikiRead({ slug: "raw" });
  assert.deepEqual(read.tags, ["import"]);
});

test("wikiLint detects orphans and untracked files", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await wikiAdd({ title: "valid", body: "x" });

  // Untracked: file present but missing from index
  mkdirSync(join(dir, ".omcp", "wiki"), { recursive: true });
  writeFileSync(join(dir, ".omcp", "wiki", "untracked.md"), "stray", "utf8");

  // Orphan: index entry but file deleted
  await wikiAdd({ title: "doomed", body: "y" });
  rmSync(join(dir, ".omcp", "wiki", "doomed.md"));

  const { orphans, untracked } = await wikiLint();
  assert.deepEqual(orphans, ["doomed"]);
  assert.deepEqual(untracked, ["untracked"]);
});

test("wikiLint on empty wiki returns empty arrays", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  const r = await wikiLint();
  assert.deepEqual(r.orphans, []);
  assert.deepEqual(r.untracked, []);
});

// #69: wiki_ingest must reject paths that escape the workspace root
test("wikiIngest rejects absolute path outside workspace", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await assert.rejects(
    wikiIngest({ path: "/etc/hostname", slug: "test-escape" }),
    /escapes workspace root|does not exist/,
    "absolute path outside workspace must be rejected",
  );
  // Verify nothing was persisted
  assert.equal(existsSync(join(dir, ".omcp", "wiki", "test-escape.md")), false);
});

test("wikiIngest rejects path traversal outside workspace", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  await assert.rejects(
    wikiIngest({ path: "../../etc/hostname", slug: "test-traverse" }),
    /escapes workspace root|does not exist/,
    "path traversal outside workspace must be rejected",
  );
});

test("wikiIngest accepts valid in-workspace file", async (t) => {
  const dir = freshCwd();
  t.after(() => teardown(dir));

  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, "docs", "note.md"), "# My Note\n\nbody content", "utf8");

  const r = await wikiIngest({ path: "docs/note.md", slug: "my-note" });
  assert.equal(r.ok, true);
  assert.equal(r.slug, "my-note");
});

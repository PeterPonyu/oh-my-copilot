import { readFile, writeFile, appendFile, mkdir, rename, unlink, readdir } from "node:fs/promises";
import { emitResourceUpdate } from "./events.mjs";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";

const WIKI_DIR = ".omcp/wiki";
const INDEX_FILE = "_index.json";
const LOG_FILE = "log.md";
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;
const MAX_QUERY_BODY_HITS = 10;
const DEFAULT_QUERY_K = 5;

function wikiDir() {
  return resolve(process.cwd(), WIKI_DIR);
}

function indexPath() {
  return join(wikiDir(), INDEX_FILE);
}

function wikiFilePath(slug) {
  return join(wikiDir(), `${slug}.md`);
}

function validateSlug(slug) {
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) {
    throw new Error("slug must be lowercase alphanumeric with dashes (1-80 chars)");
  }
}

function slugify(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  if (slug.length === 0) {
    throw new Error("could not derive a valid slug from title");
  }
  return slug;
}

async function readIndex() {
  if (!existsSync(indexPath())) return {};
  try {
    const parsed = JSON.parse(await readFile(indexPath(), "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeIndex(index) {
  await mkdir(wikiDir(), { recursive: true });
  const tmp = indexPath() + ".tmp." + randomBytes(6).toString("hex");
  await writeFile(tmp, JSON.stringify(index, null, 2), "utf8");
  await rename(tmp, indexPath());
}

export async function wikiAdd({ title, body, tags, slug } = {}) {
  if (typeof title !== "string" || title.length === 0) {
    throw new Error("wiki_add requires non-empty 'title'");
  }
  if (typeof body !== "string") {
    throw new Error("wiki_add requires 'body' string");
  }
  const finalSlug = slug || slugify(title);
  validateSlug(finalSlug);
  await mkdir(wikiDir(), { recursive: true });
  await writeFile(wikiFilePath(finalSlug), body, "utf8");
  const index = await readIndex();
  index[finalSlug] = {
    title,
    tags: Array.isArray(tags) ? tags : [],
    mtime: new Date().toISOString(),
  };
  await writeIndex(index);
  emitResourceUpdate(`omcp://wiki/${finalSlug}`);
  return { ok: true, slug: finalSlug };
}

export async function wikiRead({ slug } = {}) {
  validateSlug(slug);
  const path = wikiFilePath(slug);
  if (!existsSync(path)) {
    return { exists: false, slug };
  }
  const body = await readFile(path, "utf8");
  const index = await readIndex();
  const meta = index[slug] || {};
  return {
    exists: true,
    slug,
    title: meta.title ?? null,
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    body,
    mtime: meta.mtime ?? null,
  };
}

export async function wikiList({ tag } = {}) {
  const index = await readIndex();
  let entries = Object.entries(index).map(([slug, meta]) => ({
    slug,
    title: meta?.title ?? null,
    tags: Array.isArray(meta?.tags) ? meta.tags : [],
    mtime: meta?.mtime ?? null,
  }));
  if (typeof tag === "string") {
    entries = entries.filter((e) => e.tags.includes(tag));
  }
  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  return { entries };
}

export async function wikiQuery({ q, k } = {}) {
  if (typeof q !== "string" || q.length === 0) {
    throw new Error("wiki_query requires non-empty 'q'");
  }
  const limit = typeof k === "number" && k > 0 ? k : DEFAULT_QUERY_K;
  const index = await readIndex();
  const ql = q.toLowerCase();

  const results = [];
  for (const [slug, meta] of Object.entries(index)) {
    let score = 0;
    if (typeof meta?.title === "string" && meta.title.toLowerCase().includes(ql)) {
      score += 3;
    }
    if (Array.isArray(meta?.tags)) {
      for (const t of meta.tags) {
        if (typeof t === "string" && t.toLowerCase().includes(ql)) {
          score += 2;
          break;
        }
      }
    }
    try {
      const body = await readFile(wikiFilePath(slug), "utf8");
      const bodyLower = body.toLowerCase();
      let hits = 0;
      let idx = 0;
      while ((idx = bodyLower.indexOf(ql, idx)) !== -1) {
        hits += 1;
        idx += ql.length;
        if (hits >= MAX_QUERY_BODY_HITS) break;
      }
      score += hits;
    } catch {
      // skip unreadable entries
    }
    if (score > 0) {
      results.push({
        slug,
        title: meta?.title ?? null,
        tags: Array.isArray(meta?.tags) ? meta.tags : [],
        score,
      });
    }
  }

  results.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
  const sliced = results.slice(0, limit);
  // Per ADR-5: log query + result count for monthly review (no automated reader)
  try {
    await mkdir(wikiDir(), { recursive: true });
    const logLine = JSON.stringify({ ts: new Date().toISOString(), query: q, result_count: sliced.length }) + "\n";
    await appendFile(join(wikiDir(), LOG_FILE), logLine, "utf8");
  } catch {
    // logging is best-effort; never fail the query
  }
  return { results: sliced };
}

export async function wikiDelete({ slug } = {}) {
  validateSlug(slug);
  const path = wikiFilePath(slug);
  let mutated = false;
  if (existsSync(path)) {
    await unlink(path);
    mutated = true;
  }
  const index = await readIndex();
  if (slug in index) {
    delete index[slug];
    await writeIndex(index);
    mutated = true;
  }
  if (mutated) emitResourceUpdate(`omcp://wiki/${slug}`);
  return { ok: true, slug };
}

export async function wikiIngest({ path, slug, tags } = {}) {
  if (typeof path !== "string" || path.length === 0) {
    throw new Error("wiki_ingest requires 'path'");
  }
  const absPath = resolve(process.cwd(), path);
  const body = await readFile(absPath, "utf8");
  const firstLine = body.split("\n", 1)[0]?.trim() ?? "";
  const title = firstLine.startsWith("# ") ? firstLine.slice(2).trim() : path;
  return wikiAdd({ title, body, tags, slug });
}

export async function wikiLint() {
  const index = await readIndex();
  const orphans = [];
  const untracked = [];
  for (const slug of Object.keys(index)) {
    if (!existsSync(wikiFilePath(slug))) orphans.push(slug);
  }
  if (existsSync(wikiDir())) {
    const entries = await readdir(wikiDir());
    for (const f of entries) {
      if (f === INDEX_FILE || f === LOG_FILE || !f.endsWith(".md")) continue;
      const slug = f.slice(0, -3);
      if (!(slug in index)) untracked.push(slug);
    }
  }
  orphans.sort();
  untracked.sort();
  return { orphans, untracked };
}

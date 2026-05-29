import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { emitResourceUpdate } from "./events.mjs";

const NOTES_URI = "omcp://project-memory/notes";
const DIRECTIVES_URI = "omcp://project-memory/directives";

const MEMORY_FILE = ".omcp/project-memory.json";
const SCHEMA_VERSION = 1;

// In-memory LRU dedup window for project_memory writes.
// State is process-local; restart resets the window. Cross-session dedup is out of scope.
const DEDUP_RECENT_LIMIT = 10;
const recentHashes = new Map();

function normalizeForHash(content) {
  if (typeof content !== "string") return "";
  return content.trim().replace(/\s+/g, " ").toLowerCase();
}

function hashContent(normalized) {
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function rememberHash(hash, id) {
  if (recentHashes.has(hash)) recentHashes.delete(hash);
  recentHashes.set(hash, { id, ts: Date.now() });
  while (recentHashes.size > DEDUP_RECENT_LIMIT) {
    const oldestKey = recentHashes.keys().next().value;
    recentHashes.delete(oldestKey);
  }
}

export function _resetDedupForTests() {
  recentHashes.clear();
}

function memoryPath() {
  return resolve(process.cwd(), MEMORY_FILE);
}

function emptyMemory() {
  return {
    version: SCHEMA_VERSION,
    _seq: 0,
    notes: [],
    directives: [],
    facts: {},
  };
}

function normalizeMemory(parsed) {
  return {
    version: parsed?.version ?? SCHEMA_VERSION,
    _seq: typeof parsed?._seq === "number" ? parsed._seq : 0,
    notes: Array.isArray(parsed?.notes) ? parsed.notes : [],
    directives: Array.isArray(parsed?.directives) ? parsed.directives : [],
    facts: parsed?.facts && typeof parsed.facts === "object" && !Array.isArray(parsed.facts)
      ? parsed.facts
      : {},
  };
}

async function readMemory() {
  const filePath = memoryPath();
  if (!existsSync(filePath)) {
    return emptyMemory();
  }
  try {
    const raw = await readFile(filePath, "utf8");
    return normalizeMemory(JSON.parse(raw));
  } catch {
    return emptyMemory();
  }
}

async function writeMemory(memory) {
  const filePath = memoryPath();
  await mkdir(dirname(filePath), { recursive: true });
  const tmp = filePath + ".tmp." + randomBytes(6).toString("hex");
  await writeFile(tmp, JSON.stringify(memory, null, 2), "utf8");
  await rename(tmp, filePath);
}

export async function projectMemoryRead({ kind, tag, limit } = {}) {
  const memory = await readMemory();

  if (kind === "facts") {
    return { facts: memory.facts };
  }

  let notes = memory.notes;
  let directives = memory.directives;

  if (tag) {
    notes = notes.filter((n) => Array.isArray(n.tags) && n.tags.includes(tag));
  }

  const cap = typeof limit === "number" && limit > 0 ? limit : null;

  if (kind === "notes") {
    return { notes: cap ? notes.slice(-cap) : notes };
  }
  if (kind === "directives") {
    return { directives: cap ? directives.slice(-cap) : directives };
  }

  return {
    version: memory.version,
    notes: cap ? notes.slice(-cap) : notes,
    directives: cap ? directives.slice(-cap) : directives,
    facts: memory.facts,
  };
}

export async function projectMemoryWrite({ facts } = {}) {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) {
    throw new Error("project_memory_write requires 'facts' object");
  }
  const memory = await readMemory();
  for (const [key, value] of Object.entries(facts)) {
    if (value === null || value === undefined) {
      delete memory.facts[key];
    } else {
      memory.facts[key] = value;
    }
  }
  await writeMemory(memory);
  return { ok: true, facts: memory.facts };
}

export async function projectMemoryAddNote({ text, tags } = {}) {
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("project_memory_add_note requires non-empty 'text'");
  }
  const normalized = normalizeForHash(text);
  const hash = hashContent(normalized);
  if (recentHashes.has(hash)) {
    const existing = recentHashes.get(hash);
    // LRU touch: re-insert to refresh recency (Map preserves insertion order).
    rememberHash(hash, existing.id);
    return {
      ok: true,
      status: "skip",
      reason: "duplicate",
      existing_id: existing.id,
    };
  }
  const memory = await readMemory();
  memory._seq += 1;
  const note = {
    id: `n_${memory._seq}`,
    ts: new Date().toISOString(),
    text,
    tags: Array.isArray(tags) ? tags : [],
  };
  memory.notes.push(note);
  await writeMemory(memory);
  emitResourceUpdate(NOTES_URI);
  rememberHash(hash, note.id);
  return { ok: true, status: "ok", note };
}

export async function projectMemoryAddDirective({ text, scope = "permanent" } = {}) {
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("project_memory_add_directive requires non-empty 'text'");
  }
  if (scope !== "session" && scope !== "permanent") {
    throw new Error("scope must be 'session' or 'permanent'");
  }
  const memory = await readMemory();
  memory._seq += 1;
  const directive = {
    id: `d_${memory._seq}`,
    ts: new Date().toISOString(),
    text,
    scope,
  };
  memory.directives.push(directive);
  await writeMemory(memory);
  emitResourceUpdate(DIRECTIVES_URI);
  return { ok: true, directive };
}

export async function projectMemoryPrune({ maxAgeDays, keepNotes, keepDirectives } = {}) {
  const memory = await readMemory();
  const now = Date.now();
  const cutoffMs = typeof maxAgeDays === "number" && maxAgeDays >= 0
    ? maxAgeDays * 24 * 60 * 60 * 1000
    : null;

  const beforeNotes = memory.notes.length;
  const beforeDirectives = memory.directives.length;

  if (cutoffMs !== null) {
    memory.notes = memory.notes.filter((n) => {
      const age = now - new Date(n.ts).getTime();
      return age <= cutoffMs;
    });
    memory.directives = memory.directives.filter((d) => {
      const age = now - new Date(d.ts).getTime();
      return age <= cutoffMs;
    });
  }

  const maxNotes = typeof keepNotes === "number" && keepNotes > 0 ? keepNotes : null;
  const maxDirectives = typeof keepDirectives === "number" && keepDirectives > 0 ? keepDirectives : null;

  if (maxNotes !== null && memory.notes.length > maxNotes) {
    memory.notes = memory.notes.slice(-maxNotes);
  }
  if (maxDirectives !== null && memory.directives.length > maxDirectives) {
    memory.directives = memory.directives.slice(-maxDirectives);
  }

  await writeMemory(memory);
  emitResourceUpdate(NOTES_URI);
  emitResourceUpdate(DIRECTIVES_URI);
  return {
    ok: true,
    pruned_notes: beforeNotes - memory.notes.length,
    pruned_directives: beforeDirectives - memory.directives.length,
    remaining_notes: memory.notes.length,
    remaining_directives: memory.directives.length,
  };
}

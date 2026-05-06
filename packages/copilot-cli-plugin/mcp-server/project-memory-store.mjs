import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { randomBytes } from "node:crypto";

const MEMORY_FILE = ".omcp/project-memory.json";
const SCHEMA_VERSION = 1;

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
  return { ok: true, note };
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
  return { ok: true, directive };
}

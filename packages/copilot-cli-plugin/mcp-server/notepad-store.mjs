import { readFile, writeFile, appendFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { emitResourceUpdate } from "./events.mjs";

const NOTEPAD_URI = "omcp://notepad";

const NOTEPAD_FILE = ".omcp/notepad.md";

const VALID_LANES = ["manual", "working", "priority"];
const DEFAULT_PRUNE_LANES = ["manual", "working"];
const DEFAULT_MAX_AGE_DAYS = 7;

const LINE_RE = /^\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.*)$/;

function notepadPath() {
  return resolve(process.cwd(), NOTEPAD_FILE);
}

function parseLine(line) {
  const match = LINE_RE.exec(line);
  if (!match) return null;
  return { ts: match[1], priority: match[2], entry: match[3] };
}

function validateEntry(entry) {
  if (typeof entry !== "string" || entry.length === 0) {
    throw new Error("notepad write requires non-empty 'entry' string");
  }
}

export async function notepadRead({ tail } = {}) {
  const filePath = notepadPath();
  if (!existsSync(filePath)) {
    return { content: "" };
  }
  const raw = await readFile(filePath, "utf8");
  if (tail == null || typeof tail !== "number" || tail <= 0) {
    return { content: raw };
  }
  const lines = raw.split("\n");
  return { content: lines.slice(-tail).join("\n") };
}

export async function notepadWrite({ entry, priority = "manual" } = {}) {
  validateEntry(entry);
  if (!VALID_LANES.includes(priority)) {
    throw new Error(`priority must be one of: ${VALID_LANES.join(", ")}`);
  }
  const filePath = notepadPath();
  await mkdir(dirname(filePath), { recursive: true });
  const ts = new Date().toISOString();
  const line = `[${ts}] [${priority}] ${entry}\n`;
  await appendFile(filePath, line, "utf8");
  emitResourceUpdate(NOTEPAD_URI);
  return { ok: true };
}

export async function notepadWritePriority({ entry } = {}) {
  return notepadWrite({ entry, priority: "priority" });
}

export async function notepadWriteWorking({ entry } = {}) {
  return notepadWrite({ entry, priority: "working" });
}

export async function notepadWriteManual({ entry } = {}) {
  return notepadWrite({ entry, priority: "manual" });
}

export async function notepadPrune({ maxAgeDays = DEFAULT_MAX_AGE_DAYS, lane } = {}) {
  if (typeof maxAgeDays !== "number" || maxAgeDays < 0) {
    throw new Error("maxAgeDays must be a non-negative number");
  }
  if (lane !== undefined && !VALID_LANES.includes(lane)) {
    throw new Error(`lane must be one of: ${VALID_LANES.join(", ")}`);
  }

  const filePath = notepadPath();
  if (!existsSync(filePath)) {
    return { ok: true, kept: 0, pruned: 0 };
  }

  const raw = await readFile(filePath, "utf8");
  const lines = raw.split("\n");
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const lanesToPrune = lane ? [lane] : DEFAULT_PRUNE_LANES;

  const kept = [];
  let prunedCount = 0;
  for (const line of lines) {
    if (line.length === 0) continue;
    const parsed = parseLine(line);
    if (!parsed) {
      kept.push(line);
      continue;
    }
    if (!lanesToPrune.includes(parsed.priority)) {
      kept.push(line);
      continue;
    }
    const ts = Date.parse(parsed.ts);
    if (Number.isFinite(ts) && ts > cutoff) {
      kept.push(line);
    } else {
      prunedCount += 1;
    }
  }

  const output = kept.length === 0 ? "" : kept.join("\n") + "\n";
  const tmp = filePath + ".tmp." + randomBytes(6).toString("hex");
  await writeFile(tmp, output, "utf8");
  await rename(tmp, filePath);

  if (prunedCount > 0) emitResourceUpdate(NOTEPAD_URI);
  return { ok: true, kept: kept.length, pruned: prunedCount };
}

export async function notepadStats() {
  const filePath = notepadPath();
  const empty = {
    total: 0,
    byLane: { manual: 0, working: 0, priority: 0 },
    oldest: null,
    newest: null,
    unparseable: 0,
  };
  if (!existsSync(filePath)) {
    return empty;
  }

  const raw = await readFile(filePath, "utf8");
  const lines = raw.split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) {
    return empty;
  }

  const byLane = { manual: 0, working: 0, priority: 0 };
  let total = 0;
  let unparseable = 0;
  let oldest = null;
  let newest = null;

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) {
      unparseable += 1;
      continue;
    }
    total += 1;
    if (parsed.priority in byLane) {
      byLane[parsed.priority] += 1;
    }
    const ts = Date.parse(parsed.ts);
    if (!Number.isFinite(ts)) continue;
    if (oldest === null || ts < oldest) oldest = ts;
    if (newest === null || ts > newest) newest = ts;
  }

  return {
    total,
    byLane,
    oldest: oldest !== null ? new Date(oldest).toISOString() : null,
    newest: newest !== null ? new Date(newest).toISOString() : null,
    unparseable,
  };
}

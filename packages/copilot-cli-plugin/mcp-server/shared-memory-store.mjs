import { readFile, writeFile, appendFile, mkdir, rename, unlink, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";

const SHARED_DIR = ".omcp/shared-memory";
const META_FILE = "_meta.json";
const CHANNEL_RE = /^[a-z0-9][a-z0-9-_]{0,63}$/i;
const DEFAULT_MAX_AGE_DAYS = 1;

const PIPE_BUF_BYTES = 4096;
const WARNING_DEDUPE_WINDOW_MS = 60_000;
const _warningLastEmittedAt = new Map();

export function _resetSharedMemoryWarningRateLimit() {
  _warningLastEmittedAt.clear();
}

function emitOversizeWarning(channel, sizeBytes) {
  const key = `${channel}:${sizeBytes}`;
  const now = Date.now();
  const last = _warningLastEmittedAt.get(key);
  if (last !== undefined && now - last < WARNING_DEDUPE_WINDOW_MS) {
    return;
  }
  _warningLastEmittedAt.set(key, now);
  process.stderr.write(
    `[shared_memory] WARNING: entry size ${sizeBytes}B on channel '${channel}' exceeds ${PIPE_BUF_BYTES}B; concurrent writers may interleave\n`,
  );
}

const VALID_KINDS = [
  "task_assigned",
  "task_done",
  "finding",
  "question",
  "answer",
  "blocker",
  "note",
];

function sharedDir() {
  return resolve(process.cwd(), SHARED_DIR);
}

function metaPath() {
  return join(sharedDir(), META_FILE);
}

function channelPath(channel) {
  return join(sharedDir(), `${channel}.jsonl`);
}

function validateChannel(channel) {
  if (typeof channel !== "string" || !CHANNEL_RE.test(channel)) {
    throw new Error("channel must be alphanumeric/dash/underscore (1-64 chars)");
  }
}

async function readMeta() {
  if (!existsSync(metaPath())) return {};
  try {
    const parsed = JSON.parse(await readFile(metaPath(), "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeMeta(meta) {
  await mkdir(sharedDir(), { recursive: true });
  const tmp = metaPath() + ".tmp." + randomBytes(6).toString("hex");
  await writeFile(tmp, JSON.stringify(meta, null, 2), "utf8");
  await rename(tmp, metaPath());
}

export async function sharedMemoryWrite({ channel, kind, payload, from, to } = {}) {
  validateChannel(channel);
  if (!VALID_KINDS.includes(kind)) {
    throw new Error(`kind must be one of: ${VALID_KINDS.join(", ")}`);
  }
  await mkdir(sharedDir(), { recursive: true });
  const ts = new Date().toISOString();
  const event = { ts, kind };
  if (from !== undefined) event.from = from;
  if (to !== undefined) event.to = to;
  if (payload !== undefined) event.payload = payload;
  const encoded = JSON.stringify(event) + "\n";
  const sizeBytes = Buffer.byteLength(encoded, "utf8");
  if (sizeBytes > PIPE_BUF_BYTES) {
    emitOversizeWarning(channel, sizeBytes);
  }
  await appendFile(channelPath(channel), encoded, "utf8");

  const meta = await readMeta();
  meta[channel] = {
    last_seen: ts,
    last_kind: kind,
    last_from: from ?? null,
  };
  await writeMeta(meta);
  return { ok: true, channel, ts };
}

async function readChannelEvents(channel) {
  const filePath = channelPath(channel);
  if (!existsSync(filePath)) return [];
  const raw = await readFile(filePath, "utf8");
  const events = [];
  for (const line of raw.split("\n")) {
    if (line.length === 0) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // skip malformed line
    }
  }
  return events;
}

export async function sharedMemoryRead({ channel, kind, since, limit, from } = {}) {
  validateChannel(channel);
  let events = await readChannelEvents(channel);

  if (typeof kind === "string") {
    events = events.filter((e) => e.kind === kind);
  }
  if (typeof from === "string") {
    events = events.filter((e) => e.from === from);
  }
  if (typeof since === "string") {
    events = events.filter((e) => typeof e.ts === "string" && e.ts > since);
  }
  if (typeof limit === "number" && limit > 0) {
    events = events.slice(-limit);
  }
  return { channel, events };
}

export async function sharedMemoryList() {
  if (!existsSync(sharedDir())) {
    return { channels: [] };
  }
  const meta = await readMeta();
  const entries = await readdir(sharedDir());
  const channels = [];
  for (const f of entries) {
    if (f === META_FILE || !f.endsWith(".jsonl")) continue;
    const channel = f.slice(0, -".jsonl".length);
    const channelMeta = meta[channel] || {};
    channels.push({
      channel,
      last_seen: channelMeta.last_seen ?? null,
      last_kind: channelMeta.last_kind ?? null,
      last_from: channelMeta.last_from ?? null,
    });
  }
  channels.sort((a, b) => a.channel.localeCompare(b.channel));
  return { channels };
}

export async function sharedMemoryDelete({ channel } = {}) {
  validateChannel(channel);
  const filePath = channelPath(channel);
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
  const meta = await readMeta();
  if (channel in meta) {
    delete meta[channel];
    await writeMeta(meta);
  }
  return { ok: true, channel };
}

export async function sharedMemoryCleanup({ maxAgeDays = DEFAULT_MAX_AGE_DAYS } = {}) {
  if (typeof maxAgeDays !== "number" || maxAgeDays < 0) {
    throw new Error("maxAgeDays must be a non-negative number");
  }
  if (!existsSync(sharedDir())) {
    return { ok: true, removed: [] };
  }

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const meta = await readMeta();
  const removed = [];

  const entries = await readdir(sharedDir());
  for (const f of entries) {
    if (f === META_FILE || !f.endsWith(".jsonl")) continue;
    const channel = f.slice(0, -".jsonl".length);
    let lastSeenMs = null;
    const channelMeta = meta[channel];
    if (channelMeta?.last_seen) {
      const parsed = Date.parse(channelMeta.last_seen);
      if (Number.isFinite(parsed)) lastSeenMs = parsed;
    }
    if (lastSeenMs === null) {
      try {
        const s = await stat(channelPath(channel));
        lastSeenMs = s.mtimeMs;
      } catch {
        continue;
      }
    }
    if (lastSeenMs < cutoff) {
      await unlink(channelPath(channel));
      delete meta[channel];
      removed.push(channel);
    }
  }
  await writeMeta(meta);
  removed.sort();
  return { ok: true, removed };
}

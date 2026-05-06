import { readFile, writeFile, mkdir, readdir, rename, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const STATE_DIR = ".omcp/state";

function stateDir() {
  return resolve(process.cwd(), STATE_DIR);
}

function validateKey(key) {
  if (typeof key !== "string" || key.length === 0) {
    throw new Error("key must be a non-empty string");
  }
  if (key.includes("..") || key.includes("/") || key.startsWith(".")) {
    throw new Error("key must not contain '..', '/', or start with '.'");
  }
}

function keyPath(key) {
  return join(stateDir(), `${key}.json`);
}

export async function stateRead(key) {
  validateKey(key);
  const filePath = keyPath(key);
  if (!existsSync(filePath)) {
    return { value: null, exists: false };
  }
  try {
    const raw = await readFile(filePath, "utf8");
    return { value: JSON.parse(raw), exists: true };
  } catch {
    return { value: null, exists: false };
  }
}

export async function stateWrite(key, value) {
  validateKey(key);
  const dir = stateDir();
  await mkdir(dir, { recursive: true });
  const filePath = keyPath(key);
  const tmp = filePath + ".tmp." + randomBytes(6).toString("hex");
  await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await rename(tmp, filePath);
  return { ok: true, path: filePath };
}

export async function stateList() {
  const dir = stateDir();
  if (!existsSync(dir)) {
    return { keys: [] };
  }
  const entries = await readdir(dir);
  const keys = entries
    .filter((f) => f.endsWith(".json") && !f.includes(".tmp."))
    .map((f) => f.slice(0, -5));
  return { keys };
}

const MODE_KEY_SUFFIX = "-state";
const DEFAULT_CANCEL_TTL_SECONDS = 30;

function modeKey(mode) {
  return `${mode}${MODE_KEY_SUFFIX}`;
}

export async function stateClear({
  key,
  mode,
  session_id,
  cancelTtl = DEFAULT_CANCEL_TTL_SECONDS,
} = {}) {
  if (!mode && !key) {
    throw new Error("state_clear requires either 'mode' or 'key'");
  }
  const targetKey = mode ? modeKey(mode) : key;
  validateKey(targetKey);
  const now = Date.now();
  const tombstone = {
    cancelled: true,
    mode: mode ?? null,
    session_id: session_id ?? null,
    cleared_at: new Date(now).toISOString(),
    expires_at: new Date(now + cancelTtl * 1000).toISOString(),
  };
  return stateWrite(targetKey, tombstone);
}

export async function stateGetStatus({ mode } = {}) {
  if (!mode) {
    throw new Error("state_get_status requires 'mode'");
  }
  const key = modeKey(mode);
  const { value, exists } = await stateRead(key);
  if (!exists || value == null || typeof value !== "object") {
    return { mode, exists: false, active: false };
  }
  const result = {
    mode,
    exists: true,
    active: value.active === true,
    session_id: value.session_id ?? null,
    started_at: value.started_at ?? null,
    last_seen: value.last_seen ?? null,
  };
  if (value.cancelled === true) {
    result.cancelled = true;
    result.cleared_at = value.cleared_at ?? null;
    const expiresMs = value.expires_at ? Date.parse(value.expires_at) : 0;
    result.in_grace_period = Number.isFinite(expiresMs) && expiresMs > Date.now();
    result.active = false;
  }
  return result;
}

export async function stateListActive() {
  const { keys } = await stateList();
  const active = [];
  for (const k of keys) {
    if (!k.endsWith(MODE_KEY_SUFFIX)) continue;
    const { value, exists } = await stateRead(k);
    if (!exists || value == null || typeof value !== "object") continue;
    if (value.active !== true) continue;
    active.push({
      mode: k.slice(0, -MODE_KEY_SUFFIX.length),
      session_id: value.session_id ?? null,
      started_at: value.started_at ?? null,
      last_seen: value.last_seen ?? null,
    });
  }
  return { active };
}

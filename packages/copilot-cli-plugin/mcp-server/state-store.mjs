import { readFile, writeFile, mkdir, readdir, rename, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const STATE_DIR = ".omc/state";

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

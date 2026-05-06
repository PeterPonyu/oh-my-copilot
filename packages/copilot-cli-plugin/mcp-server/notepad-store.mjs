import { readFile, appendFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

const NOTEPAD_FILE = ".omc/notepad.md";

function notepadPath() {
  return resolve(process.cwd(), NOTEPAD_FILE);
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

export async function notepadWrite({ entry, priority = "manual" }) {
  const filePath = notepadPath();
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  const ts = new Date().toISOString();
  const line = `[${ts}] [${priority}] ${entry}\n`;
  await appendFile(filePath, line, "utf8");
  return { ok: true };
}

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";

const PLANS_DIR = ".omc/plans";

function plansDir() {
  return resolve(process.cwd(), PLANS_DIR);
}

async function extractTitle(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^#\s+(.+)/);
      if (m) return m[1].trim();
    }
  } catch {
    // fall through
  }
  return "";
}

export async function planList() {
  const dir = plansDir();
  if (!existsSync(dir)) {
    return { plans: [] };
  }
  const entries = await readdir(dir);
  const mdFiles = entries.filter((f) => f.endsWith(".md")).sort();
  const plans = await Promise.all(
    mdFiles.map(async (file) => {
      const filePath = join(dir, file);
      const slug = basename(file, ".md");
      const title = await extractTitle(filePath);
      return { path: filePath, slug, title };
    })
  );
  return { plans };
}

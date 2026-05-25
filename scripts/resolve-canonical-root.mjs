#!/usr/bin/env node
// Resolve the canonical oh-my-copilot repo root from a starting path.
// Mirrors scripts/resolve-canonical-root.py:
//   - Collapses .omx/team/.../worktrees/<name> paths back to the canonical root.
//   - Walks parents looking for AGENTS.md + packages/copilot-cli-plugin/plugin.json + benchmark/.
//   - Falls back to `git rev-parse --show-toplevel`, then to the starting dir.
//
// Usage: node scripts/resolve-canonical-root.mjs [path]
//   Default path: "."
// Prints the absolute canonical root on stdout.

import { existsSync, statSync, realpathSync } from "node:fs";
import { resolve, dirname, join, sep, isAbsolute } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";

function expanduser(input) {
  if (input === "~") return homedir();
  if (input.startsWith("~/")) return join(homedir(), input.slice(2));
  return input;
}

function resolveAbs(input) {
  const expanded = expanduser(input);
  const abs = isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
  try {
    return realpathSync(abs);
  } catch {
    return resolve(abs);
  }
}

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function looksLikeRepoRoot(path) {
  return (
    isFile(join(path, "AGENTS.md")) &&
    isFile(join(path, "packages", "copilot-cli-plugin", "plugin.json")) &&
    isDir(join(path, "benchmark"))
  );
}

function pathParts(path) {
  // Split absolute path into parts the way Python's Path.parts does:
  // first part is the root ('/'), then individual segments.
  const normalized = resolve(path);
  const segs = normalized.split(sep).filter((s) => s.length > 0);
  return [sep, ...segs];
}

function partsToPath(parts) {
  if (parts.length === 0) return sep;
  if (parts[0] === sep) {
    return sep + parts.slice(1).join(sep);
  }
  return parts.join(sep);
}

function collapseOmxTeamWorktree(path) {
  const parts = pathParts(path);
  for (let idx = 0; idx < parts.length; idx++) {
    if (parts[idx] !== ".omx") continue;
    if (idx + 3 >= parts.length) continue;
    if (parts[idx + 1] !== "team") continue;
    const tail = parts.slice(idx + 2);
    if (!tail.includes("worktrees")) continue;
    const candidate = idx > 0 ? partsToPath(parts.slice(0, idx)) : parts[0];
    if (looksLikeRepoRoot(candidate)) {
      return candidate;
    }
  }
  return null;
}

function gitToplevel(path) {
  try {
    const proc = spawnSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: path,
      encoding: "utf8",
    });
    if (proc.status !== 0) return null;
    const value = (proc.stdout || "").trim();
    if (!value) return null;
    try {
      return realpathSync(value);
    } catch {
      return resolve(value);
    }
  } catch {
    return null;
  }
}

function parentsOf(path) {
  const out = [];
  let current = path;
  while (true) {
    const parent = dirname(current);
    if (parent === current) break;
    out.push(parent);
    current = parent;
  }
  return out;
}

export function resolveCanonicalRoot(raw) {
  const start = resolveAbs(raw);

  const collapsed = collapseOmxTeamWorktree(start);
  if (collapsed !== null) {
    return collapsed;
  }

  let current = start;
  if (isFile(current)) {
    current = dirname(current);
  }

  for (const candidate of [current, ...parentsOf(current)]) {
    if (looksLikeRepoRoot(candidate)) {
      return candidate;
    }
  }

  const gitRoot = gitToplevel(current);
  if (gitRoot !== null) {
    return gitRoot;
  }

  return current;
}

function main() {
  const target = process.argv[2] ?? ".";
  process.stdout.write(resolveCanonicalRoot(target) + "\n");
  return 0;
}

const invokedDirectly = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  process.exit(main());
}

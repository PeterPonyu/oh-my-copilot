import { readFile, writeFile, mkdir, readdir, realpath, stat, lstat, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, join, relative, sep, isAbsolute } from "node:path";
import { homedir } from "node:os";
import { createHash, randomBytes } from "node:crypto";
import { emitResourceUpdate } from "./events.mjs";

const SCHEMA_VERSION = 1;
const STATE_DIR = ".omcp/state";
const PENDING_FILE = ".omcp/state/rules-pending.json";
const DEDUPE_DIR = ".omcp/state/rules-injector";
const RULE_EXTENSIONS = [".md", ".mdc"];
const PROJECT_MARKERS = [".git", "package.json", "pyproject.toml", "Cargo.toml", "go.mod"];
const FILE_TOOL_NAMES = new Set(["read", "write", "edit", "multiedit", "replace", "create"]);
const MAX_RULE_CONTENT = 12000;
const MAX_PENDING_ENTRIES = 50;
const RULES_PENDING_URI = "omcp://rules/pending";

// Ported from oh-my-codex crates/omx-sparkshell/src/codex_bridge.rs redact_secrets.
// ANTHROPIC_KEY must precede OPENAI_KEY — both start with `sk-`.
const REDACTION_PATTERNS = [
  { name: "AWS_KEY", regex: /AKIA[0-9A-Z]{16}/g, replacement: "[REDACTED:AWS_KEY]" },
  { name: "GH_TOKEN", regex: /(?:ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,}/g, replacement: "[REDACTED:GH_TOKEN]" },
  { name: "ANTHROPIC_KEY", regex: /sk-ant-[A-Za-z0-9_-]{20,}/g, replacement: "[REDACTED:ANTHROPIC_KEY]" },
  { name: "OPENAI_KEY", regex: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, replacement: "[REDACTED:OPENAI_KEY]" },
  { name: "BEARER", regex: /Bearer [A-Za-z0-9_.~+/=-]{20,}/g, replacement: "Bearer [REDACTED]" },
  { name: "KV_SECRET", regex: /\b(password|secret|token|api[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9_.+/=-]{20,}/gi, replacement: "$1=[REDACTED]" },
];

export function redactSecrets(text) {
  if (typeof text !== "string") return text;
  return REDACTION_PATTERNS.reduce((acc, p) => acc.replace(p.regex, p.replacement), text);
}

const PROJECT_RULE_SOURCES = [
  { label: "omcp-rules", dirParts: [".omcp", "rules"], extensions: RULE_EXTENSIONS },
  { label: "github-instructions", dirParts: [".github", "instructions"], extensions: [".instructions.md"] },
  { label: "cursor-rules", dirParts: [".cursor", "rules"], extensions: RULE_EXTENSIONS },
  { label: "claude-rules", dirParts: [".claude", "rules"], extensions: RULE_EXTENSIONS },
];

const SINGLE_FILE_RULES = [
  { label: "github-copilot-instructions", pathParts: [".github", "copilot-instructions.md"] },
];

function nowIso() {
  return new Date().toISOString();
}

function statePath(...parts) {
  return resolve(process.cwd(), ...parts);
}

function normalizeSessionId(sessionId) {
  const raw = typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : "default";
  return raw.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "default";
}

async function atomicWriteJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp.${randomBytes(6).toString("hex")}`;
  await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await import("node:fs/promises").then(({ rename }) => rename(tmp, filePath));
}

async function readJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function findProjectRoot(startPath) {
  let current = resolve(startPath || process.cwd());
  try {
    const s = await stat(current);
    if (!s.isDirectory()) current = dirname(current);
  } catch {
    current = dirname(current);
  }

  while (true) {
    for (const marker of PROJECT_MARKERS) {
      if (existsSync(join(current, marker))) return current;
    }
    const parent = dirname(current);
    if (parent === current) return process.cwd();
    current = parent;
  }
}

function hasRuleExtension(fileName, extensions) {
  return extensions.some((ext) => fileName.endsWith(ext));
}

async function walkRuleFiles(dir, extensions, out = []) {
  if (!existsSync(dir)) return out;
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkRuleFiles(fullPath, extensions, out);
    } else if (entry.isFile() && hasRuleExtension(entry.name, extensions)) {
      out.push(fullPath);
    }
  }
  return out;
}

async function safeRealpath(filePath) {
  try {
    return await realpath(filePath);
  } catch {
    return filePath;
  }
}

function isWithinPath(root, target) {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

async function isSymlink(filePath) {
  try {
    return (await lstat(filePath)).isSymbolicLink();
  } catch {
    return false;
  }
}

async function startDirForTouchedPath(touchedPath) {
  try {
    const s = await stat(touchedPath);
    return s.isDirectory() ? touchedPath : dirname(touchedPath);
  } catch {
    return dirname(touchedPath);
  }
}

async function resolveTouchedPathInWorkspace(filePath) {
  const workspaceRoot = await findProjectRoot(process.cwd());
  const workspaceRootReal = await safeRealpath(workspaceRoot);
  const touchedPath = resolve(process.cwd(), filePath || ".");
  const touchedReal = await safeRealpath(touchedPath);
  if (!isWithinPath(workspaceRootReal, touchedReal) && !isWithinPath(workspaceRoot, touchedPath)) {
    throw new Error("rules_context_for_file path must stay within the current workspace");
  }
  return { workspaceRoot, touchedPath };
}

function normalizeForMatch(filePath) {
  return filePath.split(sep).join("/");
}

function globToRegExp(glob) {
  const normalized = String(glob || "").replace(/\\/g, "/");
  let out = "";
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    const next = normalized[i + 1];
    if (ch === "*" && next === "*") {
      if (normalized[i + 2] === "/") {
        out += "(?:.*/)?";
        i += 2;
      } else {
        out += ".*";
        i += 1;
      }
    } else if (ch === "*") {
      out += "[^/]*";
    } else if (ch === "?") {
      out += "[^/]";
    } else {
      out += ch.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }
  return new RegExp(`^${out}$`);
}

function matchesGlob(pattern, filePath) {
  return globToRegExp(pattern).test(normalizeForMatch(filePath));
}

function normalizePatternList(value) {
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((item) => String(item || "").split(","))
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function parseScalar(value) {
  const trimmed = String(value || "").trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^['"]|['"]$/g, "");
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---\n")) {
    return { metadata: {}, body: raw.trim() };
  }
  const end = raw.indexOf("\n---", 4);
  if (end === -1) {
    return { metadata: {}, body: raw.trim() };
  }
  const frontmatter = raw.slice(4, end).split("\n");
  const body = raw.slice(end + 4).trim();
  const metadata = {};
  let activeListKey = null;
  for (const line of frontmatter) {
    const listMatch = /^-\s+(.+)$/.exec(line.trim());
    if (listMatch && activeListKey) {
      if (!Array.isArray(metadata[activeListKey])) metadata[activeListKey] = [];
      metadata[activeListKey].push(parseScalar(listMatch[1]));
      continue;
    }
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (value === "") {
      metadata[key] = [];
      activeListKey = key;
    } else {
      metadata[key] = parseScalar(value);
      activeListKey = null;
    }
  }
  return { metadata, body };
}

function contentHash(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function shouldApplyRule(metadata, touchedPath, projectRoot, alwaysApply) {
  if (alwaysApply || metadata.alwaysApply === true) {
    return { applies: true, reason: "alwaysApply" };
  }
  const patterns = normalizePatternList(metadata.globs ?? metadata.applyTo);
  if (patterns.length === 0) return { applies: false };
  const relativePath = normalizeForMatch(relative(projectRoot, touchedPath));
  for (const pattern of patterns) {
    if (typeof pattern === "string" && pattern && matchesGlob(pattern, relativePath)) {
      return { applies: true, reason: `glob: ${pattern}` };
    }
  }
  return { applies: false };
}

async function discoverRuleCandidates(projectRoot, touchedPath) {
  const candidates = [];
  const seen = new Set();
  const projectRootReal = await safeRealpath(projectRoot);
  let currentDir = await startDirForTouchedPath(touchedPath);
  let distance = 0;

  while (true) {
    for (const source of PROJECT_RULE_SOURCES) {
      const ruleDir = join(currentDir, ...source.dirParts);
      if (await isSymlink(ruleDir)) continue;
      const ruleDirReal = await safeRealpath(ruleDir);
      if (!isWithinPath(projectRootReal, ruleDirReal)) continue;
      const files = await walkRuleFiles(ruleDir, source.extensions);
      for (const path of files) {
        const realPath = await safeRealpath(path);
        if (!isWithinPath(ruleDirReal, realPath)) continue;
        if (seen.has(realPath)) continue;
        seen.add(realPath);
        candidates.push({ path, realPath, source: source.label, distance, user: false, singleFile: false });
      }
    }
    if (currentDir === projectRoot) break;
    const parent = dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
    distance += 1;
  }

  for (const rule of SINGLE_FILE_RULES) {
    const path = join(projectRoot, ...rule.pathParts);
    if (!existsSync(path)) continue;
    if (await isSymlink(path)) continue;
    const baseDirReal = await safeRealpath(dirname(path));
    if (!isWithinPath(projectRootReal, baseDirReal)) continue;
    const realPath = await safeRealpath(path);
    if (!isWithinPath(baseDirReal, realPath)) continue;
    if (seen.has(realPath)) continue;
    seen.add(realPath);
    candidates.push({ path, realPath, source: rule.label, distance: 0, user: false, singleFile: true });
  }

  const userDir = join(homedir(), ".config", "oh-my-copilot", "rules");
  const userDirReal = await safeRealpath(userDir);
  const userFiles = await walkRuleFiles(userDir, RULE_EXTENSIONS);
  for (const path of userFiles) {
    const realPath = await safeRealpath(path);
    if (!isWithinPath(userDirReal, realPath)) continue;
    if (seen.has(realPath)) continue;
    seen.add(realPath);
    candidates.push({ path, realPath, source: "user-rules", distance: 9999, user: true, singleFile: false });
  }

  return candidates.sort((a, b) => a.distance - b.distance || a.path.localeCompare(b.path));
}

async function loadDedupe(sessionId) {
  const filePath = statePath(DEDUPE_DIR, `${normalizeSessionId(sessionId)}.json`);
  const parsed = await readJson(filePath, { realPaths: [], contentHashes: [] });
  return {
    filePath,
    realPaths: new Set(Array.isArray(parsed.realPaths) ? parsed.realPaths : []),
    contentHashes: new Set(Array.isArray(parsed.contentHashes) ? parsed.contentHashes : []),
  };
}

async function saveDedupe(dedupe) {
  await atomicWriteJson(dedupe.filePath, {
    realPaths: [...dedupe.realPaths],
    contentHashes: [...dedupe.contentHashes],
    updated_at: nowIso(),
  });
}

function pendingEmpty() {
  return { version: SCHEMA_VERSION, updated_at: null, entries: [] };
}

async function readPending() {
  const pending = await readJson(statePath(PENDING_FILE), pendingEmpty());
  return {
    version: pending.version ?? SCHEMA_VERSION,
    updated_at: pending.updated_at ?? null,
    entries: Array.isArray(pending.entries) ? pending.entries : [],
  };
}

async function writePending(pending) {
  pending.entries = pending.entries.slice(-MAX_PENDING_ENTRIES);
  pending.updated_at = nowIso();
  await atomicWriteJson(statePath(PENDING_FILE), pending);
  emitResourceUpdate(RULES_PENDING_URI);
}

async function appendPending(entry) {
  const pending = await readPending();
  const sanitized = {
    ...entry,
    rules: Array.isArray(entry.rules)
      ? entry.rules.map((rule) => ({ ...rule, content: redactSecrets(rule.content) }))
      : entry.rules,
  };
  pending.entries.push(sanitized);
  await writePending(pending);
}

function formatRuleContent(content) {
  if (content.length <= MAX_RULE_CONTENT) return content;
  return `${content.slice(0, MAX_RULE_CONTENT).trimEnd()}\n\n[truncated by OMCP rules policy]`;
}

async function matchedRulesForPath(filePath, { session_id, markInjected = true } = {}) {
  const { workspaceRoot: projectRoot, touchedPath } = await resolveTouchedPathInWorkspace(filePath);
  const candidates = await discoverRuleCandidates(projectRoot, touchedPath);
  const dedupe = await loadDedupe(session_id);
  const rules = [];

  for (const candidate of candidates) {
    if (markInjected && dedupe.realPaths.has(candidate.realPath)) continue;
    let raw = "";
    try {
      raw = await readFile(candidate.path, "utf8");
    } catch {
      continue;
    }
    const { metadata, body } = parseFrontmatter(raw);
    const match = shouldApplyRule(metadata, touchedPath, projectRoot, candidate.singleFile);
    if (!match.applies) continue;
    const hash = contentHash(body);
    if (markInjected && dedupe.contentHashes.has(hash)) continue;
    const rel = candidate.user ? candidate.path.replace(homedir(), "~") : relative(projectRoot, candidate.path);
    rules.push({
      relativePath: normalizeForMatch(rel),
      source: candidate.source,
      matchReason: match.reason,
      contentHash: hash,
      content: formatRuleContent(body),
    });
    if (markInjected) {
      dedupe.realPaths.add(candidate.realPath);
      dedupe.contentHashes.add(hash);
    }
  }

  if (markInjected && rules.length > 0) {
    await saveDedupe(dedupe);
  }

  return { projectRoot, touchedPath, rules };
}

export async function rulesContextForFile(args = {}) {
  const filePath = args.filePath || args.path || args.file_path;
  if (typeof filePath !== "string" || filePath.length === 0) {
    throw new Error("rules_context_for_file requires 'path' or 'filePath'");
  }
  const tool = String(args.tool || args.toolName || args.tool_name || "read").toLowerCase();
  if (args.requireFileTool !== false && !FILE_TOOL_NAMES.has(tool)) {
    return { ok: true, matched: 0, skipped: true, reason: "tool does not trigger rule lookup" };
  }
  const sessionId = args.session_id || args.sessionId || "default";
  const result = await matchedRulesForPath(filePath, {
    session_id: sessionId,
    markInjected: args.markPending !== false,
  });
  const entry = {
    id: `rules_${Date.now()}_${randomBytes(3).toString("hex")}`,
    ts: nowIso(),
    session_id: normalizeSessionId(sessionId),
    tool,
    file_path: normalizeForMatch(relative(result.projectRoot, result.touchedPath)),
    project_root: result.projectRoot,
    rules: result.rules,
  };
  if (args.markPending !== false && result.rules.length > 0) {
    await appendPending(entry);
  }
  return { ok: true, matched: result.rules.length, entry };
}

export async function rulesPendingRead(args = {}) {
  const pending = await readPending();
  let entries = pending.entries;
  const sessionId = args.session_id || args.sessionId;
  if (sessionId) {
    const normalized = normalizeSessionId(sessionId);
    entries = entries.filter((entry) => entry.session_id === normalized);
  }
  if (typeof args.limit === "number" && args.limit > 0) {
    entries = entries.slice(-args.limit);
  }
  const includeContent = Boolean(sessionId);
  if (!includeContent) {
    entries = entries.map((entry) => ({
      id: entry.id,
      ts: entry.ts,
      session_id: entry.session_id,
      tool: entry.tool,
      file_path: entry.file_path,
      rules: (entry.rules || []).map((rule) => ({
        relativePath: rule.relativePath,
        source: rule.source,
        matchReason: rule.matchReason,
        contentHash: rule.contentHash,
        content_redacted: true,
      })),
    }));
  } else {
    entries = entries.map((entry) => ({
      ...entry,
      rules: Array.isArray(entry.rules)
        ? entry.rules.map((rule) => ({ ...rule, content: redactSecrets(rule.content) }))
        : entry.rules,
    }));
  }
  return { version: pending.version, updated_at: pending.updated_at, entries };
}

export async function rulesPendingClear(args = {}) {
  const pending = await readPending();
  const sessionId = args.session_id || args.sessionId;
  if (!sessionId) {
    await writePending(pendingEmpty());
    return { ok: true, removed: pending.entries.length };
  }
  const normalized = normalizeSessionId(sessionId);
  const kept = pending.entries.filter((entry) => entry.session_id !== normalized);
  await writePending({ ...pending, entries: kept });
  return { ok: true, removed: pending.entries.length - kept.length };
}

export async function rulesPolicyReport(args = {}) {
  const requestedPath = args.path || args.filePath;
  const resolved = requestedPath
    ? await resolveTouchedPathInWorkspace(requestedPath)
    : { workspaceRoot: await findProjectRoot(process.cwd()), touchedPath: process.cwd() };
  const reportPath = resolved.touchedPath;
  const root = resolved.workspaceRoot;
  const counts = {};
  const discovered = await discoverRuleCandidates(root, reportPath);
  for (const candidate of discovered) {
    counts[candidate.source] = (counts[candidate.source] || 0) + 1;
  }
  const pending = await readPending();
  return {
    version: SCHEMA_VERSION,
    project_root: root,
    rule_sources: {
      project: PROJECT_RULE_SOURCES.map((source) => ({
        label: source.label,
        path: source.dirParts.join("/"),
      })),
      single_files: SINGLE_FILE_RULES.map((rule) => ({
        label: rule.label,
        path: rule.pathParts.join("/"),
      })),
      user: "~/.config/oh-my-copilot/rules",
    },
    discovered_counts: counts,
    pending_entries: pending.entries.length,
    policy: {
      rules: "Long-lived constraints matched lazily by touched file path.",
      projectMemory: ".omcp/project-memory.json stores durable facts, notes, and directives.",
      notepad: ".omcp/notepad.md stores short-lived priority/working/manual context.",
      wiki: ".omcp/wiki/ stores reviewable markdown knowledge queried by keyword/tag.",
      sharedMemory: ".omcp/shared-memory/ stores cross-agent coordination messages.",
    },
  };
}

export async function _clearRulesStateForTests() {
  await rm(statePath(STATE_DIR, "rules-pending.json"), { force: true }).catch(() => {});
  await rm(statePath(DEDUPE_DIR), { recursive: true, force: true }).catch(() => {});
}

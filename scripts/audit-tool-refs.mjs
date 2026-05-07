#!/usr/bin/env node
// Audit MCP tool references in skills/ and agents/ against server.mjs
// registrations. Emits three lists:
//   (a) referenced-but-not-registered (must be empty for omcp tools)
//   (b) registered-but-never-referenced (informational)
//   (c) cross-host allowlist matches (per file)
//
// Reads scripts/audit-tool-refs.allowlist.json for cross-host file rules.
// Exits non-zero if list (a) contains any tool not covered by the allowlist.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const SKILLS_DIR = join(REPO_ROOT, "packages/copilot-cli-plugin/skills");
const AGENTS_DIR = join(REPO_ROOT, "packages/copilot-cli-plugin/agents");
const SERVER_MJS = join(
  REPO_ROOT,
  "packages/copilot-cli-plugin/mcp-server/server.mjs",
);
const ALLOWLIST_PATH = join(REPO_ROOT, "scripts/audit-tool-refs.allowlist.json");

const TOOL_REF_PATTERNS = [
  /mcp__omcp__([a-z][a-z0-9_]*)/g,
  /ToolSearch\(query="select:([^"]+)"\)/g,
  /ToolSearch\(query='select:([^']+)'\)/g,
];

function walkMarkdown(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walkMarkdown(full));
    } else if (entry.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function extractRefs(content) {
  const tools = new Set();
  for (const pat of TOOL_REF_PATTERNS) {
    pat.lastIndex = 0;
    let match;
    while ((match = pat.exec(content)) !== null) {
      const captured = match[1];
      if (pat.source.includes("ToolSearch")) {
        // captured is comma-separated list of "mcp__omcp__<tool>" or other prefixes
        for (const part of captured.split(",")) {
          const trimmed = part.trim();
          const m = trimmed.match(/^mcp__omcp__([a-z][a-z0-9_]*)/);
          if (m) tools.add(m[1]);
        }
      } else {
        tools.add(captured);
      }
    }
  }
  return tools;
}

function extractRegisteredTools(serverSrc) {
  // A tool registration is `{ name: "X", description: ..., inputSchema: ... }`.
  // The server constructor `new Server({ name: "omcp", version: ... })` also
  // matches a bare `name:` regex, so require `description:` on a following line
  // to distinguish.
  const tools = new Set();
  const re = /\bname:\s*"([a-z][a-z0-9_]*)"\s*,?\s*\n\s*description\s*:/g;
  let match;
  while ((match = re.exec(serverSrc)) !== null) {
    tools.add(match[1]);
  }
  return tools;
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return {};
  try {
    return JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
  } catch (err) {
    console.error(`error reading allowlist: ${err.message}`);
    return {};
  }
}

function fileSlug(path) {
  // Skill files live at .../skills/<slug>/SKILL.md → slug
  // Agent files at .../agents/<name>.agent.md → name
  const rel = relative(REPO_ROOT, path);
  const skillMatch = rel.match(/skills\/([^/]+)\/SKILL\.md$/);
  if (skillMatch) return skillMatch[1];
  const agentMatch = rel.match(/agents\/([^/]+)\.agent\.md$/);
  if (agentMatch) return agentMatch[1];
  return rel;
}

function main() {
  const serverSrc = readFileSync(SERVER_MJS, "utf8");
  const registered = extractRegisteredTools(serverSrc);

  const skillFiles = walkMarkdown(SKILLS_DIR);
  const agentFiles = walkMarkdown(AGENTS_DIR);
  const allFiles = [...skillFiles, ...agentFiles];

  const allowlist = loadAllowlist();

  const referencedAll = new Set();
  const refsByFile = new Map();
  for (const file of allFiles) {
    const content = readFileSync(file, "utf8");
    const refs = extractRefs(content);
    if (refs.size === 0) continue;
    refsByFile.set(file, refs);
    for (const t of refs) referencedAll.add(t);
  }

  const listA = []; // referenced-but-not-registered (excluded by allowlist)
  const listC = []; // cross-host allowlist matches
  for (const [file, refs] of refsByFile) {
    const slug = fileSlug(file);
    const allowed = allowlist[slug];
    for (const tool of refs) {
      if (registered.has(tool)) continue;
      if (allowed && (allowed.includes("*") || allowed.includes(tool))) {
        listC.push({ file: relative(REPO_ROOT, file), slug, tool });
      } else {
        listA.push({ file: relative(REPO_ROOT, file), slug, tool });
      }
    }
  }

  const listB = [...registered].filter((t) => !referencedAll.has(t)).sort();

  // Print report
  console.log(`# audit-tool-refs report`);
  console.log(``);
  console.log(`Files scanned: ${allFiles.length} (${skillFiles.length} skills, ${agentFiles.length} agents)`);
  console.log(`Tools referenced (unique): ${referencedAll.size}`);
  console.log(`Tools registered (server.mjs): ${registered.size}`);
  console.log(``);

  console.log(`## (a) referenced-but-not-registered (BLOCKING)`);
  if (listA.length === 0) {
    console.log(`(empty — pass)`);
  } else {
    for (const r of listA) {
      console.log(`- ${r.file}: ${r.tool}`);
    }
  }
  console.log(``);

  console.log(`## (b) registered-but-never-referenced (informational)`);
  if (listB.length === 0) {
    console.log(`(empty)`);
  } else {
    for (const t of listB) console.log(`- ${t}`);
  }
  console.log(``);

  console.log(`## (c) cross-host allowlist matches`);
  if (listC.length === 0) {
    console.log(`(empty)`);
  } else {
    for (const r of listC) {
      console.log(`- ${r.file}: ${r.tool}`);
    }
  }
  console.log(``);

  if (listA.length > 0) {
    console.error(
      `FAIL: ${listA.length} tool reference(s) not registered in server.mjs and not allowlisted.`,
    );
    process.exit(1);
  }
  console.log(`OK: every referenced tool is either registered or allowlisted.`);
}

main();

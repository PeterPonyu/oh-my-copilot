// orchestration-refs.mjs — COPILOT-7 shared orchestration-reference checker.
//
// Verifies that every skill's `orchestrates-agents` entries resolve to a real
// agent and that every `next-skill` resolves to a real skill. Returns a list
// of human-readable error strings (empty when all references resolve), so the
// failure surfaces at validation/load time instead of at user runtime when a
// dispatcher tries to resolve a dangling reference.
//
// Dependency-free and side-effect-free so it can be imported by both the
// plugin orchestration validator and its unit tests.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";

function read(path) {
  return readFileSync(path, "utf8");
}

function listSkillFiles(skillsDir) {
  if (!existsSync(skillsDir)) return [];
  const result = [];
  for (const entry of readdirSync(skillsDir)) {
    const skillFile = join(skillsDir, entry, "SKILL.md");
    if (existsSync(skillFile) && statSync(skillFile).isFile()) {
      result.push(skillFile);
    }
  }
  return result.sort();
}

function parseFrontmatter(path) {
  const text = read(path);
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---", 4);
  if (end === -1) return {};
  const block = text.slice(4, end);
  const data = {};
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes(":")) continue;
    const idx = line.indexOf(":");
    data[line.slice(0, idx).trim()] = line
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return data;
}

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Check orchestration references for an entire plugin tree.
 * @param {string} pluginRoot path to packages/copilot-cli-plugin
 * @returns {string[]} error messages; empty when every reference resolves
 */
export function checkOrchestrationRefs(pluginRoot) {
  const skillsDir = join(pluginRoot, "skills");
  const agentsDir = join(pluginRoot, "agents");

  const agentIds = new Set(
    existsSync(agentsDir)
      ? readdirSync(agentsDir)
          .filter((entry) => entry.endsWith(".agent.md"))
          .map((entry) => basename(entry, ".agent.md"))
      : [],
  );

  const skillFiles = listSkillFiles(skillsDir);
  const skillIds = new Set(skillFiles.map((file) => basename(dirname(file))));

  const errors = [];
  for (const file of skillFiles) {
    const id = basename(dirname(file));
    const data = parseFrontmatter(file);
    for (const agent of parseList(data["orchestrates-agents"])) {
      if (!agentIds.has(agent)) {
        errors.push(`skills/${id}/SKILL.md orchestrates-agents references missing agent: ${agent}`);
      }
    }
    const nextSkill = String(data["next-skill"] || "").trim();
    if (nextSkill && !skillIds.has(nextSkill)) {
      errors.push(`skills/${id}/SKILL.md next-skill references missing skill: ${nextSkill}`);
    }
  }
  return errors;
}

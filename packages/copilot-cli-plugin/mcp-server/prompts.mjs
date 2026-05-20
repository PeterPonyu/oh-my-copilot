// MCP Prompts primitive for omcp.
//
// Exposes every skill under packages/copilot-cli-plugin/skills/<name>/SKILL.md
// as an MCP prompt template, so non-Copilot-CLI MCP clients (Claude Code,
// Cursor, Continue, etc.) can retrieve and run omcp skills via the standard
// prompts/list and prompts/get protocol.
//
// Each prompt accepts a single free-form `args` argument (mirroring how
// Copilot CLI passes argument text to a skill). The skill body is returned
// verbatim with the caller's args appended in an "Arguments provided by
// caller" section so the LLM can incorporate them.
//
// Functions are pure and accept an optional `skillsDir` for testability.
// server.mjs binds them to ListPromptsRequestSchema and GetPromptRequestSchema.

import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const NAME_RE = /^[a-z0-9][a-z0-9_-]*$/;

function defaultSkillsDir() {
  // Resolve to ../skills relative to this module, which works whether the
  // server runs from source (mcp-server/server.mjs), the bundled dist
  // (mcp-server/dist/server.mjs), or the installed plugin cache.
  const here = dirname(fileURLToPath(import.meta.url));
  // From source layout: here = .../mcp-server, parent = .../copilot-cli-plugin
  // From dist layout:   here = .../mcp-server/dist, parent = .../mcp-server
  // Probe both candidates.
  const candidates = [
    join(here, "..", "skills"),
    join(here, "..", "..", "skills"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: text };
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.+)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    fm[kv[1]] = v;
  }
  return { fm, body: m[2] };
}

export async function listPrompts(skillsDir = defaultSkillsDir()) {
  if (!existsSync(skillsDir)) return { prompts: [] };

  const entries = await readdir(skillsDir, { withFileTypes: true });
  const prompts = [];

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const skillPath = join(skillsDir, e.name, "SKILL.md");
    if (!existsSync(skillPath)) continue;
    const text = await readFile(skillPath, "utf8");
    const { fm } = parseFrontmatter(text);
    const name = fm.name || e.name;
    const description = fm.description || `omcp skill: ${name}`;
    const argHint = fm["argument-hint"] || "";
    prompts.push({
      name,
      description,
      arguments: [
        {
          name: "args",
          description: argHint
            ? `Arguments for the skill. argument-hint: ${argHint}`
            : "Arguments to pass to the skill (optional)",
          required: false,
        },
      ],
    });
  }

  prompts.sort((a, b) => a.name.localeCompare(b.name));
  return { prompts };
}

export async function getPrompt(
  { name, arguments: args } = {},
  skillsDir = defaultSkillsDir()
) {
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("prompts/get requires non-empty 'name'");
  }
  if (!NAME_RE.test(name)) {
    throw new Error(`invalid prompt name: ${name}`);
  }

  const skillPath = join(skillsDir, name, "SKILL.md");
  if (!existsSync(skillPath)) {
    throw new Error(`prompt not found: ${name}`);
  }

  const text = await readFile(skillPath, "utf8");
  const { fm, body } = parseFrontmatter(text);

  let promptText = body.trim();
  const userArgs =
    args && typeof args === "object" && typeof args.args === "string"
      ? args.args.trim()
      : "";
  if (userArgs.length > 0) {
    promptText += `\n\n## Arguments provided by caller\n\n${userArgs}\n`;
  }

  return {
    description: fm.description || `omcp skill: ${name}`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: promptText,
        },
      },
    ],
  };
}

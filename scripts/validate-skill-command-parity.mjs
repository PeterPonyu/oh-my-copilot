#!/usr/bin/env node
// validate-skill-command-parity.mjs — COPILOT-8 parity CI gate.
//
// Asserts skill <-> command parity so the surface inventory cannot silently
// drift:
//   1. Every skill whose frontmatter `user-invocable` is not `false` has a
//      matching `commands/<id>.md` file.
//   2. Every command has a matching `skills/<id>/SKILL.md`.
//   3. The lone non-invocable `reference` skill is the ONLY skill without a
//      command (no other skill may quietly lack a command).
//   4. Live counts match the README's stated numbers
//      (22 agents / 46 skills / 45 commands).
//
// Dependency-free so it runs in CI before any install. Accepts overrides so a
// unit test can point it at a synthetic plugin tree:
//   --plugin-root <dir>   plugin package root (default: packages/copilot-cli-plugin)
//   --readme <file>       README path for the count cross-check
//                         (pass "none" to skip the README cross-check)
//
// Exits 0 when parity holds; exits 1 (and prints FAIL lines) otherwise.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");

function parseArgs(argv) {
  const opts = {
    pluginRoot: join(REPO_ROOT, "packages", "copilot-cli-plugin"),
    readme: join(REPO_ROOT, "README.md"),
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--plugin-root") {
      opts.pluginRoot = resolve(argv[++i]);
    } else if (arg === "--readme") {
      const value = argv[++i];
      opts.readme = value === "none" ? null : resolve(value);
    } else if (arg === "-h" || arg === "--help") {
      opts.help = true;
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return opts;
}

function read(path) {
  return readFileSync(path, "utf8");
}

function listSkillIds(skillsDir) {
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir)
    .filter((entry) => {
      const full = join(skillsDir, entry);
      return statSync(full).isDirectory() && existsSync(join(full, "SKILL.md"));
    })
    .sort();
}

function listCommandIds(commandsDir) {
  if (!existsSync(commandsDir)) return [];
  return readdirSync(commandsDir)
    .filter((entry) => entry.endsWith(".md") && statSync(join(commandsDir, entry)).isFile())
    .map((entry) => basename(entry, ".md"))
    .sort();
}

function countAgents(agentsDir) {
  if (!existsSync(agentsDir)) return 0;
  return readdirSync(agentsDir).filter((entry) => entry.endsWith(".agent.md")).length;
}

// Minimal frontmatter reader: returns the value of a scalar key, or undefined.
function frontmatterValue(skillPath, key) {
  const text = read(skillPath);
  if (!text.startsWith("---\n")) return undefined;
  const end = text.indexOf("\n---", 4);
  if (end === -1) return undefined;
  const block = text.slice(4, end);
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes(":")) continue;
    const idx = line.indexOf(":");
    const k = line.slice(0, idx).trim();
    if (k === key) {
      return line
        .slice(idx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  }
  return undefined;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(
      "Usage: node scripts/validate-skill-command-parity.mjs [--plugin-root <dir>] [--readme <file|none>]",
    );
    process.exit(0);
  }

  const skillsDir = join(opts.pluginRoot, "skills");
  const commandsDir = join(opts.pluginRoot, "commands");
  const agentsDir = join(opts.pluginRoot, "agents");

  const errors = [];
  const fail = (msg) => errors.push(msg);

  const skillIds = listSkillIds(skillsDir);
  const commandIds = listCommandIds(commandsDir);
  const commandSet = new Set(commandIds);
  const skillSet = new Set(skillIds);

  // Classify each skill by user-invocable.
  const invocableSkills = [];
  const nonInvocableSkills = [];
  for (const id of skillIds) {
    const value = frontmatterValue(join(skillsDir, id, "SKILL.md"), "user-invocable");
    if (String(value).toLowerCase() === "false") {
      nonInvocableSkills.push(id);
    } else {
      invocableSkills.push(id);
    }
  }

  // 1. Every user-invocable skill has a command.
  for (const id of invocableSkills) {
    if (!commandSet.has(id)) {
      fail(`skill '${id}' is user-invocable but has no commands/${id}.md`);
    }
  }

  // 2. Every command has a matching skill.
  for (const id of commandIds) {
    if (!skillSet.has(id)) {
      fail(`command '${id}.md' has no matching skills/${id}/SKILL.md`);
    }
  }

  // 3. The lone non-invocable `reference` skill is the ONLY skill without a
  //    command.
  const skillsWithoutCommand = skillIds.filter((id) => !commandSet.has(id));
  if (skillsWithoutCommand.length !== 1 || skillsWithoutCommand[0] !== "reference") {
    fail(
      `exactly one skill ('reference') may lack a command; found without commands: [${skillsWithoutCommand.join(", ")}]`,
    );
  }
  if (nonInvocableSkills.length !== 1 || nonInvocableSkills[0] !== "reference") {
    fail(
      `'reference' must be the only user-invocable:false skill; found non-invocable: [${nonInvocableSkills.join(", ")}]`,
    );
  }

  // 4. Counts match the README's stated numbers.
  const liveAgents = countAgents(agentsDir);
  const liveSkills = skillIds.length;
  const liveCommands = commandIds.length;

  let claimedAgents;
  let claimedSkills;
  let claimedCommands;
  if (opts.readme) {
    const readme = read(opts.readme);
    const leadRe = /(\d+)\s+agents,\s+(\d+)\s+skills,\s+(\d+)\s+typed slash commands/;
    const match = readme.match(leadRe);
    if (!match) {
      fail(
        'README lead sentence must state "NN agents, NN skills, NN typed slash commands"',
      );
    } else {
      claimedAgents = Number(match[1]);
      claimedSkills = Number(match[2]);
      claimedCommands = Number(match[3]);
      if (claimedAgents !== liveAgents) {
        fail(`README claims ${claimedAgents} agents but live inventory has ${liveAgents}`);
      }
      if (claimedSkills !== liveSkills) {
        fail(`README claims ${claimedSkills} skills but live inventory has ${liveSkills}`);
      }
      if (claimedCommands !== liveCommands) {
        fail(
          `README claims ${claimedCommands} slash commands but live inventory has ${liveCommands}`,
        );
      }
    }
  }

  if (errors.length) {
    console.error("skill <-> command parity validation FAILED");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`ok: parity — ${liveSkills} skills, ${liveCommands} commands, ${liveAgents} agents`);
  console.log(
    "ok: every user-invocable skill has a command; 'reference' is the only non-invocable skill",
  );
  if (opts.readme) {
    console.log(
      `ok: README counts match live inventory (${claimedAgents}/${claimedSkills}/${claimedCommands})`,
    );
  }
  console.log("ok: skill-command parity validates");
}

main();

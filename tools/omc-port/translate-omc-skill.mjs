#!/usr/bin/env node
// translate-omc-skill.mjs
//
// Wave 4.5 translator: structurally translate an oh-my-claudecode (OMC) SKILL.md
// to its oh-my-copilot (OMX) equivalent. Deterministic, idempotent, no external
// deps (Node built-ins only).
//
// Usage:
//   node translate-omc-skill.mjs <input-skill-dir> <output-skill-dir> [--check] [--audit-log <path>]
//
// Exit codes (see docs/pipeline-dispatch-contract.md §6):
//   0  success or already-translated no-op
//   1  input not found
//   2  output dir conflict
//   3  manual-decision required (unknown agent in Task call)
//   4  --check mode found drift

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, statSync } from "node:fs";
import { join, resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Constants -- canonical strings live in ONE place so contract + impl agree.
// ---------------------------------------------------------------------------

const SENTINEL = "<!-- omc-port-translated: v1 -->";
const PROVENANCE_PREFIX = "<!-- source: ";
const PROVENANCE_SUFFIX = " | wave: 4.5 -->";

// Wave 3 v1 MCP tool surface (see contract §7).
const V1_MCP_TOOLS = new Set([
  "state_read",
  "state_write",
  "state_list",
  "notepad_read",
  "notepad_write",
  "plan_list",
]);

// V1 agent port list. Wave 4 produces ≥15 agents; this is the closed allowlist
// the translator checks for Task() targets. Anything outside this list forces
// exit code 3 ("fail loud") per the contract.
const V1_AGENTS = new Set([
  "explore",
  "analyst",
  "planner",
  "architect",
  "debugger",
  "executor",
  "verifier",
  "tracer",
  "security-reviewer",
  "code-reviewer",
  "test-engineer",
  "designer",
  "writer",
  "qa-tester",
  "scientist",
  "document-specialist",
  "git-master",
  "code-simplifier",
  "critic",
  "research",
]);

const AUDIT_LOG_PATH_FROM_REPO_ROOT = ".omc/state/_omc-port-translations.jsonl";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = argv.slice(2);
  const positional = [];
  let check = false;
  let auditLog = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--check") {
      check = true;
    } else if (a === "--audit-log") {
      if (i + 1 >= args.length) {
        die(1, "--audit-log requires a path argument");
      }
      auditLog = args[++i];
    } else if (a.startsWith("--")) {
      die(1, `Unknown flag: ${a}`);
    } else {
      positional.push(a);
    }
  }
  if (positional.length !== 2) {
    die(
      1,
      "Usage: node translate-omc-skill.mjs <input-skill-dir> <output-skill-dir> [--check] [--audit-log <path>]"
    );
  }
  return { input: positional[0], output: positional[1], check, auditLog };
}

function die(code, msg) {
  process.stderr.write(`translate-omc-skill: ${msg}\n`);
  process.exit(code);
}

// ---------------------------------------------------------------------------
// Frontmatter split / reassemble
// ---------------------------------------------------------------------------

function splitFrontmatter(text) {
  // Returns { frontmatter: string|null, body: string }.
  // Frontmatter is the leading "---\n...\n---" block if present.
  const lines = text.split("\n");
  if (lines.length < 2 || lines[0].trim() !== "---") {
    return { frontmatter: null, body: text };
  }
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) {
    return { frontmatter: null, body: text };
  }
  const frontmatter = lines.slice(0, endIdx + 1).join("\n");
  const body = lines.slice(endIdx + 1).join("\n");
  return { frontmatter, body };
}

function stripFrontmatterField(frontmatter, field) {
  // Drop a top-level key like "model:" or "tools:" (single-line value only;
  // multi-line YAML values for these fields are not expected per contract).
  const re = new RegExp(`^${field}:.*\\n?`, "gm");
  const before = frontmatter;
  const after = before.replace(re, "");
  return { frontmatter: after, dropped: before !== after };
}

// ---------------------------------------------------------------------------
// Body transformations
// ---------------------------------------------------------------------------

// Each replacement records: { lineNumber, before, after } so the diff stays
// deterministic and reviewable.

function applySkillCalls(body, replacements) {
  // Skill("oh-my-claudecode:<X>")  ->  [Run /<X> to continue the pipeline]
  // followed by a TODO marker on its own line.
  const re = /Skill\(\s*["']oh-my-claudecode:([a-zA-Z0-9_\-]+)["']\s*\)/g;
  return replaceWithLineTracking(body, re, replacements, (m, slug) => {
    const handoff = `[Run /${slug} to continue the pipeline]`;
    const todo = `<!-- TODO: P0/P1 skill ${slug} may need its slash command in commands/${slug}.md (Wave 6) -->`;
    return `${handoff}\n${todo}`;
  });
}

function buildBacktickRanges(body) {
  // Return an array of [start, end] index pairs for inline backtick code spans.
  // Handles single and multi-backtick spans (including fenced blocks).
  const ranges = [];
  const re = /`+/g;
  let match;
  let openTick = null;
  while ((match = re.exec(body)) !== null) {
    if (openTick === null) {
      openTick = { len: match[0].length, start: match.index };
    } else if (match[0].length === openTick.len) {
      ranges.push([openTick.start, match.index + match[0].length - 1]);
      openTick = null;
    }
  }
  return ranges;
}

function isInsideBacktick(index, ranges) {
  for (const [s, e] of ranges) {
    if (index >= s && index <= e) return true;
  }
  return false;
}

function applyTaskCalls(body, replacements) {
  // Task(subagent_type="oh-my-claudecode:<Y>", model=<M>) -> [Delegate to the <Y> agent]
  // If <Y> not in V1_AGENTS, surface exit code 3 via thrown sentinel error.
  // Matches inside backtick code spans are skipped (they are prose/example text, not live calls).
  const re =
    /Task\(\s*subagent_type\s*=\s*["']oh-my-claudecode:([a-zA-Z0-9_\-]+)["'][^)]*\)/g;
  const btRanges = buildBacktickRanges(body);

  // Pre-scan: collect all match positions so we know which are in backtick spans.
  const backtickOnlyAgents = new Set();
  const liveAgents = new Set();
  {
    const scanRe = /Task\(\s*subagent_type\s*=\s*["']oh-my-claudecode:([a-zA-Z0-9_\-]+)["'][^)]*\)/g;
    let m;
    while ((m = scanRe.exec(body)) !== null) {
      const agent = m[1];
      if (isInsideBacktick(m.index, btRanges)) {
        backtickOnlyAgents.add(agent);
      } else {
        liveAgents.add(agent);
      }
    }
  }

  return replaceWithLineTracking(body, re, replacements, (m, agent) => {
    if (!V1_AGENTS.has(agent)) {
      // Only throw exit-3 if this agent appears as a live (non-backtick) Task call.
      if (liveAgents.has(agent)) {
        const err = new Error(
          `unknown agent in Task() call: "${agent}" (not in v1 agent list)`
        );
        err.exitCode = 3;
        throw err;
      }
      // Agent only appears inside backtick spans (prose/example) — emit TODO comment.
      return `${m} <!-- TODO: agent ${agent} not in v1 list; appears in example/prose only -->`;
    }
    const handoff = `[Delegate to the ${agent} agent]`;
    const todo = `<!-- TODO: agent ${agent} must be in agents/${agent}.agent.md (Wave 4) -->`;
    return `${handoff}\n${todo}`;
  });
}

function applyMcpTools(body, replacements) {
  // mcp__plugin_oh-my-claudecode_t__<tool>  ->  mcp__omcp__<tool>
  // Emit TODO marker if tool is outside V1_MCP_TOOLS.
  const re = /mcp__plugin_oh-my-claudecode_t__([a-zA-Z0-9_]+)/g;
  return replaceWithLineTracking(body, re, replacements, (m, tool) => {
    const out = `mcp__omcp__${tool}`;
    if (V1_MCP_TOOLS.has(tool)) {
      return out;
    }
    return `${out} <!-- TODO: MCP tool ${tool} not in v1 server -->`;
  });
}

function applyNamespaceProse(body, replacements) {
  // Last pass: any leftover "oh-my-claudecode:" string in commentary becomes
  // "oh-my-copilot:". This runs AFTER the primitive passes so it cannot eat
  // strings the primitive matchers were going to consume.
  const re = /oh-my-claudecode:/g;
  return replaceWithLineTracking(body, re, replacements, () => "oh-my-copilot:");
}

function replaceWithLineTracking(body, regex, replacements, replacer) {
  // Scan the body in a single left-to-right pass and rebuild it. Track the
  // line number (1-indexed within the body) of each replacement so the diff
  // log is deterministic.
  let out = "";
  let lastIndex = 0;
  let match;
  // We need a fresh regex with global flag; assume caller passes /g already.
  while ((match = regex.exec(body)) !== null) {
    const before = match[0];
    const after = replacer(...match);
    const upTo = body.slice(lastIndex, match.index);
    out += upTo;
    // Compute 1-indexed line number for match.index in the ORIGINAL body.
    const lineNumber = body.slice(0, match.index).split("\n").length;
    replacements.push({ lineNumber, before, after });
    out += after;
    lastIndex = match.index + before.length;
    // Guard against zero-width matches.
    if (match.index === regex.lastIndex) regex.lastIndex++;
  }
  out += body.slice(lastIndex);
  return out;
}

// ---------------------------------------------------------------------------
// Diff log
// ---------------------------------------------------------------------------

function buildDiffMd(replacements, sourceRel) {
  // Sort deterministically: by line number ascending, then by `before` lexically.
  const sorted = [...replacements].sort((a, b) => {
    if (a.lineNumber !== b.lineNumber) return a.lineNumber - b.lineNumber;
    if (a.before < b.before) return -1;
    if (a.before > b.before) return 1;
    return 0;
  });
  const lines = [
    `# OMC -> OMX translation diff`,
    ``,
    `Source: ${sourceRel}`,
    `Replacements: ${sorted.length}`,
    ``,
  ];
  for (const r of sorted) {
    lines.push(`- line ${r.lineNumber}: \`${r.before}\` -> \`${r.after.replace(/\n/g, "\\n")}\``);
  }
  if (sorted.length === 0) {
    lines.push(`_(no replacements were necessary)_`);
  }
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Audit log (the only place a timestamp appears)
// ---------------------------------------------------------------------------

function findRepoRoot(startDir) {
  // Walk upward looking for .omc/ (repo root anchor for provenance paths).
  // Falls back to startDir if not found.
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, ".omc"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return startDir;
    dir = parent;
  }
}

function findPluginRoot(startDir) {
  // Walk upward looking for package.json (plugin root for audit log default).
  // Falls back to startDir if not found.
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return startDir;
    dir = parent;
  }
}

function appendAudit(auditPath, entry) {
  try {
    mkdirSync(dirname(auditPath), { recursive: true });
    appendFileSync(auditPath, JSON.stringify(entry) + "\n", "utf8");
  } catch (e) {
    // Audit failure must not corrupt translation output; warn only.
    process.stderr.write(`translate-omc-skill: audit append failed: ${e.message}\n`);
  }
}

// ---------------------------------------------------------------------------
// Main translation
// ---------------------------------------------------------------------------

function isAlreadyTranslated(body) {
  // First non-blank body line must be the sentinel.
  const lines = body.split("\n");
  for (const ln of lines) {
    if (ln.trim() === "") continue;
    return ln.trim() === SENTINEL;
  }
  return false;
}

function translate(inputDir, opts) {
  const inputSkill = join(inputDir, "SKILL.md");
  if (!existsSync(inputSkill)) {
    die(1, `input SKILL.md not found at ${inputSkill}`);
  }
  const raw = readFileSync(inputSkill, "utf8");
  const { frontmatter, body } = splitFrontmatter(raw);

  if (isAlreadyTranslated(body)) {
    return { alreadyTranslated: true, output: raw, diff: null, replacementCount: 0 };
  }

  // Frontmatter cleanup: drop model: / tools: (Copilot CLI does not have them).
  let fm = frontmatter ?? "";
  let droppedModel = false;
  let droppedTools = false;
  if (fm) {
    ({ frontmatter: fm, dropped: droppedModel } = stripFrontmatterField(fm, "model"));
    ({ frontmatter: fm, dropped: droppedTools } = stripFrontmatterField(fm, "tools"));
  }
  if (droppedModel) {
    process.stderr.write(`translate-omc-skill: dropped frontmatter field 'model:' (not in Copilot contract)\n`);
  }
  if (droppedTools) {
    process.stderr.write(`translate-omc-skill: dropped frontmatter field 'tools:' (not in Copilot contract)\n`);
  }

  // Body transformations in fixed order (see contract §3.1).
  const replacements = [];
  let translated = body;
  translated = applySkillCalls(translated, replacements);
  translated = applyTaskCalls(translated, replacements);
  translated = applyMcpTools(translated, replacements);
  translated = applyNamespaceProse(translated, replacements);

  // Build provenance line. Path is relative to the INPUT's nearest repo root
  // (walk up from inputDir), so it stays stable regardless of caller cwd.
  // This is required for byte-identical fixture goldens.
  const repoRoot = findRepoRoot(inputDir);
  let sourceRel = relative(repoRoot, resolve(inputSkill));
  if (sourceRel.startsWith("..")) sourceRel = resolve(inputSkill);

  // Insert sentinel + provenance as the first two body lines (after a blank if frontmatter present).
  const header = `${SENTINEL}\n${PROVENANCE_PREFIX}${sourceRel}${PROVENANCE_SUFFIX}\n`;
  // Preserve a single leading newline after frontmatter for readability.
  const bodyOut = translated.startsWith("\n")
    ? `\n${header}${translated.replace(/^\n+/, "")}`
    : `${header}${translated}`;

  const finalText = fm ? `${fm}\n${bodyOut}` : bodyOut;
  const diffMd = buildDiffMd(replacements, sourceRel);

  return {
    alreadyTranslated: false,
    output: finalText,
    diff: diffMd,
    replacementCount: replacements.length,
    sourceRel,
  };
}

// ---------------------------------------------------------------------------
// Output writing + --check drift detection
// ---------------------------------------------------------------------------

function writeOutput(outputDir, result) {
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (e) {
    die(2, `cannot create output dir ${outputDir}: ${e.message}`);
  }
  if (!statSync(outputDir).isDirectory()) {
    die(2, `output path is not a directory: ${outputDir}`);
  }
  const skillPath = join(outputDir, "SKILL.md");
  const diffPath = join(outputDir, "_omc-port-diff.md");
  writeFileSync(skillPath, result.output, "utf8");
  if (result.diff !== null) {
    writeFileSync(diffPath, result.diff, "utf8");
  }
}

function readIfExists(p) {
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

function main() {
  const { input, output, check, auditLog } = parseArgs(process.argv);
  const inputDir = resolve(input);
  const outputDir = resolve(output);

  let result;
  try {
    result = translate(inputDir, { check });
  } catch (e) {
    if (e && typeof e.exitCode === "number") {
      die(e.exitCode, e.message);
    }
    throw e;
  }

  if (result.alreadyTranslated) {
    // No-op semantics: still materialize the destination SKILL.md so downstream
    // tooling sees a consistent output dir. Idempotent (input bytes == output bytes).
    if (!check) {
      try {
        mkdirSync(outputDir, { recursive: true });
      } catch (e) {
        die(2, `cannot create output dir ${outputDir}: ${e.message}`);
      }
      writeFileSync(join(outputDir, "SKILL.md"), result.output, "utf8");
    } else {
      const existing = readIfExists(join(outputDir, "SKILL.md"));
      if (existing !== result.output) {
        process.stderr.write("check: drift detected (already-translated input does not match destination)\n");
        process.exit(4);
      }
    }
    process.stdout.write("no-op (already translated)\n");
    process.exit(0);
  }

  if (check) {
    // Drift mode: compare what we WOULD write against what is already at <output>.
    const existingSkill = readIfExists(join(outputDir, "SKILL.md"));
    const existingDiff = readIfExists(join(outputDir, "_omc-port-diff.md"));
    if (existingSkill === result.output && existingDiff === result.diff) {
      process.stdout.write("check: no drift\n");
      process.exit(0);
    }
    process.stderr.write("check: drift detected between expected output and destination\n");
    process.exit(4);
  }

  writeOutput(outputDir, result);

  // Audit log -- the only place a timestamp appears.
  // Use explicit --audit-log path if provided; otherwise derive from output dir's nearest
  // package.json ancestor so the log always lands in the correct repo (not a parent .omc/).
  const resolvedAuditLog = auditLog
    ? resolve(auditLog)
    : join(findPluginRoot(outputDir), AUDIT_LOG_PATH_FROM_REPO_ROOT);
  appendAudit(resolvedAuditLog, {
    timestamp: new Date().toISOString(),
    input: inputDir,
    output: outputDir,
    replacements: result.replacementCount,
  });

  process.stdout.write(
    `translated: ${result.replacementCount} replacement(s) -> ${join(outputDir, "SKILL.md")}\n`
  );
  process.exit(0);
}

// Only run if invoked directly (not imported).
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main();
}

export { translate, splitFrontmatter, V1_AGENTS, V1_MCP_TOOLS, SENTINEL };

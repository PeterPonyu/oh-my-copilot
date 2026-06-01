#!/usr/bin/env node
// validate-skill-receipts.mjs
//
// COPILOT-3 — verification-receipt enforcement.
//
// Scans the agent-orchestrating pipeline skills and asserts that each one
// declares the provenance/receipt contract used by the spec → plan → artifact
// pipeline:
//   - produced-by: <skill>
//   - produced-at: <ISO-8601 UTC timestamp>
//   - pipeline-stage: <stage>
//   - a documented pipeline-state transition recording via
//     mcp__omcp__pipeline_record_transition into .omcp/state/pipeline-state.json
//
// It also asserts that the ai-slop-cleaner quality step is wired into the
// post-artifact orchestrating skills (autopilot, ultrawork, ralph) so that the
// COPILOT-4 integration cannot silently regress.
//
// This validator is intentionally dependency-free, deterministic, and offline:
// it only reads files under the repository and never touches the network or
// the installed plugin cache. It mirrors the runtime assertions in
// scripts/smoke-copilot-cli.sh (Wave 7) but checks the *declared* contract in
// the skill sources rather than a live pipeline run.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const PLUGIN_ROOT = join(REPO_ROOT, "packages", "copilot-cli-plugin");
const SKILLS_DIR = join(PLUGIN_ROOT, "skills");

// Pipeline stage skills that MUST declare the full provenance/receipt contract.
// stage is the pipeline-stage value each skill stamps on its output artifact.
const PROVENANCE_SKILLS = [
  { id: "deep-interview", stage: "spec" },
  { id: "ralplan", stage: "plan" },
  { id: "autopilot", stage: "artifact" },
];

// Post-artifact orchestrating skills that MUST wire the ai-slop-cleaner
// quality step (COPILOT-4) so the cleanup pass cannot silently regress.
const AI_SLOP_SKILLS = ["autopilot", "ultrawork", "ralph"];

const errors = [];
const notes = [];

function rel(path) {
  return relative(REPO_ROOT, path);
}

function fail(message) {
  errors.push(message);
}

function note(message) {
  notes.push(message);
}

function read(path) {
  return readFileSync(path, "utf8");
}

function skillPath(id) {
  return join(SKILLS_DIR, id, "SKILL.md");
}

// Assert each pipeline-stage skill declares the provenance frontmatter fields
// and documents the pipeline-state transition recording.
function checkProvenanceContract() {
  for (const { id, stage } of PROVENANCE_SKILLS) {
    const path = skillPath(id);
    if (!existsSync(path)) {
      fail(`provenance skill missing: ${rel(path)}`);
      continue;
    }
    const text = read(path);

    if (!text.includes(`produced-by: ${id}`)) {
      fail(`${rel(path)} must declare \`produced-by: ${id}\` in its provenance contract`);
    }
    if (!/produced-at:\s*<ISO-8601/.test(text)) {
      fail(`${rel(path)} must declare \`produced-at: <ISO-8601 ...>\` in its provenance contract`);
    }
    if (!text.includes(`pipeline-stage: ${stage}`)) {
      fail(`${rel(path)} must declare \`pipeline-stage: ${stage}\` for the ${id} stage`);
    }
    if (!text.includes("mcp__omcp__pipeline_record_transition")) {
      fail(`${rel(path)} must document the pipeline transition via mcp__omcp__pipeline_record_transition`);
    }
    if (!text.includes(".omcp/state/pipeline-state.json")) {
      fail(`${rel(path)} must document that the transition is recorded in .omcp/state/pipeline-state.json`);
    }
    note(`provenance receipt declared: ${id} (pipeline-stage: ${stage})`);
  }
}

// Assert the ai-slop-cleaner quality step is wired into the post-artifact
// orchestrating skills (COPILOT-4).
function checkAiSlopIntegration() {
  for (const id of AI_SLOP_SKILLS) {
    const path = skillPath(id);
    if (!existsSync(path)) {
      fail(`ai-slop integration skill missing: ${rel(path)}`);
      continue;
    }
    const text = read(path);
    if (!text.includes("ai-slop-cleaner")) {
      fail(`${rel(path)} must wire the ai-slop-cleaner quality step (COPILOT-4)`);
    }
    if (!/Skill\(["']ai-slop-cleaner["']\)/.test(text)) {
      fail(`${rel(path)} must invoke ai-slop-cleaner via the Skill tool: Skill("ai-slop-cleaner")`);
    }
    note(`ai-slop-cleaner quality step wired: ${id}`);
  }
}

// Assert the orchestration docs and release checklist document the contract,
// so the receipt + cleanup story stays discoverable.
function checkDocumentation() {
  const orchestrationDoc = join(REPO_ROOT, "docs", "plugin-internal", "orchestration.md");
  if (!existsSync(orchestrationDoc)) {
    fail(`missing orchestration doc: ${rel(orchestrationDoc)}`);
  } else {
    const text = read(orchestrationDoc);
    for (const snippet of [
      "Provenance frontmatter contract",
      "pipeline-state.json",
      "ai-slop-cleaner",
    ]) {
      if (!text.includes(snippet)) {
        fail(`${rel(orchestrationDoc)} must document "${snippet}"`);
      }
    }
    note("orchestration doc documents provenance + ai-slop-cleaner");
  }

  const releaseChecklist = join(REPO_ROOT, "docs", "release-checklist.md");
  if (!existsSync(releaseChecklist)) {
    fail(`missing release checklist: ${rel(releaseChecklist)}`);
  } else {
    const text = read(releaseChecklist);
    for (const snippet of ["validate-skill-receipts.mjs", "ai-slop-cleaner"]) {
      if (!text.includes(snippet)) {
        fail(`${rel(releaseChecklist)} must reference "${snippet}"`);
      }
    }
    note("release checklist references receipts validator + ai-slop-cleaner");
  }
}

function main() {
  if (!existsSync(SKILLS_DIR)) {
    fail(`missing skills directory: ${rel(SKILLS_DIR)}`);
  }

  checkProvenanceContract();
  checkAiSlopIntegration();
  checkDocumentation();

  if (errors.length) {
    console.error("Skill receipt validation FAILED");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  for (const item of notes) console.log(`ok: ${item}`);
  console.log("ok: provenance/receipt contract and ai-slop-cleaner quality step validate");
}

main();

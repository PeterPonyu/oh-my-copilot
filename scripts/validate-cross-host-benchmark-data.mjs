#!/usr/bin/env node
// Validate generated cross-host benchmark harvest outputs.
// Port of scripts/validate-cross-host-benchmark-data.py.

import { readFileSync, statSync, realpathSync } from "node:fs";
import { resolve, isAbsolute, join } from "node:path";
import { homedir } from "node:os";

const REQUIRED_RECORD_KEYS = new Set([
  "repo",
  "branch",
  "sha",
  "timestamp",
  "sourcePath",
  "outputDir",
  "profile",
  "variant",
  "score",
  "maxScore",
  "thresholdScore",
  "passed",
  "releaseBlocking",
  "comparisonClass",
  "comparabilityClass",
  "comparabilityNote",
  "harvestTimestamp",
  "dimensions",
  "provenance",
]);

const VALID_COMPARABILITY_CLASSES = new Set([
  "outcome-comparable",
  "reporting-comparable",
  "not-comparable",
]);

function parseArgs(argv) {
  const args = { appRoot: "apps/cross-host-benchmark-site" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      console.log("usage: validate-cross-host-benchmark-data.mjs [--app-root PATH]");
      console.log("\nValidate generated cross-host benchmark harvest outputs.");
      process.exit(0);
    } else if (arg === "--app-root") {
      args.appRoot = argv[++i];
    } else if (arg.startsWith("--app-root=")) {
      args.appRoot = arg.slice("--app-root=".length);
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return args;
}

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

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isoToMs(value) {
  return Date.parse(value.replace("Z", "+00:00"));
}

function ensure(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function sortedSetString(set) {
  return JSON.stringify([...set].sort());
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function validateRecord(record, label) {
  const recordKeys = new Set(Object.keys(record));
  const missing = [];
  for (const key of REQUIRED_RECORD_KEYS) {
    if (!recordKeys.has(key)) missing.push(key);
  }
  missing.sort();
  ensure(missing.length === 0, `${label} missing keys: ${JSON.stringify(missing)}`);
  ensure(record.comparisonClass === "observed", `${label} comparisonClass must be observed`);
  ensure(
    VALID_COMPARABILITY_CLASSES.has(record.comparabilityClass),
    `${label} comparabilityClass must be one of ${sortedSetString(VALID_COMPARABILITY_CLASSES)}`,
  );
  ensure(
    record.comparabilityClass === "reporting-comparable",
    `${label} current cross-host comparability must default to reporting-comparable`,
  );
  const note = record.comparabilityNote;
  ensure(
    typeof note === "string" && note.trim().length > 0,
    `${label} comparabilityNote must be a non-empty string`,
  );
  ensure(note.includes("repo-native"), `${label} comparabilityNote must mention repo-native harness context`);
  ensure(
    note.includes("mechanism-equivalent") || note.includes("reporting"),
    `${label} comparabilityNote must explain why the row is not a mechanism-equivalent comparison`,
  );
  ensure(
    Array.isArray(record.dimensions) && record.dimensions.length > 0,
    `${label} dimensions must be non-empty list`,
  );
  ensure(
    record.provenance !== null && typeof record.provenance === "object" && !Array.isArray(record.provenance),
    `${label} provenance must be an object`,
  );
  for (const key of ["historyPath", "evaluationPath", "reportPath"]) {
    ensure(key in record.provenance, `${label} provenance missing ${key}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const appRoot = resolveAbs(args.appRoot);
  const generatedRoot = join(appRoot, "generated");
  const manifestPath = join(generatedRoot, "manifest.json");
  const copilotPath = join(generatedRoot, "copilot-snapshots.json");
  const cursorPath = join(generatedRoot, "cursor-snapshots.json");

  ensure(isFile(manifestPath), `missing manifest: ${manifestPath}`);
  ensure(isFile(copilotPath), `missing copilot snapshots: ${copilotPath}`);
  ensure(isFile(cursorPath), `missing cursor snapshots: ${cursorPath}`);

  const manifest = loadJson(manifestPath);
  const copilot = loadJson(copilotPath);
  const cursor = loadJson(cursorPath);

  ensure(
    Array.isArray(copilot) && copilot.length > 0,
    `expected at least 1 copilot record, got ${Array.isArray(copilot) ? copilot.length : typeof copilot}`,
  );
  ensure(
    Array.isArray(cursor) && cursor.length > 0,
    `expected at least 1 cursor record, got ${Array.isArray(cursor) ? cursor.length : typeof cursor}`,
  );
  ensure(
    manifest.generator.version === 2,
    `expected generator version 2, got ${manifest.generator.version}`,
  );
  ensure(manifest.repos.length === 2, `expected 2 manifest repos, got ${manifest.repos.length}`);
  ensure(manifest.artifacts.length === 3, `expected 3 manifest artifacts, got ${manifest.artifacts.length}`);
  ensure(
    manifest.comparisonPolicy.comparisonClass === "observed",
    "manifest comparisonPolicy must preserve observed comparisonClass",
  );
  ensure(
    manifest.comparisonPolicy.defaultComparabilityClass === "reporting-comparable",
    "manifest default comparability class must be reporting-comparable",
  );
  ensure(
    manifest.comparisonPolicy.currentPairingClass === "reporting-comparable",
    "manifest current pairing class must be reporting-comparable",
  );
  ensure(
    setsEqual(new Set(manifest.comparisonPolicy.allowedComparabilityClasses), VALID_COMPARABILITY_CLASSES),
    "manifest allowed comparability classes must match the canonical set",
  );
  ensure(
    manifest.captureSkew.comparabilityClass === "reporting-comparable",
    "captureSkew comparabilityClass must stay reporting-comparable",
  );

  const expectedSkew = Math.abs(
    Math.trunc(
      (isoToMs(manifest.captureSkew.copilotTimestamp) - isoToMs(manifest.captureSkew.cursorTimestamp)) / 1000,
    ),
  );
  ensure(
    manifest.captureSkew.seconds === expectedSkew,
    `capture skew seconds must match manifest timestamps (${expectedSkew}), got ${manifest.captureSkew.seconds}`,
  );

  copilot.forEach((record, idx) => validateRecord(record, `copilot[${idx + 1}]`));
  cursor.forEach((record, idx) => validateRecord(record, `cursor[${idx + 1}]`));

  for (const repoEntry of manifest.repos) {
    for (const key of [
      "repo",
      "root",
      "sourceBranch",
      "sourceSha",
      "workspaceBranch",
      "workspaceSha",
      "harvestedAt",
      "historyPath",
      "recordCount",
      "snapshotPath",
      "comparabilityClass",
      "comparabilityNote",
    ]) {
      ensure(key in repoEntry, `manifest repo entry missing ${key}`);
    }
    ensure(
      repoEntry.comparabilityClass === "reporting-comparable",
      `${repoEntry.repo} manifest entry must be reporting-comparable`,
    );
    ensure(
      typeof repoEntry.comparabilityNote === "string" && repoEntry.comparabilityNote.trim().length > 0,
      `${repoEntry.repo} manifest entry needs a non-empty comparabilityNote`,
    );
  }

  console.log("ok: generated manifest exists and includes 2 repos / 3 artifacts");
  console.log(`ok: copilot snapshot count is ${copilot.length} and cursor snapshot count is ${cursor.length}`);
  console.log(`ok: capture skew is internally consistent (${manifest.captureSkew.seconds} seconds)`);
  console.log("ok: comparisonClass remains observed while comparabilityClass defaults to reporting-comparable");
  console.log("ok: snapshot records include provenance + truthful comparability metadata");
  console.log("ok: cross-host generated harvest validation complete");
  return 0;
}

process.exit(main());

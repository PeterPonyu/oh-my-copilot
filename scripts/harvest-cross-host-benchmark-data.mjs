#!/usr/bin/env node
// Harvest Copilot/Cursor benchmark artifacts into app-local generated snapshots.
// Port of scripts/harvest-cross-host-benchmark-data.py. Preserves CLI args,
// stdout schema, exit codes, and generated JSON shape.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, realpathSync } from "node:fs";
import { resolve, dirname, join, relative, isAbsolute, sep } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";

const VALID_COMPARABILITY_CLASSES = [
  "outcome-comparable",
  "reporting-comparable",
  "not-comparable",
];

function utcNow() {
  // Match Python's datetime.now(timezone.utc).replace(microsecond=0).isoformat()
  // with the '+00:00' suffix swapped for 'Z'.
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function runGit(root, ...args) {
  const proc = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
  });
  if (proc.status !== 0) {
    const stderr = (proc.stderr || "").trim();
    throw new Error(`git ${args.join(" ")} failed in ${root}: ${stderr}`);
  }
  return (proc.stdout || "").trim();
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadJsonl(path) {
  const text = readFileSync(path, "utf8");
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim()) out.push(JSON.parse(line));
  }
  return out;
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

function relativeDisplay(path, root) {
  const absPath = resolveAbs(path);
  const absRoot = resolveAbs(root);
  const rel = relative(absRoot, absPath);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
    return absPath;
  }
  return rel;
}

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

// Glob support: only what the current call sites need.
//   "current-*/**/*_evaluation.json"
// Pattern semantics mirror Python's Path.glob:
//   '*' matches any single path segment (no slashes),
//   '**' matches zero or more path segments,
//   literal text matches literally.
function globMatch(rootDir, pattern) {
  const segments = pattern.split("/").filter((s) => s.length > 0);
  const results = [];
  walkGlob(rootDir, segments, 0, results);
  results.sort();
  return results;
}

function segmentToRegex(segment) {
  // Convert a single glob segment to a regex (no slashes).
  let re = "";
  for (const ch of segment) {
    if (ch === "*") re += "[^/]*";
    else if (ch === "?") re += "[^/]";
    else if (/[.+^$|()[\]{}\\]/.test(ch)) re += "\\" + ch;
    else re += ch;
  }
  return new RegExp("^" + re + "$");
}

function walkGlob(currentDir, segments, segIdx, results) {
  if (segIdx >= segments.length) {
    return;
  }
  const segment = segments[segIdx];
  const isLast = segIdx === segments.length - 1;

  if (segment === "**") {
    // Match zero or more directory levels — try advancing past '**' from the
    // current directory, then descend into each subdirectory and retry.
    walkGlob(currentDir, segments, segIdx + 1, results);
    let entries;
    try {
      entries = readdirSync(currentDir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(currentDir, entry);
      if (isDir(full)) {
        walkGlob(full, segments, segIdx, results);
      }
    }
    return;
  }

  const re = segmentToRegex(segment);
  let entries;
  try {
    entries = readdirSync(currentDir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!re.test(entry)) continue;
    const full = join(currentDir, entry);
    if (isLast) {
      if (isFile(full) || isDir(full)) {
        results.push(full);
      }
    } else if (isDir(full)) {
      walkGlob(full, segments, segIdx + 1, results);
    }
  }
}

function latestHistoryByOutputDir(entries) {
  const latest = {};
  for (const entry of entries) {
    latest[entry.output_dir] = entry;
  }
  return latest;
}

function comparabilityNote(repoName, evaluation) {
  const profile = evaluation.profile;
  const variant = evaluation.variant;
  return (
    `${repoName} ${profile}/${variant} stays an observed repo-native benchmark row. ` +
    "It is safe for cross-host reporting, but it is not a mechanism-equivalent harness match."
  );
}

function withSuffix(path, newSuffix) {
  // Mimic Path.with_suffix: replace the final extension (or append if none).
  const base = path.replace(/\.[^./\\]*$/, "");
  return base + newSuffix;
}

function collectRepoHarvest(repoRoot, repoName, evaluationGlob) {
  const benchmarkRoot = join(repoRoot, "benchmark", "results");
  const historyPath = join(benchmarkRoot, "history.jsonl");
  const historyEntries = loadJsonl(historyPath);
  const historyByDir = latestHistoryByOutputDir(historyEntries);
  const harvestedAt = utcNow();
  const workspaceBranch = runGit(repoRoot, "branch", "--show-current");
  const workspaceSha = runGit(repoRoot, "rev-parse", "--short", "HEAD");

  const records = [];
  const evaluationPaths = globMatch(benchmarkRoot, evaluationGlob);
  for (const evaluationPath of evaluationPaths) {
    const evaluation = loadJson(evaluationPath);
    const outputDir = relative(repoRoot, dirname(evaluationPath));
    const historyEntry = historyByDir[outputDir];
    if (historyEntry === undefined) {
      console.error(`missing history entry for ${repoName} output dir: ${outputDir}`);
      process.exit(1);
    }

    const currentComparabilityClass = "reporting-comparable";
    records.push({
      repo: repoName,
      branch: historyEntry.git_branch,
      sha: historyEntry.git_sha,
      timestamp: historyEntry.timestamp,
      sourcePath: outputDir,
      outputDir: outputDir,
      profile: evaluation.profile,
      variant: evaluation.variant,
      score: evaluation.score,
      maxScore: evaluation.max_score,
      thresholdScore: evaluation.threshold_score,
      passed: evaluation.passed,
      releaseBlocking: evaluation.release_blocking,
      comparisonClass: "observed",
      comparabilityClass: currentComparabilityClass,
      comparabilityNote: comparabilityNote(repoName, evaluation),
      harvestTimestamp: harvestedAt,
      dimensions: evaluation.dimensions,
      provenance: {
        historyPath: relativeDisplay(historyPath, repoRoot),
        evaluationPath: relativeDisplay(evaluationPath, repoRoot),
        reportPath: relativeDisplay(withSuffix(evaluationPath, ".md"), repoRoot),
      },
    });
  }

  const latestEntry = historyEntries.reduce((acc, entry) =>
    acc === null || isoToMs(entry.timestamp) > isoToMs(acc.timestamp) ? entry : acc,
  null);

  return {
    repo: repoName,
    root: resolveAbs(repoRoot),
    sourceBranch: latestEntry.git_branch,
    sourceSha: latestEntry.git_sha,
    workspaceBranch,
    workspaceSha,
    harvestedAt,
    historyPath: relativeDisplay(historyPath, repoRoot),
    records,
  };
}

function isoToMs(value) {
  // Python: datetime.fromisoformat(value.replace('Z', '+00:00'))
  return Date.parse(value.replace("Z", "+00:00"));
}

function buildManifest(appRoot, copilot, cursor) {
  const latestCopilot = copilot.records.reduce((acc, r) =>
    acc === null || isoToMs(r.timestamp) > isoToMs(acc.timestamp) ? r : acc,
  null);
  const latestCursor = cursor.records.reduce((acc, r) =>
    acc === null || isoToMs(r.timestamp) > isoToMs(acc.timestamp) ? r : acc,
  null);
  const diffMs = isoToMs(latestCopilot.timestamp) - isoToMs(latestCursor.timestamp);
  const skewSeconds = Math.abs(Math.trunc(diffMs / 1000));
  const generatedRoot = join(appRoot, "generated");
  const defaultComparabilityClass = "reporting-comparable";

  return {
    generatedAt: utcNow(),
    generator: {
      script: "scripts/harvest-cross-host-benchmark-data.mjs",
      version: 2,
    },
    outputRoot: resolveAbs(generatedRoot),
    comparisonPolicy: {
      comparisonClass: "observed",
      defaultComparabilityClass,
      currentPairingClass: defaultComparabilityClass,
      allowedComparabilityClasses: [...VALID_COMPARABILITY_CLASSES],
      summary:
        "Cross-host benchmark rows remain observed measurements. " +
        "Current Copilot/Cursor pairings are reporting-comparable by default because " +
        "the repos use different repo-native harnesses.",
    },
    repos: [
      {
        repo: copilot.repo,
        root: copilot.root,
        sourceBranch: copilot.sourceBranch,
        sourceSha: copilot.sourceSha,
        workspaceBranch: copilot.workspaceBranch,
        workspaceSha: copilot.workspaceSha,
        harvestedAt: copilot.harvestedAt,
        historyPath: copilot.historyPath,
        recordCount: copilot.records.length,
        snapshotPath: "apps/cross-host-benchmark-site/generated/copilot-snapshots.json",
        comparabilityClass: defaultComparabilityClass,
        comparabilityNote:
          "Copilot rows stay observed inside the Copilot CLI benchmark harness and are " +
          "reported cross-host without claiming a mechanism-identical Cursor harness.",
      },
      {
        repo: cursor.repo,
        root: cursor.root,
        sourceBranch: cursor.sourceBranch,
        sourceSha: cursor.sourceSha,
        workspaceBranch: cursor.workspaceBranch,
        workspaceSha: cursor.workspaceSha,
        harvestedAt: cursor.harvestedAt,
        historyPath: cursor.historyPath,
        recordCount: cursor.records.length,
        snapshotPath: "apps/cross-host-benchmark-site/generated/cursor-snapshots.json",
        comparabilityClass: defaultComparabilityClass,
        comparabilityNote:
          "Cursor rows stay observed inside the smaller repo-native backbone harness and " +
          "are reported cross-host without claiming Copilot-equivalent mechanics.",
      },
    ],
    captureSkew: {
      copilotTimestamp: latestCopilot.timestamp,
      cursorTimestamp: latestCursor.timestamp,
      seconds: skewSeconds,
      minutes: Math.round((skewSeconds / 60) * 100) / 100,
      comparabilityClass: defaultComparabilityClass,
      comparisonPair: {
        copilot: `${latestCopilot.profile}/${latestCopilot.variant}`,
        cursor: `${latestCursor.profile}/${latestCursor.variant}`,
      },
    },
    artifacts: [
      {
        kind: "snapshot",
        repo: "oh-my-copilot",
        path: "apps/cross-host-benchmark-site/generated/copilot-snapshots.json",
        records: copilot.records.length,
      },
      {
        kind: "snapshot",
        repo: "oh-my-cursor",
        path: "apps/cross-host-benchmark-site/generated/cursor-snapshots.json",
        records: cursor.records.length,
      },
      {
        kind: "manifest",
        repo: "cross-host",
        path: "apps/cross-host-benchmark-site/generated/manifest.json",
        records: 1,
      },
    ],
  };
}

function writeJson(path, payload) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

function parseArgs(argv) {
  const args = {
    copilotRoot: ".",
    cursorRoot: null,
    appRoot: "apps/cross-host-benchmark-site",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      console.log(
        "usage: harvest-cross-host-benchmark-data.mjs [--copilot-root PATH] [--cursor-root PATH] [--app-root PATH]",
      );
      console.log("\nHarvest Copilot/Cursor benchmark artifacts into app-local generated snapshots.");
      console.log("\nOptions:");
      console.log("  --copilot-root PATH  path to oh-my-copilot repo (default: .)");
      console.log("  --cursor-root PATH   path to oh-my-cursor repo (required; auto-resolved to");
      console.log("                       ../oh-my-cursor relative to --copilot-root if omitted)");
      console.log("  --app-root PATH      path to the benchmark site app, relative to --copilot-root");
      console.log("                       (default: apps/cross-host-benchmark-site)");
      process.exit(0);
    } else if (arg === "--copilot-root") {
      args.copilotRoot = argv[++i];
    } else if (arg.startsWith("--copilot-root=")) {
      args.copilotRoot = arg.slice("--copilot-root=".length);
    } else if (arg === "--cursor-root") {
      args.cursorRoot = argv[++i];
    } else if (arg.startsWith("--cursor-root=")) {
      args.cursorRoot = arg.slice("--cursor-root=".length);
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

function resolveCursorRoot(args) {
  if (args.cursorRoot !== null) {
    return resolveAbs(args.cursorRoot);
  }
  // Auto-resolve: look for ../oh-my-cursor relative to the copilot repo root.
  const copilotRoot = resolveAbs(args.copilotRoot);
  const candidate = resolve(copilotRoot, "..", "oh-my-cursor");
  if (isDir(candidate)) {
    return resolveAbs(candidate);
  }
  console.error(
    "error: --cursor-root is required. " +
    `Auto-resolve candidate '${candidate}' does not exist. ` +
    "Pass --cursor-root PATH explicitly.",
  );
  process.exit(2);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const copilotRoot = resolveAbs(args.copilotRoot);
  const cursorRoot = resolveCursorRoot(args);
  const appRoot = resolveAbs(join(copilotRoot, args.appRoot));

  const copilot = collectRepoHarvest(copilotRoot, "oh-my-copilot", "current-*/**/*_evaluation.json");
  const cursor = collectRepoHarvest(cursorRoot, "oh-my-cursor", "current-*/**/*_evaluation.json");
  const manifest = buildManifest(appRoot, copilot, cursor);

  writeJson(join(appRoot, "generated", "copilot-snapshots.json"), copilot.records);
  writeJson(join(appRoot, "generated", "cursor-snapshots.json"), cursor.records);
  writeJson(join(appRoot, "generated", "manifest.json"), manifest);

  console.log("generated: apps/cross-host-benchmark-site/generated/copilot-snapshots.json");
  console.log("generated: apps/cross-host-benchmark-site/generated/cursor-snapshots.json");
  console.log("generated: apps/cross-host-benchmark-site/generated/manifest.json");
  console.log(`capture-skew-seconds: ${manifest.captureSkew.seconds}`);
  console.log(`pairing-comparability-class: ${manifest.comparisonPolicy.currentPairingClass}`);
  return 0;
}

process.exit(main());

import copilotSnapshots from "../../generated/copilot-snapshots.json";
import cursorSnapshots from "../../generated/cursor-snapshots.json";
import manifestJson from "../../generated/manifest.json";
import { adaptCopilotPresentation } from "./adapters/copilot";
import { adaptCursorPresentation } from "./adapters/cursor";
import { buildComparativePresentation } from "./presentation/primitives";
import type {
  BenchmarkRunSnapshot,
  CheckStatus,
  GeneratedManifest,
  ProcessArtifactSnapshot,
  RepoPresentationModel,
  RepoSnapshotBundle,
  StateCheckSnapshot,
} from "./presentation/contracts";

type SnapshotDimension = {
  name: string;
  description?: string;
  required?: boolean;
  passed?: boolean;
  evidence?: string;
};

type HarvestedRecord = {
  repo: "oh-my-copilot" | "oh-my-cursor";
  branch: string;
  sha: string;
  timestamp: string;
  sourcePath: string;
  outputDir: string;
  profile: string;
  variant: string;
  score: number;
  maxScore: number;
  thresholdScore: number;
  passed: boolean;
  releaseBlocking: boolean;
  comparisonClass: BenchmarkRunSnapshot["comparisonClass"];
  comparabilityClass: BenchmarkRunSnapshot["comparabilityClass"];
  comparabilityNote: string;
  harvestTimestamp: string;
  dimensions: SnapshotDimension[];
};

const manifest = manifestJson as GeneratedManifest;
const harvestedCopilot = copilotSnapshots as HarvestedRecord[];
const harvestedCursor = cursorSnapshots as HarvestedRecord[];

const toTitleCase = (value: string): string =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const toStatus = (passed: boolean | undefined, required: boolean | undefined): CheckStatus => {
  if (passed) {
    return "pass";
  }
  return required ? "fail" : "warn";
};

const toSummary = (dimension: SnapshotDimension): string => {
  const firstEvidenceLine = dimension.evidence?.split("\n").find((line) => line.trim().length);
  return firstEvidenceLine ?? dimension.description ?? `${toTitleCase(dimension.name)} is recorded in the harvested benchmark evidence.`;
};

const toBenchmarkRun = (record: HarvestedRecord): BenchmarkRunSnapshot => ({
  repo: record.repo,
  branch: record.branch,
  sha: record.sha,
  timestamp: record.timestamp,
  sourcePath: record.sourcePath,
  harvestedAt: record.harvestTimestamp,
  comparisonClass: record.comparisonClass,
  comparabilityClass: record.comparabilityClass,
  comparabilityNote: record.comparabilityNote,
  profile: record.profile,
  variant: record.variant,
  score: record.score,
  maxScore: record.maxScore,
  thresholdScore: record.thresholdScore,
  passed: record.passed,
  actualDelta: undefined,
  baselineLabel: undefined,
  expectedBaselineScore: undefined,
});

const toStateChecks = (records: HarvestedRecord[]): StateCheckSnapshot[] => {
  const latest = [...records].sort((left, right) => right.timestamp.localeCompare(left.timestamp))[0];
  return latest.dimensions.map((dimension) => ({
    name: dimension.name,
    label: toTitleCase(dimension.name),
    status: toStatus(dimension.passed, dimension.required),
    timestamp: latest.timestamp,
    proofLink: latest.sourcePath,
    summary: toSummary(dimension),
    required: Boolean(dimension.required),
  }));
};

const toProcessArtifacts = (
  repo: HarvestedRecord["repo"],
  records: HarvestedRecord[],
  snapshotPath: string,
): ProcessArtifactSnapshot[] => {
  const latest = [...records].sort((left, right) => right.timestamp.localeCompare(left.timestamp))[0];
  return [
    {
      id: `${repo}-latest-report`,
      kind: "validation",
      label: `${toTitleCase(latest.profile)} ${latest.variant} benchmark report`,
      timestamp: latest.timestamp,
      proofLink: latest.sourcePath,
      summary: `${latest.score}/${latest.maxScore} with ${latest.comparabilityClass} comparability metadata.`,
    },
    {
      id: `${repo}-cross-host-harvest`,
      kind: "history",
      label: "Cross-host harvest snapshot",
      timestamp: latest.harvestTimestamp,
      proofLink: snapshotPath,
      summary: `${records.length} observed rows were harvested with ${latest.comparabilityClass} semantics.`,
    },
  ];
};

const buildBundle = (
  repo: HarvestedRecord["repo"],
  displayName: string,
  records: HarvestedRecord[],
): RepoSnapshotBundle => {
  const repoManifest = manifest.repos.find((entry) => entry.repo === repo);
  if (!repoManifest) {
    throw new Error(`Missing manifest entry for ${repo}.`);
  }

  return {
    repo,
    displayName,
    benchmarkRuns: records.map(toBenchmarkRun),
    stateChecks: toStateChecks(records),
    processArtifacts: toProcessArtifacts(repo, records, repoManifest.snapshotPath),
  };
};

export const buildSitePresentation = (): {
  manifest: GeneratedManifest;
  presentations: RepoPresentationModel[];
  compare: ReturnType<typeof buildComparativePresentation>;
} => {
  const presentations = [
    adaptCopilotPresentation(buildBundle("oh-my-copilot", "oh-my-copilot", harvestedCopilot)),
    adaptCursorPresentation(buildBundle("oh-my-cursor", "oh-my-cursor", harvestedCursor)),
  ];

  return {
    manifest,
    presentations,
    compare: buildComparativePresentation(presentations),
  };
};

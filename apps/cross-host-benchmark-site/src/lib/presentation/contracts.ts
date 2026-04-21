export type RepoId = "oh-my-copilot" | "oh-my-cursor";

export type ComparisonClass =
  | "observed"
  | "configured-floor"
  | "repo-native"
  | "narrative-only";

export type ComparabilityClass =
  | "outcome-comparable"
  | "reporting-comparable"
  | "not-comparable";

export type CheckStatus = "pass" | "fail" | "warn";

export type TimelineKind =
  | "benchmark"
  | "validation"
  | "install"
  | "state"
  | "smoke"
  | "history";

export interface ProvenanceRecord {
  repo: RepoId;
  branch: string;
  sha: string;
  timestamp: string;
  sourcePath: string;
  harvestedAt: string;
  comparisonClass: ComparisonClass;
  comparabilityClass: ComparabilityClass;
  comparabilityNote: string;
}

export interface BenchmarkRunSnapshot extends ProvenanceRecord {
  profile: string;
  variant: string;
  score: number;
  maxScore: number;
  thresholdScore: number;
  passed: boolean;
  baselineLabel?: string;
  expectedBaselineScore?: number;
  actualDelta?: number;
}

export interface StateCheckSnapshot {
  name: string;
  label: string;
  status: CheckStatus;
  timestamp: string;
  proofLink: string;
  summary: string;
  required: boolean;
}

export interface ProcessArtifactSnapshot {
  id: string;
  kind: TimelineKind;
  label: string;
  timestamp: string;
  proofLink: string;
  summary: string;
}

export interface RepoSnapshotBundle {
  repo: RepoId;
  displayName: string;
  benchmarkRuns: BenchmarkRunSnapshot[];
  stateChecks: StateCheckSnapshot[];
  processArtifacts: ProcessArtifactSnapshot[];
}

export interface RepoScoreCard {
  id: string;
  profile: string;
  variant: string;
  scoreLabel: string;
  gateLabel: string;
  callout: string;
  deltaLabel: string | null;
  comparisonClass: ComparisonClass;
  comparabilityClass: ComparabilityClass;
  comparabilityNote: string;
  provenance: Pick<
    BenchmarkRunSnapshot,
    "branch" | "sha" | "timestamp" | "sourcePath" | "harvestedAt"
  >;
}

export interface StateConfidenceRow {
  name: string;
  label: string;
  status: CheckStatus;
  timestamp: string;
  proofLink: string;
  summary: string;
  required: boolean;
}

export interface StateConfidenceCard {
  label: string;
  summary: string;
  tone: "strong" | "mixed" | "caution";
  requiredPassed: number;
  requiredTotal: number;
  rows: StateConfidenceRow[];
}

export interface TimelineItem {
  id: string;
  repo: RepoId;
  label: string;
  timestamp: string;
  kind: TimelineKind;
  detail: string;
  proofLink: string;
}

export interface RepoPresentationModel {
  repo: RepoId;
  displayName: string;
  plainLanguageSummary: string;
  scoreCards: RepoScoreCard[];
  stateConfidence: StateConfidenceCard;
  timeline: TimelineItem[];
  repoNativeWarning: string;
}

export interface ComparisonCard {
  repo: RepoId;
  displayName: string;
  headline: string;
  supportingDetail: string;
  deltaLabel: string | null;
  comparabilityClass: ComparabilityClass;
  comparabilityNote: string;
}

export interface ComparativePresentationModel {
  mode: "repo-native";
  warning: string;
  cards: ComparisonCard[];
}

export interface GeneratedManifestRepo {
  repo: RepoId;
  root: string;
  sourceBranch: string;
  sourceSha: string;
  workspaceBranch: string;
  workspaceSha: string;
  harvestedAt: string;
  historyPath: string;
  recordCount: number;
  snapshotPath: string;
  comparabilityClass: ComparabilityClass;
  comparabilityNote: string;
}

export interface GeneratedManifest {
  generatedAt: string;
  generator: {
    script: string;
    version: number;
  };
  outputRoot: string;
  comparisonPolicy: {
    comparisonClass: ComparisonClass;
    defaultComparabilityClass: ComparabilityClass;
    currentPairingClass: ComparabilityClass;
    allowedComparabilityClasses: ComparabilityClass[];
    summary: string;
  };
  repos: GeneratedManifestRepo[];
  captureSkew: {
    copilotTimestamp: string;
    cursorTimestamp: string;
    seconds: number;
    minutes: number;
    comparabilityClass: ComparabilityClass;
    comparisonPair: {
      copilot: string;
      cursor: string;
    };
  };
  artifacts: Array<{
    kind: string;
    repo: string;
    path: string;
    records: number;
  }>;
}

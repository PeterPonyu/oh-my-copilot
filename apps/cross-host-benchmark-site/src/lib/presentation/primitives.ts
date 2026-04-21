import type {
  BenchmarkRunSnapshot,
  ComparativePresentationModel,
  ComparisonCard,
  RepoPresentationModel,
  RepoScoreCard,
  RepoSnapshotBundle,
  StateConfidenceCard,
  StateConfidenceRow,
  TimelineItem,
} from "./contracts";

const formatScore = (score: number, maxScore: number): string =>
  `${score}/${maxScore}`;

const toTitleCase = (value: string): string =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const parseDeltaLabel = (value: string | null): number =>
  value === null ? Number.NEGATIVE_INFINITY : Number.parseInt(value, 10);

const summarizeAdvantage = (
  run: BenchmarkRunSnapshot,
  baselineTerm: string,
): Pick<RepoScoreCard, "callout" | "deltaLabel"> => {
  const delta =
    typeof run.actualDelta === "number"
      ? run.actualDelta
      : typeof run.expectedBaselineScore === "number"
        ? run.score - run.expectedBaselineScore
        : null;

  const deltaLabel = delta === null ? null : `${delta >= 0 ? "+" : ""}${delta}`;

  if (
    run.comparisonClass === "configured-floor" &&
    typeof run.expectedBaselineScore === "number"
  ) {
    return {
      deltaLabel,
      callout: `${toTitleCase(run.profile)} ${run.variant} clears ${formatScore(
        run.score,
        run.maxScore,
      )} and sits ${deltaLabel} above the configured ${baselineTerm} floor. This floor is guidance, not a second observed run.`,
    };
  }

  if (delta !== null && delta > 0) {
    return {
      deltaLabel,
      callout: `${toTitleCase(run.profile)} ${run.variant} improves by ${deltaLabel} against the repo's ${baselineTerm} reference while staying inside the same repo-native scoring model.`,
    };
  }

  if (delta !== null && delta === 0) {
    return {
      deltaLabel,
      callout: `${toTitleCase(run.profile)} ${run.variant} establishes the repo-native ${baselineTerm} reference at ${formatScore(
        run.score,
        run.maxScore,
      )}.`,
    };
  }

  return {
    deltaLabel,
    callout: `${toTitleCase(run.profile)} ${run.variant} records ${formatScore(
      run.score,
      run.maxScore,
    )} in the repo-native scoring model.`,
  };
};

export const buildScoreCards = (
  bundle: RepoSnapshotBundle,
  baselineTerm: string,
): RepoScoreCard[] =>
  bundle.benchmarkRuns.map((run) => {
    const summary = summarizeAdvantage(run, baselineTerm);

    return {
      id: `${run.repo}:${run.profile}:${run.variant}`,
      profile: run.profile,
      variant: run.variant,
      scoreLabel: formatScore(run.score, run.maxScore),
      gateLabel: `${formatScore(run.thresholdScore, run.maxScore)} gate`,
      comparisonClass: run.comparisonClass,
      callout: summary.callout,
      deltaLabel: summary.deltaLabel,
      provenance: {
        branch: run.branch,
        sha: run.sha,
        timestamp: run.timestamp,
        sourcePath: run.sourcePath,
        harvestedAt: run.harvestedAt,
      },
    };
  });

export const buildStateConfidenceCard = (
  label: string,
  rows: StateConfidenceRow[],
): StateConfidenceCard => {
  const requiredRows = rows.filter((row) => row.required);
  const requiredPassed = requiredRows.filter((row) => row.status === "pass").length;

  let tone: StateConfidenceCard["tone"] = "strong";
  if (requiredPassed !== requiredRows.length) {
    tone = requiredPassed === 0 ? "caution" : "mixed";
  }

  const summary =
    requiredRows.length === 0
      ? "No required state checks were supplied."
      : `${requiredPassed}/${requiredRows.length} required checks are passing with named proof links and timestamps.`;

  return {
    label,
    summary,
    tone,
    requiredPassed,
    requiredTotal: requiredRows.length,
    rows,
  };
};

export const buildTimeline = (bundle: RepoSnapshotBundle): TimelineItem[] => {
  const benchmarkItems: TimelineItem[] = bundle.benchmarkRuns.map((run) => ({
    id: `${run.repo}:${run.profile}:${run.variant}:${run.timestamp}`,
    repo: run.repo,
    label: `${toTitleCase(run.profile)} ${run.variant} benchmark`,
    timestamp: run.timestamp,
    kind: "benchmark",
    detail: `${formatScore(run.score, run.maxScore)} with ${formatScore(
      run.thresholdScore,
      run.maxScore,
    )} release gate`,
    proofLink: run.sourcePath,
  }));

  const processItems: TimelineItem[] = bundle.processArtifacts.map((artifact) => ({
    id: artifact.id,
    repo: bundle.repo,
    label: artifact.label,
    timestamp: artifact.timestamp,
    kind: artifact.kind,
    detail: artifact.summary,
    proofLink: artifact.proofLink,
  }));

  return [...benchmarkItems, ...processItems].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  );
};

export const buildPlainLanguageSummary = (
  displayName: string,
  scoreCards: RepoScoreCard[],
  stateConfidence: StateConfidenceCard,
): string => {
  const strongestImprovement = [...scoreCards]
    .filter((card) => card.deltaLabel && card.deltaLabel !== "+0")
    .sort(
      (left, right) =>
        parseDeltaLabel(right.deltaLabel) - parseDeltaLabel(left.deltaLabel),
    )[0];

  const improvementFragment = strongestImprovement
    ? `${displayName} shows its clearest score advantage in ${toTitleCase(
        strongestImprovement.profile,
      )} ${strongestImprovement.variant}, where ${strongestImprovement.deltaLabel} is explained against its own repo-native reference.`
    : `${displayName} starts by establishing a repo-native baseline before making any comparison claim.`;

  return `${improvementFragment} ${stateConfidence.summary}`;
};

export const buildRepoPresentation = (
  bundle: RepoSnapshotBundle,
  baselineTerm: string,
  confidenceLabel: string,
): RepoPresentationModel => {
  const rows: StateConfidenceRow[] = bundle.stateChecks.map((check) => ({
    name: check.name,
    label: check.label,
    status: check.status,
    timestamp: check.timestamp,
    proofLink: check.proofLink,
    summary: check.summary,
    required: check.required,
  }));

  const scoreCards = buildScoreCards(bundle, baselineTerm);
  const stateConfidence = buildStateConfidenceCard(confidenceLabel, rows);

  return {
    repo: bundle.repo,
    displayName: bundle.displayName,
    plainLanguageSummary: buildPlainLanguageSummary(
      bundle.displayName,
      scoreCards,
      stateConfidence,
    ),
    scoreCards,
    stateConfidence,
    timeline: buildTimeline(bundle),
    repoNativeWarning:
      "Each repo keeps its own benchmark architecture. The presentation layer explains advantage inside that repo instead of forcing one shared score axis.",
  };
};

const toComparisonCard = (presentation: RepoPresentationModel): ComparisonCard => {
  const mostUsefulCard =
    presentation.scoreCards.find(
      (card) => card.deltaLabel && card.deltaLabel !== "+0" && card.comparisonClass !== "narrative-only",
    ) ?? presentation.scoreCards[0];

  return {
    repo: presentation.repo,
    displayName: presentation.displayName,
    headline: mostUsefulCard.callout,
    supportingDetail: presentation.stateConfidence.summary,
    deltaLabel: mostUsefulCard.deltaLabel,
  };
};

export const buildComparativePresentation = (
  presentations: RepoPresentationModel[],
): ComparativePresentationModel => ({
  mode: "repo-native",
  warning:
    "The compare view keeps Copilot and Cursor in separate repo-native score models. It highlights within-repo gains and provenance instead of collapsing them into a fake shared total.",
  cards: presentations.map(toComparisonCard),
});

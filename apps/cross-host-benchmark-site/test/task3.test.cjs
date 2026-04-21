/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildComparativePresentation,
} = require("../dist-task3/lib/presentation/primitives.js");
const {
  adaptCopilotPresentation,
} = require("../dist-task3/lib/adapters/copilot.js");
const {
  adaptCursorPresentation,
} = require("../dist-task3/lib/adapters/cursor.js");

const copilotBundle = {
  repo: "oh-my-copilot",
  displayName: "oh-my-copilot",
  benchmarkRuns: [
    {
      repo: "oh-my-copilot",
      branch: "main",
      sha: "b3156e7",
      timestamp: "2026-04-21T04:51:55Z",
      sourcePath: "benchmark/results/history.jsonl",
      harvestedAt: "2026-04-21T05:00:00Z",
      comparisonClass: "observed",
      profile: "quick",
      variant: "vanilla",
      score: 60,
      maxScore: 100,
      thresholdScore: 60,
      passed: true,
      baselineLabel: "vanilla",
      expectedBaselineScore: 60,
      actualDelta: 0,
    },
    {
      repo: "oh-my-copilot",
      branch: "main",
      sha: "b3156e7",
      timestamp: "2026-04-21T04:52:35Z",
      sourcePath: "benchmark/results/current-quick-enhanced/quick_evaluation.json",
      harvestedAt: "2026-04-21T05:00:00Z",
      comparisonClass: "observed",
      profile: "quick",
      variant: "enhanced",
      score: 100,
      maxScore: 100,
      thresholdScore: 100,
      passed: true,
      baselineLabel: "vanilla",
      expectedBaselineScore: 60,
      actualDelta: 40,
    },
    {
      repo: "oh-my-copilot",
      branch: "main",
      sha: "b3156e7",
      timestamp: "2026-04-21T04:53:54Z",
      sourcePath: "benchmark/results/current-full-enhanced/full_evaluation.json",
      harvestedAt: "2026-04-21T05:00:00Z",
      comparisonClass: "configured-floor",
      profile: "full",
      variant: "enhanced",
      score: 100,
      maxScore: 100,
      thresholdScore: 100,
      passed: true,
      baselineLabel: "vanilla",
      expectedBaselineScore: 70,
      actualDelta: 30,
    },
  ],
  stateChecks: [
    {
      name: "install_state",
      label: "Canonical install-source path",
      status: "pass",
      timestamp: "2026-04-21T04:53:54Z",
      proofLink: "scripts/check-install-state.sh",
      summary: "Installed source path and Copilot plugin cache line up with the canonical repo path.",
      required: true,
    },
    {
      name: "state_contract",
      label: "Plugin state contract",
      status: "pass",
      timestamp: "2026-04-21T04:53:54Z",
      proofLink: "scripts/validate-copilot-state-contract.sh",
      summary: "State-contract validation stays green with named proof output.",
      required: true,
    },
  ],
  processArtifacts: [
    {
      id: "copilot-install-proof",
      kind: "install",
      label: "Install-state proof",
      timestamp: "2026-04-21T04:53:54Z",
      proofLink: "scripts/check-install-state.sh",
      summary: "Confirmed canonical install-source path and plugin cache location.",
    },
    {
      id: "copilot-release-validation",
      kind: "validation",
      label: "Release-readiness validation",
      timestamp: "2026-04-21T04:52:40Z",
      proofLink: "scripts/validate-release-readiness.sh",
      summary: "Release-readiness proof stayed green before the full comparison.",
    },
  ],
};

const cursorBundle = {
  repo: "oh-my-cursor",
  displayName: "oh-my-cursor",
  benchmarkRuns: [
    {
      repo: "oh-my-cursor",
      branch: "main",
      sha: "234498a",
      timestamp: "2026-04-21T04:51:58Z",
      sourcePath: "benchmark/results/current-baseline/backbone_evaluation.json",
      harvestedAt: "2026-04-21T05:00:00Z",
      comparisonClass: "observed",
      profile: "backbone",
      variant: "baseline",
      score: 100,
      maxScore: 120,
      thresholdScore: 100,
      passed: true,
      baselineLabel: "baseline",
      expectedBaselineScore: 100,
      actualDelta: 0,
    },
    {
      repo: "oh-my-cursor",
      branch: "main",
      sha: "234498a",
      timestamp: "2026-04-21T04:52:13Z",
      sourcePath: "benchmark/results/current-enhanced/backbone_evaluation.json",
      harvestedAt: "2026-04-21T05:00:00Z",
      comparisonClass: "observed",
      profile: "backbone",
      variant: "enhanced",
      score: 120,
      maxScore: 120,
      thresholdScore: 120,
      passed: true,
      baselineLabel: "baseline",
      expectedBaselineScore: 100,
      actualDelta: 20,
    },
  ],
  stateChecks: [
    {
      name: "default_auth",
      label: "Default auth",
      status: "pass",
      timestamp: "2026-04-21T04:52:13Z",
      proofLink: "scripts/check-default-auth.sh",
      summary: "Default Cursor auth and auto-model surface are available.",
      required: true,
    },
    {
      name: "surface_visibility",
      label: "Visible surface validation",
      status: "pass",
      timestamp: "2026-04-21T04:52:13Z",
      proofLink: "scripts/validate-surface-visibility.sh",
      summary: "Surface visibility checks confirm the intended backbone footprint.",
      required: true,
    },
    {
      name: "cursor_agent_smoke",
      label: "Model-backed smoke",
      status: "pass",
      timestamp: "2026-04-21T04:52:13Z",
      proofLink: "scripts/smoke-cursor-agent.sh",
      summary: "Model-backed smoke returns CURSOR_AGENT_OK in the enhanced run.",
      required: true,
    },
  ],
  processArtifacts: [
    {
      id: "cursor-state-validation",
      kind: "state",
      label: "State-contract validation",
      timestamp: "2026-04-21T04:52:10Z",
      proofLink: "scripts/validate-state-contract.sh",
      summary: "Repo and user-level state boundaries remain explicit.",
    },
    {
      id: "cursor-backbone-verify",
      kind: "validation",
      label: "Backbone verification",
      timestamp: "2026-04-21T04:52:13Z",
      proofLink: "scripts/verify-backbone.sh",
      summary: "Backbone validation confirms bounded repo-native surfaces.",
    },
  ],
};

test("copilot adapter explains configured-floor evidence without pretending it is observed parity", () => {
  const presentation = adaptCopilotPresentation(copilotBundle);
  const fullCard = presentation.scoreCards.find((card) => card.profile === "full");

  assert.ok(fullCard);
  assert.equal(fullCard.comparisonClass, "configured-floor");
  assert.match(fullCard.callout, /configured vanilla floor/i);
  assert.match(fullCard.callout, /not a second observed run/i);
});

test("state confidence keeps deterministic rows with proof links and timestamps", () => {
  const presentation = adaptCursorPresentation(cursorBundle);

  assert.equal(presentation.stateConfidence.requiredPassed, 3);
  assert.equal(presentation.stateConfidence.requiredTotal, 3);
  assert.equal(presentation.stateConfidence.rows[0].proofLink, "scripts/check-default-auth.sh");
  assert.equal(presentation.stateConfidence.rows[0].timestamp, "2026-04-21T04:52:13Z");
});

test("timeline merges benchmark history and process evidence in chronological order", () => {
  const presentation = adaptCopilotPresentation(copilotBundle);

  assert.equal(presentation.timeline[0].timestamp, "2026-04-21T04:51:55Z");
  assert.equal(
    presentation.timeline[presentation.timeline.length - 1].timestamp,
    "2026-04-21T04:53:54Z",
  );
  assert.match(
    presentation.timeline.map((item) => item.label).join(" | "),
    /Release-readiness validation.*Install-state proof|Install-state proof.*Release-readiness validation/,
  );
});

test("comparative presentation keeps repo-native cards instead of collapsing scores into fake parity", () => {
  const compare = buildComparativePresentation([
    adaptCopilotPresentation(copilotBundle),
    adaptCursorPresentation(cursorBundle),
  ]);

  assert.equal(compare.mode, "repo-native");
  assert.match(compare.warning, /separate repo-native score models/i);
  assert.equal(compare.cards.length, 2);
  assert.match(compare.cards[0].headline + compare.cards[1].headline, /\+40/);
  assert.match(compare.cards[0].headline + compare.cards[1].headline, /\+20/);
});

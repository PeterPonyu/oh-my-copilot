---
name: trace
description: Evidence-driven causal tracing that ranks competing hypotheses with explicit falsification.
user-invocable: true
---

# Trace

Use this root workspace skill for ambiguous, causal, evidence-heavy questions
where the goal is to explain **why** an observed result happened, not to jump
into a fix. Trace is heavier than `debug`; it forces multiple competing
hypotheses, ranks them by evidence strength, and surfaces the cheapest probe to
collapse uncertainty.

## Copilot CLI host note

- Runs sequentially inside the active Copilot CLI session. Copilot CLI is
  single-pane, so the "lanes" below are pursued one after another by the same
  session, not parallel agents.
- Pair with `git log`, `git bisect`, log viewers, and any project tracing tools
  the user already has wired up.

## Tracing contract

Always preserve these distinctions in the output:

1. **Observation** — what was actually observed.
2. **Hypotheses** — at least three deliberately different explanations.
3. **Evidence For** — what supports each.
4. **Evidence Against / Gaps** — what contradicts it or is still missing.
5. **Current Best Explanation** — the leading explanation right now.
6. **Critical Unknown** — the missing fact keeping the top explanations apart.
7. **Discriminating Probe** — the highest-value next step to collapse
   uncertainty.

Do not collapse trace into a generic fix-it loop or a raw log dump.

## Default hypothesis lanes

Unless the prompt suggests a better partition, work three lanes in order:

1. **Code-path / implementation cause** — bug in the code that ran.
2. **Config / environment / orchestration cause** — wrong inputs, wrong
   environment, wrong wiring.
3. **Measurement / artifact / assumption mismatch** — the observation itself
   is misleading (wrong metric, stale cache, off-by-one in the comparison).

For each lane, gather evidence for **and** against. Rank evidence strength:

1. Controlled reproduction
2. Primary artifact with tight provenance (log, metric, file:line, git hash)
3. Multiple independent sources converging
4. Single-source code-path inference
5. Weak circumstantial clues (timing, naming, similarity to a past bug)
6. Intuition / analogy

## Run

1. Restate the observation precisely.
2. Generate three deliberately different hypotheses.
3. For each lane, gather evidence for and against; rank by evidence strength.
4. Run a **rebuttal round**: let the strongest non-leading lane attack the
   leader; force the leader to answer with evidence.
5. Re-rank if the rebuttal landed. Merge two lanes only if they reduce to the
   same underlying mechanism — say so explicitly.
6. Return a synthesis with:
   - ranked hypothesis table
   - evidence summary per hypothesis
   - rebuttal outcome
   - critical unknown
   - single best discriminating probe

## Goal

- explain **why**, not just suggest a fix;
- force falsification of the favored explanation;
- be explicit about why a hypothesis was down-ranked;
- end with the cheapest probe that would change the ranking.

## Stop conditions

- Stop after returning the synthesis. Apply fixes only if the user explicitly
  asks in a follow-up turn.
- If the discriminating probe needs production data the workspace cannot
  reach, surface that as the blocker rather than guessing.

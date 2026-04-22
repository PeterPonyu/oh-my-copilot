# Refinement Priority Map

This note turns the existing OMC/OMX learning inputs into an evidence-ordered
Copilot-native refinement ledger. It does **not** define a parity contract.

Use it with these source anchors:

- [`research/omc-analysis.md`](../research/omc-analysis.md)
- [`research/omx-analysis.md`](../research/omx-analysis.md)
- [`docs/copilot-native-mapping.md`](./copilot-native-mapping.md)
- [`docs/benchmark-status.md`](./benchmark-status.md)

## Learning map: source-system lesson -> Copilot-native refinement

| Source lesson from OMC/OMX | Copilot-native refinement target | Current proof anchor in this repo | Benchmark relevance | Preferred shipped medium | Next move |
| --- | --- | --- | --- | --- | --- |
| Clarify -> plan -> execute -> verify should be visible, not implicit. | Keep a readable user journey across root docs, custom agents, prompts, and release gates. | README reading path, `docs/design-spec.md`, `docs/root-registration.md`, root reviewer/research/verifier agents, and release validation scripts. | `docs_validation`, `power_validation`, and `root_validation` all feed the quick/full benchmark contract. | Root docs plus repo-owned agents/prompts first. | Keep the workflow narrative explicit without renaming OMX/OMC workflow names into fake Copilot commands. |
| Reusable role logic should be separable from the root workspace. | Preserve the reusable power surface inside `packages/copilot-cli-plugin/` while keeping root aliases/current-directory behavior distinct. | `packages/copilot-cli-plugin/`, `docs/root-registration.md`, install-state checks, and hook/source-path validation. | Full enhanced proof is benchmark-backed because install-state and hook evidence are release-gated. | Plugin-native package for reusable assets; root workspace for default local usage. | Expand plugin-native reusable assets only when install-state and hook proof can validate them. |
| Read-only exploration and bounded verification are core logic, even when host mechanics differ. | Keep lightweight validators, smoke scripts, and benchmark harnesses as the proof loop for repo-owned behavior. | `scripts/validate-*.sh`, `scripts/smoke-copilot-cli.sh`, `benchmark/`, and `docs/benchmark-status.md`. | Quick and full runs are the main evidence loop for whether refinements help or regress repo-owned proof. | Shell + Python support tooling, not the public primary surface. | Keep adding proof where it changes benchmarked evidence; avoid shell-first public positioning. |
| Skills, agents, hooks, and MCP are useful only when expressed in host-native shapes. | Use Copilot-native surfaces that GitHub documents instead of copying OMC/OMX runtime machinery. | `docs/copilot-native-mapping.md`, `docs/references.md`, `.github/`, and the plugin package. | Benchmark rows can prove repo-owned registration and smoke-routing, not upstream host-product features by themselves. | Copilot-native checked-in files first; benchmark/support tooling second. | Treat plan/autopilot/delegation as host-product capabilities and keep repo claims narrower than product docs. |
| Cross-host comparison should improve decisions, not blur boundaries. | Keep sibling Cursor notes comparison-scoped and keep Copilot benchmark claims Copilot-only. | `docs/comparison-matrix.md`, `docs/references.md`, and `docs/benchmark-status.md`. | Benchmark evidence must stay repo-specific; cross-host reporting stays reporting-comparable rather than mechanism-equivalent. | Docs and benchmark interpretation, not shared runtime packaging. | Add sibling-aware recommendations only when they help Copilot prioritization without creating cross-host overclaims. |

## Benchmark-backed wins

Current checked-in evidence already shows several refinements are working for
the Copilot-native shape:

- `quick` / `vanilla` holds the mandatory repo-owned floor at **60/100**.
- `quick` / `enhanced` reaches **100/100** by adding both `ROOT_AGENT_OK` and
  `PLUGIN_AGENT_OK`.
- `full` / `enhanced` reaches the stronger end-to-end proof contract described
  in [`docs/benchmark-status.md`](./benchmark-status.md), including install-state
  and standalone hook evidence.
- The benchmark wrappers normalize transient team/worktree invocation roots back
  to the canonical repository root, which prevents false-positive success from
  ephemeral OMX worker paths.

Those are real wins because they strengthen **repo-owned Copilot proof** rather
than only adding more lineage language.

## Remaining gaps and queued refinements

These items are important, but they are **not** benchmark-backed wins yet:

1. **Skill-path confidence still needs care.**
   [`docs/copilot-native-mapping.md`](./copilot-native-mapping.md) intentionally
   keeps some skill-location wording at medium confidence. The next step is live
   Copilot validation, not stronger wording by analogy.
2. **Examples remain illustrative.**
   The VS Code and CLI example layouts are useful smoke-test inputs, but they do
   not upgrade root-workspace or plugin-package claims on their own.
3. **Host-product delegation/autopilot remain upstream behavior.**
   This repo should document how to adapt to them, but it should not claim that
   the repository itself ships a Copilot runtime replacement.
4. **Cross-host presentation still needs strict boundaries.**
   Benchmark storytelling can compare outcomes, but it cannot imply one shared
   OMC/OMX/Copilot mechanism.

## Investigation rule for non-improving benchmark outcomes

If a refinement does **not** improve benchmark output, treat that as an
investigation trigger rather than a dead end:

1. Check whether the change touched a benchmarked surface at all.
   - If the change only improved comparison docs, the benchmark may correctly
     stay flat.
2. Check whether the change landed in the right medium.
   - If reusable behavior was added only to root docs but not to the plugin
     package or release gates, the enhanced proof rows may not move.
3. Check whether new behavior remained host-product-only.
   - Upstream Copilot features such as autopilot/delegation do not become
     repo-owned benchmark credit unless this repo ships and proves a matching
     checked-in surface.
4. Check whether install-state or hook/source evidence is still canonical.
   - A refinement that drifts toward transient paths or unverified routing can
     flatten scores even if the wording looks stronger.

## Plugin-native vs shell+Python boundary recommendation

For `oh-my-copilot`, the current evidence supports this implementation split:

- **Ship natively in Copilot surfaces first** when the behavior is part of the
  reusable public contract: instructions, agents, prompts, skills, hooks, and
  plugin packaging.
- **Keep shell + Python as support infrastructure** for validation, smoke
  testing, benchmark harvest, canonical-path normalization, and release gates.
- **Do not promote support tooling into the main product story** unless the host
  requires it and benchmark evidence proves it is part of the shipped behavior.

That recommendation fits the repo's current strong area: reusable Copilot-native
registration with benchmark-backed proof, not a shell runtime that imitates OMX
or OMC.

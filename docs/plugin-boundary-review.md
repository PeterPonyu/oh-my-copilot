# Plugin-native vs Shell+Python Boundary Review

This note is a **review/governance document**, not a new refinement map. It
records which `oh-my-copilot` surfaces should stay plugin-native, which ones
should stay root-workspace-native, and which ones should remain shell/Python
support infrastructure.

Use it alongside:

- [`docs/root-registration.md`](./root-registration.md)
- [`docs/benchmark-status.md`](./benchmark-status.md)
- [`docs/refinement-priority-map.md`](./refinement-priority-map.md)
- [`packages/copilot-cli-plugin/README.md`](../packages/copilot-cli-plugin/README.md)

## Review verdict

The current repository shape is directionally correct:

- **plugin-native reusable behavior** already has a canonical home in
  `packages/copilot-cli-plugin/`;
- **root-workspace behavior** already has a canonical home in the repository
  root and `.github/`; and
- **shell + Python** already behave like support tooling for validation,
  bootstrap, install-state checks, smoke runs, and benchmark/report generation.

The main review recommendation is to **preserve that split** rather than
letting validation/benchmark helpers quietly become the public product story.

## Boundary map

| Concern | Canonical medium now | Why this medium is correct | What should stay support-only |
| --- | --- | --- | --- |
| Reusable agents, skills, hooks, and plugin metadata | `packages/copilot-cli-plugin/` | These are the reusable surfaces that should remain namespaced, installable, and benchmarkable as plugin behavior. | Bootstrap/install scripts may verify them, but should not become the reusable contract themselves. |
| Current-directory default usage | Root `AGENTS.md`, `.github/`, root docs, root validators | The repo root is the canonical current-directory workspace surface and should stay distinct from installed-plugin routing. | Do not route root behavior through plugin-only paths just because shell scripts can do it. |
| Install-state, canonical-path checks, benchmark harvesting, and smoke wrappers | Shell + Python under `scripts/` and `benchmark/` | These jobs are operational proof infrastructure, not user-facing Copilot-native customization primitives. | Avoid presenting these scripts as the main shipped experience unless GitHub Copilot CLI itself requires that shape. |
| Upstream Copilot CLI capabilities such as plan/autopilot/delegation | Host-product documentation plus bounded repo wording | The repo documents and adapts to these capabilities; it does not implement them. | Do not try to “prove” upstream host-product behavior with local helper scripts alone. |

## Code-quality review observations

### 1. The plugin package already carries the right reusable boundary

The plugin package README, root-registration doc, and benchmark status all
agree on the same shape:

- plugin assets live in `packages/copilot-cli-plugin/`;
- plugin agents are namespaced;
- plugin install-state is validated separately from root-local aliases; and
- enhanced/full benchmark proof treats install-state and hook evidence as
  release-relevant.

That is the strongest sign that **plugin-native shipping is already the right
home for reusable Copilot behavior** in this repository.

### 2. Shell + Python are high-value support tooling, but they are not the product surface

The script/benchmark layer is important because it:

- validates docs and root/plugin/example boundaries;
- checks canonical install-state paths;
- runs smoke workflows;
- normalizes transient team/worktree paths back to the canonical repo root; and
- turns evidence into release-gated benchmark artifacts.

Those are valuable responsibilities. They still should remain **support
infrastructure**, because users do not install `oh-my-copilot` in order to
consume a shell runtime that imitates OMX/OMC.

### 3. Root and plugin routes should remain separate even when they overlap conceptually

Some concepts exist in both places, such as reviewer/verifier/research flows.
The current repo shape handles this well by keeping:

- short unnamespaced aliases at the root for current-directory work; and
- namespaced plugin routes for reusable installed behavior.

Future edits should preserve that distinction instead of collapsing everything
into a single script-driven path.

## Benchmark interpretation for boundary decisions

This boundary review matters when interpreting benchmark changes:

1. **If a change only touches shell/Python support tooling, benchmark scores may
   improve without widening the public Copilot-native contract.**
   - That is acceptable when the improvement is about proof quality,
     canonical-path correctness, or release safety.
2. **If a change claims stronger reusable behavior, the plugin package and its
   proof hooks/install-state must move too.**
   - Otherwise the docs may look stronger while enhanced/full proof stays flat.
3. **If a change only clarifies upstream Copilot capabilities, the benchmark may
   correctly stay unchanged.**
   - The benchmark proves repo-owned registration/proof surfaces, not every
     upstream GitHub Copilot CLI feature.

## Review guardrails for future edits

Before promoting a behavior as part of the shipped contract, ask:

1. **Is this a reusable Copilot customization surface?**
   - If yes, prefer the plugin package or root checked-in Copilot files.
2. **Is this primarily validation, bootstrap, smoke, or evidence harvesting?**
   - If yes, keep it in shell/Python support tooling.
3. **Would users experience this as “the product,” or only as maintainer proof infrastructure?**
   - If it is maintainer proof infrastructure, keep the public wording narrow.
4. **Can the enhanced/full proof contract actually validate the stronger claim?**
   - If not, do not widen the claim yet.

## Recommendation

For `oh-my-copilot`, the near-term rule should stay:

- **ship reusable behavior in plugin-native and root-native Copilot surfaces;**
- **keep shell + Python for validation, bootstrap, and benchmark proof;** and
- **treat any attempt to invert that balance as a scope-risk review item.**

That keeps the repository aligned with its strongest current evidence:
Copilot-native checked-in surfaces backed by support tooling, rather than
support tooling pretending to be the main shipped surface.

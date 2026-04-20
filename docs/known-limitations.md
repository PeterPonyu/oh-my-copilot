# Known Limitations

This page states the current boundaries plainly so users can tell what is ready,
what is illustrative, and what still needs manual proof.

## Product scope limitations

- V1 is Copilot CLI-first. Copilot cloud agent, IDE integration, SDK runtime,
  and broad multi-surface implementations are out of scope for v1.
- This repository is not a replacement runtime for GitHub Copilot CLI.
- It does not implement OMC/OMX-style tmux worker orchestration or persistent
  custom runtime state.
- It does not claim full feature parity with OMC or OMX. The design adapts
  selected ideas to Copilot CLI primitives.

## Install limitations

- The full bootstrap path requires both `copilot` and `gh` on `PATH`.
- The bootstrap script installs a local plugin package and then checks Copilot
  config state; it cannot prove behavior inside every Copilot client surface.
- Some checks are intentionally repository-static. Manual Copilot smoke tests are
  still needed for prompt routing, root-vs-plugin route distinction, and hook
  evidence in a real Copilot session.
- The dedicated `./scripts/check-install-state.sh` proof should be run when it is
  present in the release candidate; until then, the bootstrap and validation
  scripts are the available proof path.

## Documentation limitations

- Capability claims are only as current as the cited source material and the
  repository validation scripts. Prefer [references](./references.md) and
  [Copilot capability research](../research/copilot-cli-capabilities.md) over
  memory when updating claims.
- Examples are illustrative. They are useful for layout and smoke-test ideas but
  are not evidence that root workspace registration works.
- Root and plugin assets intentionally overlap in places. Treat root files as the
  current-directory surface and plugin files as the reusable distribution
  surface.

## Hook limitations

- Hook logs under `.copilot-hooks/` are local evidence, not a global telemetry or
  audit system.
- Standalone hook proof scripts validate helper behavior, but real Copilot hook
  execution still requires a Copilot session that invokes those hooks.
- Root hook evidence and plugin hook evidence must be kept distinct when
  reporting verification.

## Release limitations

- Release readiness is procedural: run the checklist, capture command evidence,
  and document manual smoke-test gaps.
- Do not ship positive claims such as "full parity", "runtime replacement", or
  "multi-surface implementation" unless the repository has a new approved scope
  and corresponding proof.

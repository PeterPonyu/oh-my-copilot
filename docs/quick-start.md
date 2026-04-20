# Quick Start

Use this path when you want to understand and verify `oh-my-copilot` without
reading the whole repository first.

## 1. Know what this is

`oh-my-copilot` is a Copilot CLI-first repository that packages useful root
workspace guidance, short agents, prompts, skills, validation scripts, and a
reusable plugin package. It adapts ideas from OMC/OMX to Copilot CLI primitives;
it does not implement an OMC/OMX-style runtime.

The fastest mental model is:

- **root workspace**: current-directory Copilot CLI experience for this repo;
- **plugin package**: installed, namespaced reusable Copilot CLI routes;
- **examples**: illustrative workspaces for smoke testing and design reference.

## 2. Run low-friction checks

These checks do not require a successful plugin install:

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
```

They verify the docs contract, root Copilot surface inventory, plugin/example
boundaries, prompt-to-agent routing, and root skill references.

## 3. Bootstrap when prerequisites are present

If `copilot` and `gh` are installed and authenticated for your environment, run:

```bash
./scripts/bootstrap-copilot-power.sh
```

The bootstrap path installs the local plugin package and re-runs the repository
proof scripts. If the command fails before plugin installation, check the
[installation guide](./installation.md#prerequisites) first.

## 4. Use the short root routes

From the repository root, prefer the root-local names for current-directory work:

| Goal | Route |
| --- | --- |
| Review docs, registration, or surface changes | `reviewer` or `/review-scope` |
| Verify validation evidence and smoke-test gaps | `verifier` or `/root-registration-check` |
| Source-ground capability claims | `research` |
| Run docs shipment checks | `docs-ship` skill |
| Scan for parity-risk wording | `parity-guard` skill |

Use the namespaced plugin route only when testing the reusable installed plugin,
for example `oh-my-copilot-power-pack:reviewer`.

## 5. Read next only as needed

- [Installation](./installation.md) — prerequisites, bootstrap, install proof,
  and troubleshooting.
- [Usage](./usage.md) — root agents, prompts, skills, plugin routes, hooks, and
  validation matrix.
- [Known limitations](./known-limitations.md) — current boundaries and honest
  gaps.
- [Release checklist](./release-checklist.md) — maintainer checklist for a
  shippable version.

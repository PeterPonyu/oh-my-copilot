# Release Checklist

Use this checklist when preparing a small `oh-my-copilot` release. It is a
procedural guardrail, not proof by itself; attach command output and manual
smoke-test notes to the release record.

## 1. Scope check

- Confirm the release remains Copilot CLI-first.
- Confirm cloud agent, IDE integration, SDK runtime, and broad multi-surface work
  are not described as v1 shipped behavior.
- Confirm OMC/OMX language is bounded as lineage, mapping, or non-goal context,
  not full parity.
- Confirm examples are labelled illustrative and are not used as root proof.

## 2. Static validation

Run from the repository root:

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
```

Expected result: all three commands exit 0 and end with `ok:` evidence.

## 3. Install proof

When `copilot` and `gh` are installed and authenticated, run:

```bash
./scripts/bootstrap-copilot-power.sh
```

If the release candidate includes the dedicated install-state checker, run:

```bash
./scripts/check-install-state.sh
```

Capture both passing output and any environment-specific caveats.

## 4. Manual Copilot smoke tests

From the repository root, verify manually that:

1. Copilot sees root instructions from `AGENTS.md` and `.github/` instruction
   files.
2. Root agents `reviewer`, `verifier`, and `research` are available by short
   name.
3. Namespaced plugin routes such as `oh-my-copilot-power-pack:reviewer` remain
   semantically distinct from root aliases.
4. Root prompts `/review-scope`, `/ship-docs`, and `/root-registration-check`
   route to root agents.
5. Root skills run root-relative validation commands.
6. Hook evidence, when generated, is labelled as root-workspace evidence and is
   written under `.copilot-hooks/`.

## 5. Documentation review

- README start path is current and short.
- [Quick start](./quick-start.md), [installation](./installation.md),
  [usage](./usage.md), and [known limitations](./known-limitations.md) agree
  with the current scripts and root/plugin/example boundary.
- [References](./references.md) include current source links and access dates for
  any changed capability claim.
- Known gaps are recorded instead of being hidden.

## 6. Release notes

Include:

- summary of shipped user-facing changes;
- validation commands and PASS/FAIL results;
- manual Copilot smoke-test results;
- known limitations or skipped checks; and
- any root/plugin/example boundary changes.

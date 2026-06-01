# Release Checklist

Use this checklist before tagging or announcing an `oh-my-copilot` release.
It keeps the release path **CLI-first**, keeps
[`packages/copilot-cli-plugin/`](../packages/copilot-cli-plugin/) canonical for
reusable plugin behavior, and keeps [`examples/`](../examples/) illustrative.

## 1. Scope gate

- Confirm the release is still a small Copilot CLI product surface, not a
  replacement runtime or OMC/OMX parity clone.
- Confirm root workspace behavior, installed-plugin behavior, and example
  workspace behavior are described separately.
- Confirm the root workspace, reusable plugin package, and examples are still
  described as architectural layers with different owners, not as version tiers.
- Confirm new examples are labelled illustrative and are not used as root proof.
- Confirm every capability claim is backed by repository evidence, official
  GitHub documentation, or an explicit design inference.
- Confirm any mention of Copilot CLI plan mode, autopilot mode, or built-in
  delegation is framed as a host-product capability with GitHub citations rather
  than as repo-owned implementation proof.
- Confirm any Cursor mention stays comparison-scoped or sibling-scoped and is
  not presented as current `oh-my-copilot` host support.

## 2. Version and release notes

- Update `packages/copilot-cli-plugin/plugin.json` when the reusable plugin
  package changes.
- Use semantic-version style values for the plugin package version.
- Update [`release-notes-template.md`](./release-notes-template.md) and fill it
  from the actual release diff.
- Draft release notes from merged PRs or the release branch diff. Include:
  - user-facing documentation changes;
  - bootstrap or install proof changes;
  - plugin command/agent/skill changes and generated root mirror changes;
  - validator and smoke-test changes;
  - known limitations that remain.
- Keep the Git tag and release notes aligned with the plugin version when the
  release includes plugin package changes.

## 3. Automated validation

Run these commands from the repository root:

```bash
./scripts/validate-fast-sanity.sh
./scripts/validate-full-local.sh --skip-release-readiness
./scripts/validate-doc-links.sh
./scripts/check-mirror-drift.sh
node scripts/validate-plugin-orchestration.mjs
node scripts/validate-skill-receipts.mjs
./packages/copilot-cli-plugin/skills/parity-guard/check-parity-claims.sh .
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
./scripts/validate-copilot-state-contract.sh
./scripts/validate-benchmark-evidence.sh
./scripts/validate-structural-e2e.sh
./scripts/validate-release-readiness.sh
```

Expected result: each command exits `0` and prints `ok:` evidence. If a command
fails, fix the drift before release rather than weakening the validator.

## 4. Direct Copilot CLI smoke tests

Run the non-mutating CLI smoke script first:

```bash
./scripts/smoke-copilot-cli.sh
```

When a signed-in Copilot CLI session and model access are available, run the
agent prompt smoke tests as a release-candidate check:

```bash
RUN_COPILOT_AGENT_SMOKE=1 ./scripts/smoke-copilot-cli.sh
```

Pass criteria:

- `copilot --version` succeeds.
- `copilot plugin --help` succeeds.
- Root agent files for `research`, `reviewer`, and `verifier` exist.
- Plugin metadata parses and still names `omcp`.
- The root `reviewer` route responds to a constrained prompt.
- If the plugin is installed, the namespaced
  `omcp:reviewer` route responds to a constrained prompt.

Do not treat a skipped namespaced plugin prompt as root proof. Install proof is
owned by the bootstrap/install path and should be recorded separately.

## 5. Manual release review

- Open `README.md`, `docs/usage.md`, `docs/installation.md`, and
  `docs/known-limitations.md` if present; confirm the public reading path is
  coherent.
- Confirm the edited public docs still distinguish repository proof, host-product
  citations, and illustrative/example-only wording.
- Open `docs/references.md` and `docs/comparison-matrix.md`; confirm access
  dates are current and any Cursor notes remain comparison-only rather than
  product-support claims.
- Confirm bootstrap/install commands in the docs match the scripts in `scripts/`.
- Confirm the root prompts, skills, agents, and instructions have no drift from
  plugin canonical sources.
- Confirm namespaced plugin routes remain documented for reusable installed
  plugin work.
- Confirm the post-artifact `ai-slop-cleaner` quality step is still wired into
  the autopilot (Phase 3.5), ultrawork (Step 11), and ralph (Step 7.5)
  pipelines and documented in
  [`docs/plugin-internal/orchestration.md`](./plugin-internal/orchestration.md);
  `node scripts/validate-skill-receipts.mjs` enforces both the provenance
  receipt contract and this integration.
- Confirm no generated `.copilot-hooks/*.log`, `.copilot-hooks/*.jsonl`, or
  `.copilot-hooks/config.json` files are staged.

## 6. Evidence template

Paste this into the release PR or release notes:

```text
Release readiness evidence:
- Docs validation: PASS/FAIL — ./scripts/validate-doc-links.sh
- Mirror drift validation: PASS/FAIL — ./scripts/check-mirror-drift.sh
- Plugin orchestration validation: PASS/FAIL — node scripts/validate-plugin-orchestration.mjs
- Skill receipt + ai-slop integration validation: PASS/FAIL — node scripts/validate-skill-receipts.mjs
- Parity wording scan: PASS/FAIL — ./packages/copilot-cli-plugin/skills/parity-guard/check-parity-claims.sh .
- Power surface validation: PASS/FAIL — ./scripts/validate-power-surfaces.sh
- Root surface validation: PASS/FAIL — ./scripts/validate-root-copilot-surfaces.sh
- Copilot state contract: PASS/FAIL — ./scripts/validate-copilot-state-contract.sh
- Fast sanity validation: PASS/FAIL — ./scripts/validate-fast-sanity.sh
- Full local validation: PASS/FAIL — ./scripts/validate-full-local.sh --skip-release-readiness
- Benchmark evidence validation: PASS/FAIL — ./scripts/validate-benchmark-evidence.sh
- Structural E2E validation: PASS/FAIL — ./scripts/validate-structural-e2e.sh
- Release readiness validation: PASS/FAIL — ./scripts/validate-release-readiness.sh
- Copilot CLI smoke: PASS/FAIL/SKIPPED — ./scripts/smoke-copilot-cli.sh
- Agent prompt smoke: PASS/FAIL/SKIPPED — RUN_COPILOT_AGENT_SMOKE=1 ./scripts/smoke-copilot-cli.sh
- Plugin session evidence attach point (optional redacted logs): benchmark/results/plugin-session-evidence/
- Version checked: packages/copilot-cli-plugin/plugin.json <version>
- Known gaps:
```

## 7. Rollback notes

- Documentation-only releases can be reverted with a normal git revert.
- Plugin package changes should be reverted together with their validation
  updates so plugin metadata and smoke-test expectations stay aligned.
- If a Copilot CLI behavior changes upstream, update
  [`docs/references.md`](./references.md) and preserve the failing evidence in
  release notes before relaxing a check.

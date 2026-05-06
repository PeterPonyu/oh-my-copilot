# E2E Pipeline Run — Wave 7 Smoke

## What this smoke flow tests

The Wave 7 smoke verifies that a vague natural-language prompt flows through the
three-stage OMC pipeline and that every output file carries machine-readable
**provenance frontmatter** in the correct temporal order:

```
deep-interview  →  spec.md   (pipeline-stage: spec)
ralplan         →  plan.md   (pipeline-stage: plan)
autopilot       →  artifact  (pipeline-stage: artifact)
```

The smoke fails if any link in the chain is missing, mislabeled, or out of
chronological order.

---

## How to manually reproduce (Copilot CLI installed)

1. Install the plugin into Copilot CLI:

   ```sh
   copilot plugin install ./packages/copilot-cli-plugin
   ```

2. Feed the canonical vague prompt through the pipeline:

   ```sh
   copilot --agent oh-my-copilot-power-pack:deep-interview \
     -p "$(cat scripts/fixtures/vague-prompt.txt)"
   # deep-interview writes .omc/specs/<timestamp>-spec.md

   copilot --agent oh-my-copilot-power-pack:ralplan \
     -p "refine the spec in .omc/specs/"
   # ralplan writes .omc/plans/<timestamp>-plan.md

   copilot --agent oh-my-copilot-power-pack:autopilot \
     -p "implement the plan in .omc/plans/"
   # autopilot emits artifact(s) in a scratch/ subdir
   ```

3. Observe the provenance chain:

   ```sh
   head -4 .omc/specs/*.md
   head -4 .omc/plans/*.md
   ```

4. Run the assertion helper directly:

   ```sh
   source scripts/e2e-pipeline-fixture.sh
   spec=$(ls -1 .omc/specs/*.md | head -1)
   plan=$(ls -1 .omc/plans/*.md | head -1)
   artifact=$(find scratch/ -type f \( -name '*.ts' -o -name '*.py' -o -name '*.js' \) | head -1)
   e2e_pipeline_assert_chain "$spec" "$plan" "$artifact"
   ```

---

## Provenance frontmatter contract

Every pipeline output file must begin with these three YAML-style header lines
(no surrounding `---` fences required; the smoke uses bare `grep`):

```
produced-by: <skill-name>
produced-at: <ISO-8601-datetime>
pipeline-stage: <spec|plan|artifact>
```

| Field            | Allowed values                     | Written by        |
|------------------|------------------------------------|-------------------|
| `produced-by`    | `deep-interview`, `ralplan`, `autopilot` | the skill itself |
| `produced-at`    | ISO-8601, e.g. `2026-05-06T12:34:56` | the skill itself |
| `pipeline-stage` | `spec`, `plan`, `artifact`         | the skill itself  |

---

## Why temporal ordering matters

The smoke checks that `spec_t < plan_t < artifact_mtime`. This guarantees:

- The spec was written before the plan referenced it.
- The plan was written before the artifact was generated from it.
- No stage was replayed out of order (e.g. a stale cached spec re-used after a
  newer plan).

If any `produced-at` timestamp is missing, mis-formatted, or out of order, the
assertion fails with a descriptive message and exits non-zero.

---

## Where the assertions live

All assertion logic is in `scripts/e2e-pipeline-fixture.sh`:

- `e2e_pipeline_assert_chain(spec_file, plan_file, artifact)` — the canonical
  three-check + temporal-order assertion, verbatim from the plan.
- `e2e_pipeline_synthetic_chain(scratch_dir)` — creates synthetic fixture files
  that satisfy every assertion; used in CI without Copilot CLI.
- `e2e_pipeline_setup(scratch_dir)` — copies `scripts/fixtures/vague-prompt.txt`
  into a scratch dir for live runs.

The smoke script (`scripts/smoke-copilot-cli.sh`) sources
`e2e-pipeline-fixture.sh` and calls these functions automatically.

---

## CI-only path (no Copilot CLI)

When `copilot` is not in `$PATH`, the smoke script:

1. Warns that the live pipeline run is skipped.
2. Creates a synthetic chain via `e2e_pipeline_synthetic_chain`.
3. Runs `e2e_pipeline_assert_chain` against the synthetic files.
4. Exits 0 only if every assertion passes against the synthetic data.

This keeps the CI green without requiring a live model call, while still
exercising the full assertion logic.

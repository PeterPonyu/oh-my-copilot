# Translator test fixtures

Golden-file fixtures for `scripts/translate-omc-skill.mjs`. They prove the
translator is **deterministic** (same input → byte-identical output) and
**idempotent** (re-running on translated output is a no-op).

## Layout

```
translate-test-fixtures/
  fixture-01-simple/
    input/SKILL.md            # OMC source: one Skill() call + one MCP tool ref
    expected-output/SKILL.md  # what translator must produce
    expected-diff.md          # what _omc-port-diff.md must contain
  fixture-02-already-translated/
    input/SKILL.md            # already carries the sentinel comment
    expected-output/SKILL.md  # identical to input (no-op proof)
```

`fixture-02-already-translated` has no `expected-diff.md` because the no-op
path does not write `_omc-port-diff.md`.

## How to run

```bash
bash packages/copilot-cli-plugin/scripts/translator-smoke.sh
```

Smoke flow per fixture:

1. Translate `<fixture>/input` to a temp dir.
2. Diff against `<fixture>/expected-output/SKILL.md` and `<fixture>/expected-diff.md`.
3. Translate again (second run) -- output must be byte-identical (idempotency).
4. Run with `--check` against the temp dir -- must exit 0 (no drift).

Any failure prints which fixture, which step, and the diff.

## Updating fixtures

If you intentionally change the translator output shape, regenerate the goldens:

```bash
node packages/copilot-cli-plugin/scripts/translate-omc-skill.mjs \
  packages/copilot-cli-plugin/scripts/translate-test-fixtures/fixture-01-simple/input \
  packages/copilot-cli-plugin/scripts/translate-test-fixtures/fixture-01-simple/expected-output
cp packages/copilot-cli-plugin/scripts/translate-test-fixtures/fixture-01-simple/expected-output/_omc-port-diff.md \
   packages/copilot-cli-plugin/scripts/translate-test-fixtures/fixture-01-simple/expected-diff.md
```

Re-run the smoke test afterward. The provenance line in `SKILL.md` references
the source path relative to the nearest `.omc/` ancestor of the input dir, so
fixtures stay stable across machines as long as they live under
`oh-my-copilot/.omc/`.

# Site Artifact Contract

This directory holds repository-side artifacts that a presentation layer can
consume without scraping Markdown by hand.

- `oh-my-copilot.evidence.json` is **generated** from checked-in benchmark
  evaluation files plus stable document references.
- `oh-my-copilot.story.json` is **curated** presentation framing that points
  back to evidence IDs and keeps editorial interpretation separate from raw
  proof.

Regenerate the generated evidence file from the repository root with:

```bash
python3 benchmark/build_site_artifacts.py
```

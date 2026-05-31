#!/usr/bin/env bash
# Finalize: build rubric_scores.jsonl from per-pair files, run analyze, run case studies, write master REPORT.md.
# Run this after rubric_judge.py completes.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKSPACE_ROOT="$(cd "$REPO_ROOT/.." && pwd)"

RUNS="$SCRIPT_DIR"
CURSOR_VANILLA="${CURSOR_VANILLA:-$WORKSPACE_ROOT/oh-my-cursor/benchmark/runs/data/20260427T101854Z__A1-full__vanilla__cursor-auto__622369f2f1c6}"
CURSOR_OMC="${CURSOR_OMC:-$WORKSPACE_ROOT/oh-my-cursor/benchmark/runs/data/20260427T104802Z__A1-full__with-omc__cursor-auto__18b43db282c1}"
CASE_DIR="${CASE_DIR:-$WORKSPACE_ROOT/oh-my-cursor/benchmark/case-studies}"

echo "=== Building rubric_scores.jsonl from per-pair judgment files ==="
python3 -c "
import json, pathlib, sys
d = pathlib.Path('$RUNS/data/judgments')
lines = []
for p in sorted(d.glob('*.json')):
    lines.append(json.dumps(json.loads(p.read_text())))
out = pathlib.Path('$RUNS/rubric_scores.jsonl')
out.write_text('\n'.join(lines) + '\n')
print(f'Wrote {len(lines)} lines -> {out}', file=sys.stderr)
"

echo "=== Running analyze.py ==="
python3 "$RUNS/analyze.py" \
  --pairs "$RUNS/paired_pairs.jsonl" \
  --scores "$RUNS/rubric_scores.jsonl" \
  --analysis-out "$RUNS/analysis.json" \
  --report-out "$RUNS/analysis_section.md"

echo "=== Running make_case_studies.py ==="
python3 "$RUNS/make_case_studies.py" \
  --pairs "$RUNS/paired_pairs.jsonl" \
  --scores "$RUNS/rubric_scores.jsonl" \
  --out-dir "$CASE_DIR" \
  --vanilla-run-dir "$CURSOR_VANILLA" \
  --omc-run-dir "$CURSOR_OMC" \
  --top 5

echo "=== All done. Check $RUNS/REPORT.md ==="

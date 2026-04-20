#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

required=(
  "AGENTS.md"
  ".github/copilot-instructions.md"
  ".github/instructions/typescript.instructions.md"
  ".github/prompts/ship-docs.prompt.md"
  ".github/prompts/review-scope.prompt.md"
  ".github/agents/planner.agent.md"
  ".github/agents/implementer.agent.md"
  ".github/agents/reviewer.agent.md"
  ".github/agents/verifier.agent.md"
  ".github/skills/parity-guard/SKILL.md"
  ".github/skills/docs-ship/SKILL.md"
  ".github/hooks/policy.json"
  ".vscode/settings.json"
  "PROOF-CHECKLIST.md"
  "src/sample.ts"
  "src/sample.tsx"
)

for path in "${required[@]}"; do
  [[ -f "$ROOT/$path" ]] || { echo "FAIL: missing $path" >&2; exit 1; }
done

"$ROOT/.github/skills/parity-guard/check-parity-claims.sh" "$ROOT"
echo "ok: VS Code workspace checks passed"

#!/usr/bin/env bash
# generate-skill-commands.sh
#
# For every skill in packages/copilot-cli-plugin/skills/<slug>/SKILL.md that
# does NOT already have a corresponding commands/<slug>.md, generate a thin
# wrapper command file so users can invoke the skill via /omcp:<slug>.
#
# Existing command files are NEVER overwritten — they typically have richer
# frontmatter (agent:, argument-hint:) hand-tuned for that skill.
#
# Skills with `user-invocable: false` in frontmatter are skipped (they are
# auto-loaded / context-injected rather than user-invoked).

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || (cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd))"
SKILLS_DIR="$REPO_ROOT/packages/copilot-cli-plugin/skills"
COMMANDS_DIR="$REPO_ROOT/packages/copilot-cli-plugin/commands"

CREATED=0
SKIPPED_EXISTS=0
SKIPPED_INTERNAL=0

for skill_dir in "$SKILLS_DIR"/*/; do
  slug="$(basename "$skill_dir")"
  skill_md="$skill_dir/SKILL.md"
  command_md="$COMMANDS_DIR/${slug}.md"

  [[ -f "$skill_md" ]] || continue

  if [[ -f "$command_md" ]]; then
    SKIPPED_EXISTS=$((SKIPPED_EXISTS+1))
    continue
  fi

  # Skip skills explicitly marked non-user-invocable
  if grep -q "^user-invocable: *false" "$skill_md"; then
    SKIPPED_INTERNAL=$((SKIPPED_INTERNAL+1))
    continue
  fi

  # Pull name + description from frontmatter
  name="$(awk '/^name:/ {sub(/^name: */, ""); print; exit}' "$skill_md")"
  desc="$(awk '/^description:/ {sub(/^description: */, ""); print; exit}' "$skill_md")"
  : "${name:=$slug}"
  : "${desc:=Invoke the $slug skill.}"

  cat >"$command_md" <<EOF
---
name: $name
description: $desc
argument-hint: "<input>"
---

# /omcp:$name

$desc

The skill at \`skills/$slug/SKILL.md\` defines the full procedure. Follow
that skill's instructions, using \`{{ARGUMENTS}}\` as the user input.

Task: {{ARGUMENTS}}
EOF
  CREATED=$((CREATED+1))
done

echo "Created: $CREATED"
echo "Skipped (already exists): $SKIPPED_EXISTS"
echo "Skipped (user-invocable: false): $SKIPPED_INTERNAL"

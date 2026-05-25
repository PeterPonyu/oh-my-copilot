# Source-feature ports — 2026-05-25

## Purpose

Port three small, recent features from upstream sibling repos
(`oh-my-claudecode`, `oh-my-codex`, `oh-my-openagent`) into
`oh-my-copilot` as three independent TypeScript/MJS PRs that each:

- amplify a surface that landed in Wave-P or Wave-Q today,
- respect copilot's `.github/` ↔ `packages/copilot-cli-plugin/`
  mirror discipline (regenerated via
  `scripts/regenerate-github-mirror.sh`, drift-checked via
  `scripts/check-mirror-drift.sh`),
- stay scoped to a single concern with the smallest reviewable diff,
- pass `scripts/run-validation.sh` and the relevant store-level
  `node --test` suite before merge.

## Non-goals

- No new MCP tools, no new stores, no new skills, no new agents.
- No mirror-script rewrite — PRs use the existing regenerate flow.
- No port of upstream features that need surfaces copilot does not
  have (no live-tail pane orchestration, no tmux subagent reaping,
  no sparkshell crate).
- No change to MCP server bootstrap, transport, or registration —
  PRs extend existing helpers and call sites only.

## Source mapping

| PR | Source feature | Source file(s) | Copilot target |
|----|----------------|----------------|----------------|
| 1  | Co-author opt-out flag in git-master skill | `oh-my-codex` `src/config/commit-lore-guard.ts` (opt-in gate, 6 LOC pattern) | `packages/copilot-cli-plugin/skills/git-master/SKILL.md` ×2 mirror |
| 2  | Secret redaction at rules-store boundary | `oh-my-codex` `crates/omx-sparkshell/src/codex_bridge.rs` `redact_secrets` (~71 LOC Rust) | `packages/copilot-cli-plugin/mcp-server/rules-store.mjs` + `tests/rules-store.test.mjs` |
| 3  | Memory-write dedup for project-memory writes | `oh-my-openagent` `src/features/comment-checker-core/dedupe-per-session.ts` (~50 LOC) | `packages/copilot-cli-plugin/mcp-server/project-memory-store.mjs` + test |

Each PR cites its source by file path so a reviewer can audit the
port for fidelity.

---

## PR 1 — Co-author opt-out flag in git-master skill

### What changes

`packages/copilot-cli-plugin/skills/git-master/SKILL.md` gains a
**Co-author lore** section inserted between "Agent orchestration"
and "When to use". The text reads (roughly):

> ## Co-author lore
>
> By default, commits authored via this skill do **not** add
> `Co-Authored-By:` trailers for the assistant. The git-master agent
> opts in only when one of the following is true for the active
> project:
>
> - Env var `OMCP_COMMIT_COAUTHOR=1` is set in the agent's
>   environment.
> - File `.omcp/commit-lore.json` exists at the project root and
>   contains `{ "coauthor": true }`.
>
> When opt-in is detected, the agent appends:
>
> ```
> Co-Authored-By: <assistant name + model> <noreply@anthropic.com>
> ```
>
> When neither signal is present, no trailer is appended. The agent
> includes the resolved policy (`coauthor: on|off` and which signal
> triggered it) in its commit-summary report.

Then `scripts/regenerate-github-mirror.sh` runs to refresh
`.github/skills/git-master/SKILL.md`. `packages/copilot-cli-plugin/CHANGELOG.md`
gets a one-line entry under Unreleased / Wave-Q follow-up.

### Why mirror-only, no MCP tool addition

Pure prose guidance. The git-master agent already reads project
config files at commit time; this PR declares the contract its
agent should honor. No new MCP primitive, no new store, no new
prompt template.

### Source mapping

`oh-my-codex` `src/config/commit-lore-guard.ts` is the upstream gate
that made co-author trailers opt-in. Copilot inherits the same
*policy*, expressed as skill-level guidance because copilot's
git-master delegates to a real agent rather than running a runtime
hook on every commit.

### Surfaces NOT changed

- `packages/copilot-cli-plugin/commands/git-master.md` — 15-line
  stub, doesn't mention co-authors, no edit needed.
- `.github/prompts/git-master.prompt.md` — same as above.
- `packages/copilot-cli-plugin/agents/git-master.agent.md` — agent
  follows the skill contract; no edit needed for this PR.
- `AGENTS.md`, root `README.md` — co-author lore is a skill-internal
  contract, not a top-level capability claim.

### LOC estimate

~12 LOC in `packages/copilot-cli-plugin/skills/git-master/SKILL.md`
+ ~12 LOC mirror in `.github/skills/git-master/SKILL.md`
+ 1 line in `packages/copilot-cli-plugin/CHANGELOG.md`. **~25 LOC**.

### Validation

- `scripts/check-mirror-drift.sh` exits 0.
- `scripts/run-validation.sh` exits 0.

---

## PR 2 — Secret redaction at rules-store boundary

### What changes

`packages/copilot-cli-plugin/mcp-server/rules-store.mjs` gains:

1. A top-of-file `const REDACTION_PATTERNS` array of `{ name, regex,
   replacement }` entries.
2. A `redactSecrets(text)` helper that runs every pattern's regex
   against `text` and returns the redacted string. Non-string input
   is returned unchanged.
3. Two call-site additions:
   - **Write boundary:** in the pending-rule write function, redact
     the `content` field before passing the entry to
     `atomicWriteJson(PENDING_FILE, …)`.
   - **Read boundary:** in the `rules_pending_read` MCP-tool handler
     (or whichever function shapes the public read response),
     redact the `content` field of every returned entry before
     returning.

Patterns ported from codex sparkshell:

| Name | Regex | Replacement |
|------|-------|-------------|
| `AWS_KEY` | `AKIA[0-9A-Z]{16}` | `[REDACTED:AWS_KEY]` |
| `GH_TOKEN` | `ghp_[A-Za-z0-9]{36,}` | `[REDACTED:GH_TOKEN]` |
| `OPENAI_KEY` | `sk-(?:proj-)?[A-Za-z0-9_-]{20,}` | `[REDACTED:OPENAI_KEY]` |
| `ANTHROPIC_KEY` | `sk-ant-[A-Za-z0-9_-]{20,}` | `[REDACTED:ANTHROPIC_KEY]` |
| `BEARER` | `Bearer [A-Za-z0-9_.~+/=-]{20,}` | `Bearer [REDACTED]` |
| `KV_SECRET` | `(?i)\b(password\|secret\|token\|api[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9_.+/=-]{20,}` | `$1=[REDACTED]` |

`ANTHROPIC_KEY` is matched **before** `OPENAI_KEY` (both start with
`sk-`); pattern order matters.

### Why redact on both write and read

Belt and suspenders. Write-side prevents secrets from landing on
disk; read-side prevents them from leaving the server even if a
future bug wrote unredacted content (e.g. a code path that bypasses
the write helper).

### Test additions (`mcp-server/tests/rules-store.test.mjs`)

Add a `node:test` describe block with at least three assertions:

1. An AWS key embedded in rule content is redacted on write
   (read the resulting JSON file off disk, assert the literal
   `AKIA` prefix is absent and `[REDACTED:AWS_KEY]` is present).
2. A `Bearer <token>` string in pre-existing pending state is
   redacted on read (mock or stage the file, call the read path,
   assert the returned content has `Bearer [REDACTED]`).
3. A non-secret string (e.g. `"this is a normal rule about logging"`)
   passes through unchanged on both write and read.

### Surfaces NOT changed

- Other stores (`notepad-store.mjs`, `wiki-store.mjs`,
  `project-memory-store.mjs`, etc.) keep current behavior — this
  PR is rules-store-only. Follow-up PR can extract `redactSecrets`
  into a shared module and adopt it elsewhere; deferring keeps the
  diff small and reviewable.
- No change to `server.mjs` registrations.
- No change to the `rules_pending_read` MCP-tool schema — only the
  response payload content is redacted.

### LOC estimate

~10 LOC patterns + ~6 LOC helper + ~4 LOC at write site + ~4 LOC at
read site in `rules-store.mjs` (~25 LOC) + ~40 LOC of new tests in
`tests/rules-store.test.mjs`. **~65 LOC** total. Test count is the
dominant cost — implementation itself is ~25 LOC.

### Validation

- `node --test packages/copilot-cli-plugin/mcp-server/tests/rules-store.test.mjs`
  exits 0 (new + existing assertions pass).
- `scripts/run-validation.sh` exits 0.
- `scripts/check-mirror-drift.sh` exits 0 (PR doesn't touch mirrors,
  but the validator runs anyway).

---

## PR 3 — Memory-write dedup in project-memory-store.mjs

### What changes

`packages/copilot-cli-plugin/mcp-server/project-memory-store.mjs`
gains an in-memory deduplication layer at the write boundary so the
`remember` skill's frequent re-writes don't accumulate near-duplicate
entries in project memory.

#### Mechanism

1. A module-scoped `const DEDUP_RECENT_LIMIT = 10` and a
   `const recentHashes = new Map<string, { id: string, ts: number }>()`
   live at the top of the file. Map is keyed by a sha256-truncated
   hash of the normalized content string.
2. A `normalizeForHash(content)` helper trims, collapses internal
   whitespace runs, and lowercases; this is a one-screen function.
3. A `hashContent(normalized)` helper returns the first 16 hex chars
   of `crypto.createHash('sha256').update(normalized).digest('hex')`.
4. In the public write function (whichever function handles
   `project_memory_write` from the MCP tool):
   - Compute `normalized` and `hash` for the incoming content.
   - If `recentHashes.has(hash)`, return
     `{ status: 'skip', reason: 'duplicate', existing_id:
     recentHashes.get(hash).id }` *without* writing. Refresh the
     `ts` on the existing entry (LRU touch).
   - Otherwise, perform the write as before, then call
     `rememberHash(hash, newEntryId)`.
5. `rememberHash()` inserts into the Map; if size exceeds
   `DEDUP_RECENT_LIMIT`, evict the entry with the oldest `ts`.

#### Persistence

State is **in-memory only**. Restart resets the dedup window. This
is intentional: a small window of duplicate-write protection is
useful per-session; cross-session dedup belongs in the durable
store schema and is out of scope here.

### Caller contract

Callers that don't already inspect the write response will continue
to work — the response shape gains `status` and (on skip)
`reason`/`existing_id`, but callers that only checked for a write
error will not break. The `remember` skill's prose can be updated
to mention the dedup behavior in a follow-up doc PR; this PR does
not change the skill text.

### Test additions

Add a `node:test` describe block (file path matches whatever the
existing test convention is — likely
`tests/project-memory-store.test.mjs`; create if absent) with at
least two assertions:

1. Writing the same content twice in a row returns
   `{ status: 'skip', reason: 'duplicate', existing_id: <id> }` on
   the second call, and the durable store contains exactly one
   entry.
2. Writing two different contents in a row produces two entries
   both with `status: 'ok'`.

### Why in-memory, not on-disk dedup ledger

Smaller diff, no schema migration, no concurrency races between
restarts, no garbage-collection contract to maintain. A 10-entry
in-memory Map costs <2 KB and resets cleanly. If durable dedup is
needed later, that's its own design.

### Surfaces NOT changed

- Schema of stored entries is unchanged.
- No new MCP tool, no change to existing tool input schema.
- `server.mjs` registrations unchanged.
- `skills/remember/SKILL.md` — text untouched in this PR (follow-up
  if desired).

### LOC estimate

~25 LOC in `project-memory-store.mjs` (constants, two helpers, the
write-path branch, the eviction) + ~35 LOC of new tests. **~60 LOC**
total.

### Validation

- `node --test packages/copilot-cli-plugin/mcp-server/tests/project-memory-store.test.mjs`
  exits 0 (or whichever path the new test lives at).
- `scripts/run-validation.sh` exits 0.
- `scripts/check-mirror-drift.sh` exits 0.

---

## Per-PR validation checklist

Every PR in this batch, before merge:

1. `scripts/check-mirror-drift.sh` exits 0.
2. `scripts/run-validation.sh` exits 0.
3. For PRs touching `mcp-server/`, the relevant `node --test` file
   passes (new assertions + existing assertions).
4. Diff stays under ~70 LOC for skill-only PRs and ~100 LOC for
   MCP-server-plus-tests PRs. If the diff grows beyond this during
   implementation, split before opening.
5. PR body cites the upstream source feature with file path and
   (where available) PR number / branch name.

## Out of scope for this batch (deferred or rejected)

| Considered | Why deferred / rejected |
|------------|-------------------------|
| Disabled provider filter (openagent) | Copilot's model selection is delegated to the host CLI; no provider-allowlist surface inside the plugin. |
| Doctor cross-ref (openagent) | Copilot already has `omc-doctor`; a cross-ref pass is its own design, not a follow-on to today's Waves. |
| Server port ownership detector (openagent) | The copilot MCP server runs as a child of the host CLI; multi-instance contention is host-managed. |
| Stall timeout separation (openagent) | Copilot has no per-subagent stall surface; would need new infra. |
| Live-tail integration (openagent) | 400+ LOC; not surgical, and copilot has no pane-orchestration surface. |
| Lightweight model fallback (codex) | Copilot delegates model selection to the host CLI; no in-plugin fallback layer. |
| Build-fix retry-cooldown (openagent zombie-pane pattern) | Build-fix just typed today; let it stabilize before adding retry semantics. |

## Implementation order

PR 1 → PR 2 → PR 3, but the three are independent and can land in
any order. PR 1 first because it's the smallest and exercises the
mirror discipline (good warm-up). PR 2 and PR 3 don't touch each
other's files.

## Success criteria

- Three PRs opened against `oh-my-copilot`, each under ~100 LOC
  (~25 / ~65 / ~60).
- All three pass `scripts/run-validation.sh` and the relevant
  `node --test` suite locally.
- Each PR body cites the upstream source it ports from.
- No new MCP tools, no new stores, no new skills, no new agents.
- `scripts/check-mirror-drift.sh` exits 0 on each branch.

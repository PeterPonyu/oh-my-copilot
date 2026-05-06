# Copilot CLI Plugin — Installation Guide

This guide covers installing the `oh-my-copilot` Copilot CLI plugin, building
the MCP server, verifying the install, and understanding log paths.

---

## Prerequisites

- GitHub Copilot CLI installed and authenticated (`copilot auth login` or
  equivalent)
- Node.js 18+ (required for the MCP server build)
- Bash 4+ (for hook scripts and smoke tests)

---

## Local install

Install from the checked-out repository path:

```bash
copilot plugin install /home/zeyufu/Desktop/oh-my-copilot/packages/copilot-cli-plugin
```

The CLI writes plugin metadata to `~/.copilot/config.json` and caches the
plugin under `~/.copilot/installed-plugins/_direct/...`.

---

## Remote install

Install directly from GitHub (no local clone required):

```bash
copilot plugin install PeterPonyu/oh-my-copilot:packages/copilot-cli-plugin
```

This fetches the plugin package from the repository and installs it into the
same local cache path as the direct install.

---

## Post-install: build the MCP server

After installing the plugin, build the bundled MCP server:

```bash
bash packages/copilot-cli-plugin/mcp-server/build.sh
```

This compiles the TypeScript MCP server and writes the output to
`packages/copilot-cli-plugin/mcp-server/dist/`. The MCP server exposes
6 tools: `read_file`, `write_file`, `run_command`, `list_directory`,
`search_files`, and `get_diagnostics`.

If the build fails, see the Troubleshooting section below.

---

## Verify the install

Check that the plugin is registered:

```bash
copilot plugin list
```

> Note: the exact output format of `copilot plugin list` may evolve across
> Copilot CLI versions. The strongest proof of installation is:
>
> 1. `~/.copilot/config.json` contains the plugin entry
> 2. The plugin directory exists under `~/.copilot/installed-plugins/_direct/`
> 3. A Copilot CLI session can see the plugin-provided skills

Verify skills are visible in a session:

```bash
copilot --agent 'omcp:reviewer' -p "ping" -s --model auto --allow-all
```

---

## Hook log paths

After the first session, the plugin writes structured logs to the project
root's `.copilot-hooks/` directory:

| File | Contents |
| --- | --- |
| `.copilot-hooks/events.jsonl` | Structured JSON event log (one event per line) |
| `.copilot-hooks/session.log` | Human-readable session summary |
| `.copilot-hooks/tools.log` | Tool call audit trail |
| `.copilot-hooks/warnings.log` | Policy gate warnings and preToolUse blocks |

Each project writes to its own `.copilot-hooks/` directory. Logs are never
shared across project roots.

The `sessionStart` hook bootstraps `.copilot-hooks/config.json` only if it is
missing — it does not overwrite existing config on every session start.

---

## Troubleshooting

### MCP server build failure

If `copilot plugin install` succeeds but the MCP server is not available:

```bash
cd packages/copilot-cli-plugin/mcp-server
bash build.sh
```

Check for Node.js version issues (`node --version` should be 18+) and ensure
`npm install` ran without errors inside the `mcp-server/` directory.

### Hook timeouts

Hook scripts have a default timeout enforced by Copilot CLI. If a hook times
out, check:

- Whether `scripts/policy-patterns.txt` contains overly broad patterns that
  cause the preToolUse scan to run slowly on large files.
- Whether `.copilot-hooks/events.jsonl` shows the last event before timeout.
- Whether the hook script has a stale lock file in `.copilot-hooks/`.

### preToolUse policy gate false positives

The `preToolUse` hook checks tool calls against policy patterns defined in
`scripts/policy-patterns.txt`. If a safe tool call is being blocked:

1. Open `scripts/policy-patterns.txt`
2. Find the pattern matching the false positive
3. Either narrow the regex or add an explicit allow-list entry above it
4. Re-run the smoke test to confirm the gate no longer fires

### Plugin not visible after install

If `copilot plugin list` shows no plugin or the agents are not accessible:

1. Check `~/.copilot/config.json` for the plugin entry
2. Confirm the plugin path under `~/.copilot/installed-plugins/_direct/` exists
3. Ensure `plugin.json` in the plugin package has valid JSON
4. Reinstall: `copilot plugin install <path>` is idempotent

---

## Smoke test

Run the bundled smoke test from the repository root:

```bash
bash scripts/smoke-copilot-cli.sh
```

**Green (pass):** All surface checks complete, hook log files are created under
`.copilot-hooks/`, and no error lines appear in `events.jsonl`.

**Red (fail):** One or more checks print `FAIL`. The script exits non-zero and
prints the first failing check. Fix the issue reported, then re-run.

For agent-level smoke evidence (requires a signed-in Copilot CLI session with
model access):

```bash
RUN_COPILOT_AGENT_SMOKE=1 bash scripts/smoke-copilot-cli.sh
```

---

## Uninstall

To remove the plugin:

```bash
copilot plugin uninstall omcp
```

Then remove the cache entry manually if it persists:

```bash
rm -rf ~/.copilot/installed-plugins/_direct/oh-my-copilot*
```

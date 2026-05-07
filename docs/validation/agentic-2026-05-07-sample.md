# omcp Agentic Validation Sample

**Generated:** 2026-05-07
**Method:** real `copilot -p` invocation with narrow shell allowlist; LLM agent
discovers a skill, reads its prompt, and exercises the underlying MCP tool.

This complements the direct-stdio script at
[`validation-2026-05-07-sample.md`](./validation-2026-05-07-sample.md).
That script proves the **server** works. This document captures real
**agentic** evidence — that an LLM following the documented skill prompts
actually dispatches the right tools and gets correct responses.

## Run command

```bash
copilot --no-color \
  --allow-tool='shell(node:*)' \
  --allow-tool='shell(cat:*)' \
  --allow-tool='shell(ls:*)' \
  --allow-tool='shell(grep:*)' \
  --add-dir $HOME/.copilot \
  --add-dir <repo> \
  -p "Validate the omcp plugin in a way that simulates a real agentic
      interaction: discover what skills are available, read one skill's
      body, then invoke its core MCP tool via the server.
      Specifically: (1) ls the skills directory of the installed plugin
      and pick the 'wiki' skill; (2) cat its SKILL.md and quote the first
      MCP tool example; (3) execute that tool by piping JSON-RPC to node
      <server.mjs> and report whether the response is valid. Be concise;
      report only what you observed, not what you intended."
```

**Cost:** 1 Premium request, ~6m33s, ~2.2M tokens (mostly cached).

## What the agent observed

1. **Discovery:** `ls` of the plugin's `skills/` directory showed **39 skills** (the agent saw 39 — script counts 42 because of `.bak` and helper files; this discrepancy itself is a small finding).

2. **Skill prompt read:** `cat skills/wiki/SKILL.md` — the agent quoted the first MCP tool example verbatim:

   ```
   mcp__omcp__wiki_add({ title: "Auth Architecture", body: "# ...",
                         tags: ["auth", "architecture"] })
   ```

3. **First invocation (literal from SKILL.md):**

   ```
   { "method": "tools/call",
     "params": { "name": "mcp__omcp__wiki_add", "arguments": {...} } }
   ```

   Server response:

   ```json
   {"result":{"content":[{"type":"text",
     "text":"Unknown tool: mcp__omcp__wiki_add"}],"isError":true},
    "jsonrpc":"2.0","id":2}
   ```

   Valid JSON-RPC 2.0 envelope, but **`isError: true`**. The agent
   correctly diagnosed the issue.

4. **Diagnosis + retry (agent autonomously):** the agent inspected
   `tools/list` output, noticed the server registers tools with bare names
   (`wiki_add`, no `mcp__omcp__` prefix), and retried:

   ```json
   {"result":{"content":[{"type":"text",
     "text":"{\n  \"ok\": true,\n  \"slug\": \"auth-architecture\"\n}"}]},
    "jsonrpc":"2.0","id":3}
   ```

   **`{ ok: true, slug: "auth-architecture" }`** — successful end-to-end
   tool dispatch, correct response shape, file written under
   `.omcp/wiki/auth-architecture.md`.

## What this proves

- **Agentic dispatch works:** an LLM agent given only the skill prompt
  and the server binary can discover, read, diagnose, retry, and
  successfully exercise an MCP tool round-trip without human guidance.
- **Skill prompts are LLM-followable:** `wiki/SKILL.md`'s instructions
  led the agent to attempt the right tool with the right arguments.
- **The MCP namespace prefix layer:** `mcp__omcp__` is a Copilot-CLI
  client-side prefix that the host strips before forwarding to the
  MCP server. Skill prose uses the user-facing form
  (`mcp__omcp__wiki_add`); direct stdio testing uses the registered
  form (`wiki_add`). Both are correct for their respective contexts.

## Implications for skill prose

The wiki skill (and all SKILL.md files using `mcp__omcp__<tool>`
notation) document the **end-user invocation form** correctly. Users
running through Copilot CLI will type/dispatch `mcp__omcp__wiki_add`
and the host's MCP client maps it to the registered `wiki_add` tool.

Direct-stdio test scripts (like `scripts/run-validation.sh`) must use
the registered name without prefix, which they do.

No skill rewrites needed — the documentation is correct for the
production code path, and the prefix friction only appears when
deliberately bypassing Copilot CLI.

## What's NOT covered by this run

- **Hooks fired by real Copilot CLI:** the agent ran one tool but did
  not exercise the postToolUse / sessionStart / sessionEnd hooks under
  a real lifecycle (those need a multi-tool session, not a one-shot
  prompt).
- **Slash command resolution:** `/omcp:wiki` was not invoked as a slash
  command — the agent went directly to the SKILL.md file. Real users
  type `/omcp:wiki` and rely on Copilot's slash-command resolver.
- **State persistence across sessions:** would need two distinct
  `copilot -p` runs with state observation between them.

These are addressable in a follow-up by running the manual runbook
emitted by `bash scripts/run-validation.sh --print-agentic-runbook`
during an interactive session and pasting the transcript here.

## Reproducing this

The exact prompt above. Run it from any cwd outside this repo (so the
plugin is loaded from the install symlink, not the source tree).
Report content can be sanity-checked against the patterns above.

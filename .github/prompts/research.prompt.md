---
name: research
description: Root alias for source-grounding a workspace, plugin, or Copilot capability claim.
agent: research
argument-hint: "<claim, question, or target file>"
---

Source-ground the requested claim or question using the root research agent.

Keep the review bounded to this repository's product surfaces:

- separate source-backed facts, repository evidence, and design inference;
- keep root workspace behavior distinct from reusable plugin behavior and
  illustrative examples;
- prefer official GitHub documentation and repository files over memory;
- mention the namespaced plugin route only when the user is explicitly testing
  reusable plugin behavior; and
- avoid OMC/OMX parity claims unless the exact claim is verified and bounded.

Return concise findings with file paths, cited sources, and confidence.

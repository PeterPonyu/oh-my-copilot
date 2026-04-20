---
name: review
description: Short alias for the root reviewer flow; checks scope, parity drift, and root/plugin/example boundaries.
agent: reviewer
argument-hint: "<target file, PR summary, or change>"
---

Review the target using the root-local `reviewer` agent.

This is the short invocation alias for `/review-scope`. Keep the review focused
on root workspace quality:

- scope or parity drift;
- root workspace vs reusable plugin vs illustrative example boundaries;
- prompt, agent, skill, or hook routing mistakes;
- duplicated plugin behavior that should stay canonical in
  `packages/copilot-cli-plugin/`; and
- missing verification evidence.

If the caller needs the reusable installed-plugin route instead, name it
explicitly as `oh-my-copilot-power-pack:reviewer` rather than treating this root
alias as the plugin agent.

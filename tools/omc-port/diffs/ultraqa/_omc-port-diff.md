# OMC -> OMX translation diff

Source: references/oh-my-claudecode/skills/ultraqa/SKILL.md
Replacements: 9

- line 18: `oh-my-claudecode:` -> `oh-my-copilot:`
- line 19: `oh-my-claudecode:` -> `oh-my-copilot:`
- line 20: `oh-my-claudecode:` -> `oh-my-copilot:`
- line 21: `oh-my-claudecode:` -> `oh-my-copilot:`
- line 22: `oh-my-claudecode:` -> `oh-my-copilot:`
- line 38: `Task(subagent_type="oh-my-claudecode:qa-tester", model="sonnet", prompt="TEST:
     Goal: [describe what to verify]
     Service: [how to start]
     Test cases: [specific scenarios to verify]")` -> `[Delegate to the qa-tester agent]\n<!-- TODO: agent qa-tester must be in agents/qa-tester.agent.md (Wave 4) -->`
- line 50: `Task(subagent_type="oh-my-claudecode:architect", model="opus", prompt="DIAGNOSE FAILURE:
   Goal: [goal type]
   Output: [test/build output]
   Provide root cause and specific fix recommendations.")` -> `[Delegate to the architect agent]\n<!-- TODO: agent architect must be in agents/architect.agent.md (Wave 4) -->`
- line 58: `Task(subagent_type="oh-my-claudecode:executor", model="sonnet", prompt="FIX:
   Issue: [architect diagnosis]
   Files: [affected files]
   Apply the fix precisely as recommended.")` -> `[Delegate to the executor agent]\n<!-- TODO: agent executor must be in agents/executor.agent.md (Wave 4) -->`
- line 100: `oh-my-claudecode:` -> `oh-my-copilot:`

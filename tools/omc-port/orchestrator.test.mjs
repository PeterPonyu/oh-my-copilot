// Test orchestrator: synthetic spec → plan → artifact chain
import { readStage, nextStage, transitionRecord } from '../../packages/copilot-cli-plugin/orchestrator/orchestrator.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'orch-test-'));
try {
  // Empty start
  const s0 = readStage(tmp);
  if (s0.transitions.length !== 0) throw new Error('expected 0 transitions');

  // Record spec
  transitionRecord({from: null, to: 'spec', artifact: 'spec.md', stateDir: tmp});
  const s1 = readStage(tmp);
  if (s1.transitions.length !== 1) throw new Error('expected 1 transition');
  if (s1.stages[0].name !== 'spec') throw new Error('expected spec stage');

  // Record plan
  transitionRecord({from: 'spec', to: 'plan', artifact: 'plan.md', stateDir: tmp});
  const s2 = readStage(tmp);
  if (s2.transitions.length !== 2) throw new Error('expected 2 transitions');

  // Record artifact
  transitionRecord({from: 'plan', to: 'artifact', artifact: 'thing.ts', stateDir: tmp});
  const s3 = readStage(tmp);
  if (s3.transitions.length !== 3) throw new Error('expected 3 transitions');
  if (nextStage('artifact') !== null) throw new Error('artifact should be terminal');

  console.log('OK: orchestrator test passed');
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
} finally {
  rmSync(tmp, {recursive: true, force: true});
}

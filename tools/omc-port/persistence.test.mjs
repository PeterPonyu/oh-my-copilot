/**
 * persistence.test.mjs — US-003 cross-invocation persistence test
 *
 * Verifies:
 *   1. pipeline-state.json is created on first transitionRecord call
 *   2. Two transitions are recorded correctly
 *   3. A separate node process can read both transitions back from disk
 */

import { transitionRecord, readStage } from '../../packages/copilot-cli-plugin/orchestrator/orchestrator.mjs';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const orchestratorPath = resolve(__dirname, 'orchestrator.mjs');

const tmp = mkdtempSync(join(tmpdir(), 'persist-test-'));

try {
  // --- Run 1: record 2 transitions in this process ---
  transitionRecord({ from: null,   to: 'spec', artifact: 'spec.md', stateDir: tmp });
  transitionRecord({ from: 'spec', to: 'plan', artifact: 'plan.md', stateDir: tmp });

  // State file must exist after writes
  const stateFile = join(tmp, 'pipeline-state.json');
  if (!existsSync(stateFile)) {
    throw new Error('state file missing after two transitionRecord calls');
  }

  // Sanity-check in same process
  const inProc = readStage(tmp);
  if (inProc.transitions.length !== 2) {
    throw new Error(`expected 2 transitions in-process, got ${inProc.transitions.length}`);
  }
  if (inProc.stages.length < 1) {
    throw new Error(`expected at least 1 stage in-process, got ${inProc.stages.length}`);
  }

  // --- Run 2: separate node process reads same stateDir ---
  const childScript = `
import { readStage } from ${JSON.stringify('file://' + orchestratorPath)};
const s = readStage(${JSON.stringify(tmp)});
console.log('transitions:', s.transitions.length);
if (s.transitions.length !== 2) process.exit(2);
if (s.stages.length < 1)        process.exit(3);
`;

  const result = spawnSync(process.execPath, ['--input-type=module'], {
    input: childScript,
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    const detail = (result.stderr || '') + ' / ' + (result.stdout || '');
    throw new Error(`cross-process read failed (exit ${result.status}): ${detail}`);
  }

  if (!result.stdout.includes('transitions: 2')) {
    throw new Error(`expected "transitions: 2" in child stdout, got: ${result.stdout}`);
  }

  console.log('OK: persistence test passed (cross-process)');
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

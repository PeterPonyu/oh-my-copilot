/**
 * orchestrator.mjs — Pipeline state manager for oh-my-copilot
 *
 * Contract:
 *   readStage(stateDir?)       → reads pipeline-state.json, returns {stages, transitions} or empty shell
 *   nextStage(currentStage)    → returns next stage in: null→spec→plan→artifact→null
 *   transitionRecord({from, to, artifact, stateDir?})
 *                              → atomic-write update to pipeline-state.json
 *                                adds entry to transitions[] and upserts stages[]
 *
 * Uses only Node built-ins. Atomic write via writeFileSync(tmp) + renameSync(tmp, dest).
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { emitResourceUpdate } from '../mcp-server/events.mjs';

const PIPELINE_FILE = 'pipeline-state.json';

const STAGE_ORDER = [null, 'spec', 'plan', 'artifact', null];
const VALID_STAGES = new Set(['spec', 'plan', 'artifact']);

/**
 * Read the current pipeline state from disk.
 * @param {string} stateDir - directory containing pipeline-state.json
 * @returns {{ stages: Array, transitions: Array }}
 */
export function readStage(stateDir = '.omcp/state') {
  const dest = join(stateDir, PIPELINE_FILE);
  if (!existsSync(dest)) {
    return { stages: [], transitions: [] };
  }
  try {
    const raw = readFileSync(dest, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      stages: Array.isArray(parsed.stages) ? parsed.stages : [],
      transitions: Array.isArray(parsed.transitions) ? parsed.transitions : [],
    };
  } catch {
    return { stages: [], transitions: [] };
  }
}

/**
 * Return the next stage in the pipeline.
 * @param {string|null} currentStage - one of null, 'spec', 'plan', 'artifact'
 * @returns {string|null} next stage, or null if end-of-pipeline / starting
 */
export function nextStage(currentStage) {
  if (currentStage === null) return 'spec';
  if (currentStage === 'spec') return 'plan';
  if (currentStage === 'plan') return 'artifact';
  if (currentStage === 'artifact') return null;
  return null;
}

/**
 * Atomically record a pipeline stage transition.
 * @param {{ from: string|null, to: string, artifact: string, stateDir?: string }} opts
 */
export function transitionRecord({ from, to, artifact, stateDir = '.omcp/state' }) {
  if (!VALID_STAGES.has(to)) {
    throw new Error(`pipeline_record_transition: invalid stage "${to}"; must be one of: spec, plan, artifact`);
  }
  const normalizedFrom = from === 'null' || from === '' ? null : from;
  if (normalizedFrom !== null && !VALID_STAGES.has(normalizedFrom)) {
    throw new Error(`pipeline_record_transition: invalid from stage "${from}"; must be null or one of: spec, plan, artifact`);
  }
  // Ensure directory exists
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  const dest = join(stateDir, PIPELINE_FILE);
  const state = readStage(stateDir);

  const ts = new Date().toISOString();

  // Append transition entry
  state.transitions.push({ from: normalizedFrom, to, ts });

  // Upsert into stages[] — update if name matches, otherwise append
  const existingIdx = state.stages.findIndex((s) => s.name === to);
  const stageEntry = { name: to, status: 'completed', artifact, ts };
  if (existingIdx >= 0) {
    state.stages[existingIdx] = stageEntry;
  } else {
    state.stages.push(stageEntry);
  }

  // Atomic write: write to temp file then rename
  const tmpSuffix = randomBytes(6).toString('hex');
  const tmp = join(stateDir, `pipeline-state.${tmpSuffix}.tmp`);
  const serialized = JSON.stringify(state, null, 2);

  writeFileSync(tmp, serialized, 'utf8');
  renameSync(tmp, dest);

  emitResourceUpdate('omcp://pipeline/state');
}

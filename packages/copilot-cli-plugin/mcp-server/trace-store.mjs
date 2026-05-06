import { readFile, appendFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";

const TRACE_DIR = ".omcp/traces";
const DEFAULT_SESSION = "default";

const VALID_KINDS = [
  "tool_failure",
  "tool_call",
  "hypothesis",
  "evidence",
  "outcome",
  "note",
];

function traceDir() {
  return resolve(process.cwd(), TRACE_DIR);
}

function tracePath(sessionId) {
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("session_id must be a non-empty string");
  }
  if (sessionId.includes("..") || sessionId.includes("/") || sessionId.includes("\\")) {
    throw new Error("session_id must not contain '..', '/', or '\\\\'");
  }
  return join(traceDir(), `${sessionId}.jsonl`);
}

function resolveSession(sessionId) {
  return sessionId && typeof sessionId === "string" && sessionId.length > 0
    ? sessionId
    : DEFAULT_SESSION;
}

export async function traceWrite({
  kind,
  text,
  hypothesis,
  evidence,
  outcome,
  tool,
  exit_code,
  stderr_snippet,
  session_id,
} = {}) {
  if (!VALID_KINDS.includes(kind)) {
    throw new Error(`kind must be one of: ${VALID_KINDS.join(", ")}`);
  }
  const session = resolveSession(session_id);
  const filePath = tracePath(session);
  await mkdir(traceDir(), { recursive: true });

  const event = {
    ts: new Date().toISOString(),
    kind,
    session_id: session,
  };
  if (text !== undefined) event.text = text;
  if (hypothesis !== undefined) event.hypothesis = hypothesis;
  if (evidence !== undefined) event.evidence = evidence;
  if (outcome !== undefined) event.outcome = outcome;
  if (tool !== undefined) event.tool = tool;
  if (exit_code !== undefined) event.exit_code = exit_code;
  if (stderr_snippet !== undefined) event.stderr_snippet = stderr_snippet;

  await appendFile(filePath, JSON.stringify(event) + "\n", "utf8");
  return { ok: true, session_id: session, kind };
}

async function readTraceEvents(sessionId) {
  const filePath = tracePath(sessionId);
  if (!existsSync(filePath)) {
    return [];
  }
  const raw = await readFile(filePath, "utf8");
  const events = [];
  for (const line of raw.split("\n")) {
    if (line.length === 0) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // skip malformed line
    }
  }
  return events;
}

export async function traceTimeline({ session_id, limit, kind } = {}) {
  const session = resolveSession(session_id);
  let events = await readTraceEvents(session);
  if (typeof kind === "string") {
    events = events.filter((e) => e.kind === kind);
  }
  if (typeof limit === "number" && limit > 0) {
    events = events.slice(-limit);
  }
  return { session_id: session, events };
}

export async function traceSummary({ session_id } = {}) {
  const session = resolveSession(session_id);
  const events = await readTraceEvents(session);

  const byKind = {};
  for (const k of VALID_KINDS) byKind[k] = 0;
  let firstTs = null;
  let lastTs = null;
  let lastOutcome = null;
  const hypotheses = [];

  for (const e of events) {
    if (e.kind && byKind[e.kind] !== undefined) byKind[e.kind] += 1;
    if (e.ts) {
      if (firstTs === null || e.ts < firstTs) firstTs = e.ts;
      if (lastTs === null || e.ts > lastTs) lastTs = e.ts;
    }
    if (e.kind === "outcome") lastOutcome = e;
    if (e.kind === "hypothesis" && e.hypothesis) hypotheses.push(e.hypothesis);
  }

  return {
    session_id: session,
    total: events.length,
    byKind,
    first_ts: firstTs,
    last_ts: lastTs,
    last_outcome: lastOutcome,
    hypotheses,
  };
}

export async function traceListSessions() {
  const dir = traceDir();
  if (!existsSync(dir)) {
    return { sessions: [] };
  }
  const entries = await readdir(dir);
  const sessions = entries
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => f.slice(0, -".jsonl".length))
    .sort();
  return { sessions };
}

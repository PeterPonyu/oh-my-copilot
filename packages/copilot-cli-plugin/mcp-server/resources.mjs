// MCP Resources primitive for omcp.
//
// Exposes URI-addressable read-only resources, complementing the Tools
// surface:
//   omcp://wiki/<slug>                — wiki entry body (text/markdown)
//   omcp://traces/<sid>/timeline      — append-only event log (application/json)
//   omcp://traces/<sid>/summary       — aggregated summary (application/json)
//   omcp://state/<key>                — orchestration-mode state JSON
//   omcp://pipeline/state             — autopilot pipeline state JSON
//
// Also owns the subscription registry: which URIs clients have subscribed
// to via resources/subscribe. server.mjs forwards "updated" events from
// the resource event bus (events.mjs) to subscribed clients via
// notifications/resources/updated.

import { wikiList, wikiRead } from "./wiki-store.mjs";
import {
  traceListSessions,
  traceTimeline,
  traceSummary,
} from "./trace-store.mjs";
import { stateRead, stateList } from "./state-store.mjs";
import { readStage } from "../orchestrator/orchestrator.mjs";

const URI_RE = /^omcp:\/\/(wiki|traces|state|pipeline)\/([^/]+)(?:\/([^/]+))?$/;
const PIPELINE_URI = "omcp://pipeline/state";

// --- Resource listing / reading -----------------------------------------

export async function listResources() {
  const resources = [];

  const wiki = await wikiList({});
  for (const entry of wiki.entries) {
    resources.push({
      uri: `omcp://wiki/${entry.slug}`,
      name: entry.title ?? entry.slug,
      description: entry.tags?.length
        ? `Wiki entry [${entry.tags.join(", ")}]`
        : "Wiki entry",
      mimeType: "text/markdown",
    });
  }

  const traces = await traceListSessions();
  for (const sid of traces.sessions) {
    resources.push({
      uri: `omcp://traces/${sid}/timeline`,
      name: `Trace timeline ${sid}`,
      description: "Append-only event log for the trace session",
      mimeType: "application/json",
    });
    resources.push({
      uri: `omcp://traces/${sid}/summary`,
      name: `Trace summary ${sid}`,
      description: "Aggregate summary of the trace session",
      mimeType: "application/json",
    });
  }

  const state = await stateList();
  for (const key of state.keys) {
    resources.push({
      uri: `omcp://state/${key}`,
      name: `State ${key}`,
      description: "Orchestration-mode state entry",
      mimeType: "application/json",
    });
  }

  resources.push({
    uri: PIPELINE_URI,
    name: "Pipeline state",
    description: "Autopilot pipeline state (stages + transitions)",
    mimeType: "application/json",
  });

  return { resources };
}

export async function readResource({ uri } = {}) {
  if (typeof uri !== "string" || uri.length === 0) {
    throw new Error("readResource requires non-empty 'uri'");
  }

  if (uri === PIPELINE_URI) {
    const s = readStage();
    return {
      contents: [
        { uri, mimeType: "application/json", text: JSON.stringify(s) },
      ],
    };
  }

  const m = uri.match(URI_RE);
  if (!m) {
    throw new Error(`unsupported resource uri: ${uri}`);
  }
  const [, kind, key, view] = m;

  if (kind === "wiki") {
    const r = await wikiRead({ slug: key });
    if (!r.exists) {
      throw new Error(`wiki entry not found: ${key}`);
    }
    return {
      contents: [
        { uri, mimeType: "text/markdown", text: r.body },
      ],
    };
  }

  if (kind === "traces") {
    const sid = key;
    const which = view || "timeline";
    if (which === "timeline") {
      const t = await traceTimeline({ session_id: sid });
      return {
        contents: [
          { uri, mimeType: "application/json", text: JSON.stringify(t) },
        ],
      };
    }
    if (which === "summary") {
      const s = await traceSummary({ session_id: sid });
      return {
        contents: [
          { uri, mimeType: "application/json", text: JSON.stringify(s) },
        ],
      };
    }
    throw new Error(`unsupported trace view: ${view}`);
  }

  if (kind === "state") {
    const r = await stateRead(key);
    if (!r.exists) {
      throw new Error(`state entry not found: ${key}`);
    }
    return {
      contents: [
        { uri, mimeType: "application/json", text: JSON.stringify(r.value) },
      ],
    };
  }

  throw new Error(`unhandled uri kind: ${kind}`);
}

// --- Subscription registry ----------------------------------------------
//
// Clients call resources/subscribe(uri); we record the URI and notify
// them via notifications/resources/updated when the resource changes.
// The set is process-scoped — there is one server process per Copilot
// CLI session, so a Set is sufficient.

const subscriptions = new Set();

export function subscribeResource(uri) {
  if (typeof uri !== "string" || uri.length === 0) {
    throw new Error("subscribeResource requires non-empty 'uri'");
  }
  if (uri !== PIPELINE_URI && !URI_RE.test(uri)) {
    throw new Error(`cannot subscribe to unsupported uri: ${uri}`);
  }
  subscriptions.add(uri);
  return { ok: true };
}

export function unsubscribeResource(uri) {
  if (typeof uri !== "string" || uri.length === 0) {
    throw new Error("unsubscribeResource requires non-empty 'uri'");
  }
  const removed = subscriptions.delete(uri);
  return { ok: true, removed };
}

export function isResourceSubscribed(uri) {
  return subscriptions.has(uri);
}

export function listResourceSubscriptions() {
  return [...subscriptions];
}

// Test-only: drop all subscriptions. Used to keep test cases independent.
export function _clearResourceSubscriptions() {
  subscriptions.clear();
}

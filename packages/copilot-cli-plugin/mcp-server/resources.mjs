// MCP Resources primitive for omcp.
//
// Exposes wiki entries and trace sessions as URI-addressable read-only
// resources, complementing the Tools surface:
//   omcp://wiki/<slug>                — wiki entry body (text/markdown)
//   omcp://traces/<session>/timeline  — append-only event log (application/json)
//   omcp://traces/<session>/summary   — aggregated summary (application/json)
//
// These functions are pure (no MCP server dependency) so the unit tests
// invoke them directly. server.mjs binds them to ListResourcesRequestSchema
// and ReadResourceRequestSchema handlers.

import { wikiList, wikiRead } from "./wiki-store.mjs";
import {
  traceListSessions,
  traceTimeline,
  traceSummary,
} from "./trace-store.mjs";

const URI_RE = /^omcp:\/\/(wiki|traces)\/([^/]+)(?:\/([^/]+))?$/;

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

  return { resources };
}

export async function readResource({ uri } = {}) {
  if (typeof uri !== "string" || uri.length === 0) {
    throw new Error("readResource requires non-empty 'uri'");
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
        {
          uri,
          mimeType: "text/markdown",
          text: r.body,
        },
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
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(t),
          },
        ],
      };
    }
    if (which === "summary") {
      const s = await traceSummary({ session_id: sid });
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(s),
          },
        ],
      };
    }
    throw new Error(`unsupported trace view: ${view}`);
  }

  throw new Error(`unhandled uri kind: ${kind}`);
}

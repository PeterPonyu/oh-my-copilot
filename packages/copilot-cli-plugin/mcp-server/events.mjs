// Resource-change event bus for the omcp MCP server.
//
// Stores that mutate a resource emit "updated" with the resource URI.
// The MCP server (server.mjs) listens on this bus, looks up subscribed
// URIs in the subscription registry (resources.mjs), and forwards
// notifications/resources/updated to subscribed clients.
//
// Why a separate module: avoids a cycle between stores (which emit
// after their own writes) and resources.mjs (which holds the subscriber
// set + dispatches to clients via server.notification).

import { EventEmitter } from "node:events";

export const resourceEvents = new EventEmitter();

// Resist unbounded listener growth from accidental re-registrations.
// In practice we only register one listener (from server.mjs).
resourceEvents.setMaxListeners(8);

export function emitResourceUpdate(uri) {
  if (typeof uri === "string" && uri.length > 0) {
    resourceEvents.emit("updated", uri);
  }
}

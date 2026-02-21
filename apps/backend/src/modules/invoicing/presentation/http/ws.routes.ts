import { Elysia } from "elysia";

import { ApiRoutes } from "@distributed-systems/shared";

// Module-level set of send functions — one per connected WebSocket client.
// Using a plain Set<fn> (not a class) is intentional: it's the simplest structure
// that solves the problem. The consumer imports this set directly to broadcast.
// SendFn accepts a pre-serialised string to avoid coupling to Bun's generic WS type.
type SendFn = (data: string) => void;

export const wsConnections = new Set<SendFn>();

export const wsRoutes = new Elysia().ws(ApiRoutes.WS, {
  open(ws) {
    // Capture ws.send as a closure so the consumer doesn't need the ws object.
    const send: SendFn = (data) => ws.send(data);
    wsConnections.add(send);
    // Store the send fn keyed by the raw ws object for removal on close.
    wsRegistry.set(ws.raw, send);
  },
  close(ws) {
    const send = wsRegistry.get(ws.raw);
    if (send) {
      wsConnections.delete(send);
      wsRegistry.delete(ws.raw);
    }
  },
  message(_ws, _message) {
    // No client→server messages expected in this protocol.
  },
});

// Registry to map the raw WS object back to its send fn for cleanup on close.
const wsRegistry = new Map<object, SendFn>();

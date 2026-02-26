import { Elysia } from "elysia";

import { ApiRoutes } from "@distributed-systems/shared";

import { authPlugin } from "#shared/plugins/auth.plugin";

// Map of userId → set of send functions, one per active WS connection for that user.
// Using a Map<userId, Set<SendFn>> instead of a flat Set so consumers can route
// events only to the owner of the invoice, not broadcast to everyone.
type SendFn = (data: string) => void;

export const wsConnections = new Map<number, Set<SendFn>>();

// Registry to map the raw WS object back to { userId, send } for cleanup on close.
const wsRegistry = new Map<object, { userId: number; send: SendFn }>();

// wsRoutes is a factory so the jwtSecret can be injected from index.ts,
// keeping process.env reads centralised — same pattern as authRoutes.
export function wsRoutes(jwtSecret: string) {
  return new Elysia().use(authPlugin({ jwtSecret })).ws(ApiRoutes.WS, {
    open(ws) {
      const userId = ws.data.currentUser.userId;
      const send: SendFn = (data) => ws.send(data);

      // Register the send fn under the user's id.
      if (!wsConnections.has(userId)) wsConnections.set(userId, new Set());
      wsConnections.get(userId)!.add(send);

      // Store both userId and send so close() can remove the right entry.
      wsRegistry.set(ws.raw, { userId, send });
    },
    close(ws) {
      const entry = wsRegistry.get(ws.raw);
      if (entry) {
        const { userId, send } = entry;
        const userSends = wsConnections.get(userId);
        userSends?.delete(send);
        // Clean up the Map entry entirely if the user has no more connections.
        if (userSends?.size === 0) wsConnections.delete(userId);
        wsRegistry.delete(ws.raw);
      }
    },
    message(_ws, _message) {
      // No client→server messages expected in this protocol.
    },
  });
}

import { Elysia } from "elysia";

// Injects a `requestId` into the Elysia context for every request.
// The value is read from the standard X-Request-ID header when present
// (allows clients and API gateways to supply their own id), or a fresh
// UUID is generated so every request has a correlation id regardless.
//
// Scope is "scoped" so that parent Elysia instances that call `.use(requestIdPlugin)`
// also have `requestId` available in their hooks (e.g. onRequest, onAfterResponse).
//
// Usage:
//   new Elysia().use(requestIdPlugin).get('/', ({ requestId }) => requestId)
export const requestIdPlugin = new Elysia({ name: "request-id-plugin" }).derive(
  { as: "scoped" },
  ({ request }) => ({
    requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
  }),
);

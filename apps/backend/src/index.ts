import { Elysia } from "elysia";

import { createLogger } from "@distributed-systems/logger";
import { ApiRoutes } from "@distributed-systems/shared";

import { startInvoiceCompletedConsumer } from "#invoicing/infrastructure/messaging/invoice-completed.consumer";
import { startInvoiceFailedConsumer } from "#invoicing/infrastructure/messaging/invoice-failed.consumer";
import { startInvoiceInProgressConsumer } from "#invoicing/infrastructure/messaging/invoice-inprogress.consumer";
import { invoiceRoutes } from "#invoicing/presentation/http/invoice.routes";
import { wsRoutes } from "#invoicing/presentation/http/ws.routes";
import { requestIdPlugin } from "#shared/plugins/request-id.plugin";
import { authRoutes } from "#users/presentation/http/auth.routes";
import { userRoutes } from "#users/presentation/http/user.routes";

const logger = createLogger("backend");

// Single source of truth for the JWT secret, passed explicitly to all modules
// that require it.
const jwtSecret = process.env.JWT_SECRET ?? "supersecret_changeme";

// RabbitMQ consumers for real-time UI updates via WebSocket.
await startInvoiceInProgressConsumer();
await startInvoiceCompletedConsumer();
await startInvoiceFailedConsumer();

const app = new Elysia()
  .use(requestIdPlugin)

  // onRequest fires BEFORE derive — requestId is not yet in context here.
  // Read directly from the header (same logic as the plugin) for logging.
  .onRequest(({ request }) => {
    const requestId = request.headers.get("x-request-id") ?? "(pending)";
    logger.info({ requestId, method: request.method, url: request.url }, "request");
  })
  // onAfterResponse fires AFTER derive — requestId is available.
  .onAfterResponse(({ request, set, requestId }) => {
    // Return the requestId to the client so it can reference it in bug reports.
    set.headers["x-request-id"] = requestId;
    logger.info(
      { requestId, method: request.method, url: request.url, status: set.status },
      "response",
    );
  })
  .onError(({ request, error }) => {
    const requestId = request.headers.get("x-request-id") ?? "(unknown)";
    logger.error({ requestId, method: request.method, url: request.url, err: error }, "error");
  })

  .get(ApiRoutes.HEALTH, () => ({ status: "ok" }))

  // Routes are grouped by domain module. Each factory receives the necessary
  // configuration, such as the JWT secret for authentication/guards.
  .use(authRoutes({ jwtSecret }))
  .use(userRoutes({ jwtSecret }))
  .use(invoiceRoutes({ jwtSecret }))
  .use(wsRoutes(jwtSecret))

  .listen({ port: Number(process.env.PORT ?? 3000), hostname: "0.0.0.0" });

logger.info({ port: app.server?.port }, "backend started");

process.on("SIGTERM", () => {
  app.stop();
  process.exit(0);
});
process.on("SIGINT", () => {
  app.stop();
  process.exit(0);
});

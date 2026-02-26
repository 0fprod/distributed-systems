import { Elysia } from "elysia";

import { ApiRoutes } from "@distributed-systems/shared";

import { startInvoiceCompletedConsumer } from "#invoicing/infrastructure/messaging/invoice-completed.consumer";
import { startInvoiceFailedConsumer } from "#invoicing/infrastructure/messaging/invoice-failed.consumer";
import { startInvoiceInProgressConsumer } from "#invoicing/infrastructure/messaging/invoice-inprogress.consumer";
import { invoiceRoutes } from "#invoicing/presentation/http/invoice.routes";
import { wsRoutes } from "#invoicing/presentation/http/ws.routes";
import { authRoutes } from "#users/presentation/http/auth.routes";
import { userRoutes } from "#users/presentation/http/user.routes";

// Single source of truth for the JWT secret, passed explicitly to all modules
// that require it.
const jwtSecret = process.env.JWT_SECRET ?? "supersecret_changeme";

// RabbitMQ consumers for real-time UI updates via WebSocket.
await startInvoiceInProgressConsumer();
await startInvoiceCompletedConsumer();
await startInvoiceFailedConsumer();

const app = new Elysia()
  .get(ApiRoutes.HEALTH, () => ({ status: "ok" }))

  // Routes are grouped by domain module. Each factory receives the necessary
  // configuration, such as the JWT secret for authentication/guards.
  .use(authRoutes({ jwtSecret }))
  .use(userRoutes({ jwtSecret }))
  .use(invoiceRoutes({ jwtSecret }))
  .use(wsRoutes(jwtSecret))

  .listen({ port: Number(process.env.PORT ?? 3000), hostname: "0.0.0.0" });

console.log(`[backend] running on http://0.0.0.0:${app.server?.port}`);

process.on("SIGTERM", () => {
  app.stop();
  process.exit(0);
});
process.on("SIGINT", () => {
  app.stop();
  process.exit(0);
});

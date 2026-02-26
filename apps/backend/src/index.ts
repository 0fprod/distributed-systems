import { Elysia } from "elysia";

import { ApiRoutes } from "@distributed-systems/shared";

import { startInvoiceCompletedConsumer } from "#invoicing/infrastructure/messaging/invoice-completed.consumer";
import { startInvoiceFailedConsumer } from "#invoicing/infrastructure/messaging/invoice-failed.consumer";
import { startInvoiceInProgressConsumer } from "#invoicing/infrastructure/messaging/invoice-inprogress.consumer";
import { invoiceRoutes } from "#invoicing/presentation/http/invoice.routes";
import { wsRoutes } from "#invoicing/presentation/http/ws.routes";
import { authRoutes } from "#users/presentation/http/auth.routes";
import { userRoutes } from "#users/presentation/http/user.routes";

// The JWT secret is read once at startup and passed into plugins explicitly —
// this avoids scattering process.env.JWT_SECRET reads throughout the codebase.
const jwtSecret = process.env.JWT_SECRET ?? "supersecret_changeme";

// Start RabbitMQ consumers before accepting HTTP traffic so no messages are
// missed during startup.
await startInvoiceInProgressConsumer();
await startInvoiceCompletedConsumer();
await startInvoiceFailedConsumer();

const app = new Elysia()
  .get(ApiRoutes.HEALTH, () => ({ status: "ok" }))
  .use(invoiceRoutes)
  .use(userRoutes)
  .use(authRoutes({ jwtSecret }))
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

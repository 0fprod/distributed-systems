import { Elysia } from "elysia";

import { startInvoiceCompletedConsumer } from "#invoicing/infrastructure/messaging/invoice-completed.consumer";
import { startInvoiceFailedConsumer } from "#invoicing/infrastructure/messaging/invoice-failed.consumer";
import { startInvoiceInProgressConsumer } from "#invoicing/infrastructure/messaging/invoice-inprogress.consumer";
import { invoiceRoutes } from "#invoicing/presentation/http/invoice.routes";
import { wsRoutes } from "#invoicing/presentation/http/ws.routes";

// Start RabbitMQ consumers before accepting HTTP traffic so no messages are
// missed during startup.
await startInvoiceInProgressConsumer();
await startInvoiceCompletedConsumer();
await startInvoiceFailedConsumer();

const app = new Elysia()
  .get("/health", () => ({ status: "ok" }))
  .use(invoiceRoutes)
  .use(wsRoutes)
  .listen(3000);

console.log(`[backend] running on http://localhost:${app.server?.port}`);

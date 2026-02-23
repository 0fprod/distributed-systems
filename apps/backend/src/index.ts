import { Elysia } from "elysia";

import { startInvoiceCompletedConsumer } from "#modules/invoicing/infrastructure/messaging/invoice-completed.consumer";
import { startInvoiceFailedConsumer } from "#modules/invoicing/infrastructure/messaging/invoice-failed.consumer";
import { startInvoiceInProgressConsumer } from "#modules/invoicing/infrastructure/messaging/invoice-inprogress.consumer";
import { invoiceRoutes } from "#modules/invoicing/presentation/http/invoice.routes";
import { wsRoutes } from "#modules/invoicing/presentation/http/ws.routes";

// Start RabbitMQ consumers before accepting HTTP traffic so no messages are
// missed during startup. Each consumer binds its own exclusive queue to its
// respective fanout exchange.
await startInvoiceInProgressConsumer();
await startInvoiceCompletedConsumer();
await startInvoiceFailedConsumer();

const app = new Elysia()
  .get("/health", () => ({ status: "ok" }))
  .use(invoiceRoutes)
  .use(wsRoutes)
  .listen(3000);

console.log(`[backend] running on http://localhost:${app.server?.port}`);

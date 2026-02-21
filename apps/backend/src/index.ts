import { Elysia } from "elysia";

import { startInvoiceCompletedConsumer } from "#modules/invoicing/infrastructure/messaging/invoice-completed.consumer";
import { invoiceRoutes } from "#modules/invoicing/presentation/http/invoice.routes";
import { wsRoutes } from "#modules/invoicing/presentation/http/ws.routes";

// Start the RabbitMQ consumer before accepting HTTP traffic so no
// "invoices.completed" messages are missed during startup.
await startInvoiceCompletedConsumer();

const app = new Elysia()
  .get("/health", () => ({ status: "ok" }))
  .use(invoiceRoutes)
  .use(wsRoutes)
  .listen(3000);

console.log(`[backend] running on http://localhost:${app.server?.port}`);

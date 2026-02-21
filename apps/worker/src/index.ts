import { startInvoiceCreatedConsumer } from "#modules/invoicing/infrastructure/messaging/invoice-created.consumer";

await startInvoiceCreatedConsumer();

console.log("[worker] started — consuming invoices.created");

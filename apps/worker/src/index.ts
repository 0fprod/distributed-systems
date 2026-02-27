import { createLogger } from "@distributed-systems/logger";

import { startInvoiceCreatedConsumer } from "#invoicing/infrastructure/messaging/invoice-created.consumer";

const logger = createLogger("worker");

await startInvoiceCreatedConsumer();

logger.info("worker started");

import { initWorkerOtel } from "@distributed-systems/otel";

// Must be called before any other imports that use @opentelemetry/api so the
// global TracerProvider is registered before packages/rabbitmq creates spans.
initWorkerOtel();

import { createLogger } from "@distributed-systems/logger";

import { startInvoiceCreatedConsumer } from "#invoicing/infrastructure/messaging/invoice-created.consumer";

const logger = createLogger("worker");

await startInvoiceCreatedConsumer();

logger.info({}, "worker started");

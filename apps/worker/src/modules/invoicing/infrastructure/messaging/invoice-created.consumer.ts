import { createLogger, runWithContext } from "@distributed-systems/logger";
import { QueueNames, subscribeWork } from "@distributed-systems/rabbitmq";
import { InvoiceExchanges, type InvoiceMessagePayload } from "@distributed-systems/shared";

import { processInvoiceHandler } from "#invoicing/application/commands/process-invoice/process-invoice.handler";
import { prismaInvoiceRepository } from "#invoicing/infrastructure/repositories/prisma-invoice.repository";
import { prismaUserRepository } from "#invoicing/infrastructure/repositories/prisma-user.repository";

import { invoicePublisher } from "./invoice-publisher";

const logger = createLogger("invoice-created-consumer");

// Type guard: validates the message shape from the RabbitMQ fanout exchange.
// IDs are UUID strings (changed from numbers when schema migrated to uuid()).
// requestId is optional — legacy messages published before correlation IDs
// were introduced will not have the field, and that is acceptable.
function isInvoiceCreatedPayload(v: unknown): v is InvoiceMessagePayload {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as InvoiceMessagePayload).invoiceId === "string" &&
    typeof (v as InvoiceMessagePayload).userId === "string"
    // requestId is deliberately not validated — it is optional
  );
}

// Starts a work-queue consumer on the "invoices.created" fanout exchange.
// Each message triggers a ProcessInvoiceHandler call.
// Using a named durable queue (work-queue semantics) so multiple worker
// instances compete for messages — each invoice is processed exactly once
// regardless of how many workers are running.
// Failed messages are routed to the DLQ for inspection and manual replay.
// prefetch defaults to 1 in subscribeWork — broker withholds the next message
// until the worker acks the current one.
export async function startInvoiceCreatedConsumer(): Promise<void> {
  await subscribeWork(
    InvoiceExchanges.CREATED,
    QueueNames.WORKER_INVOICES_CREATED,
    async (payload) => {
      if (!isInvoiceCreatedPayload(payload)) {
        logger.warn({ payload }, "unexpected payload");
        // Throwing here causes subscribeWork's catch block to nack without
        // requeue, routing the malformed message to the DLQ.
        throw new Error("invalid payload");
      }

      const { invoiceId, userId, requestId } = payload;

      // Fall back to a fresh UUID when the message was published by a legacy
      // backend that did not carry correlation IDs yet.
      const effectiveRequestId = requestId ?? crypto.randomUUID();

      const processInvoiceCommand = { invoiceId, userId };
      const deps = {
        publisher: invoicePublisher,
        invoiceRepository: prismaInvoiceRepository,
        userRepository: prismaUserRepository,
      };

      // Wrap the entire handler execution in a context so every log call made
      // inside processInvoiceHandler (and its repositories) will automatically
      // include the same requestId that originated the HTTP request.
      await runWithContext(effectiveRequestId, () =>
        processInvoiceHandler(processInvoiceCommand, deps),
      );
    },
  );

  logger.info({ queue: QueueNames.WORKER_INVOICES_CREATED }, "consumer started");
}

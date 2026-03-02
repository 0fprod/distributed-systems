/**
 * Worker test double — used by the integration test setup instead of the real worker.
 *
 * Identical to the real worker's invoice-created consumer except that
 * processInvoice is a no-op, so tests are not blocked by the 10 s simulation.
 * Any real business logic (DB reads/writes, RabbitMQ events) still executes,
 * making this a genuine integration test of the full pipeline.
 */
import { createLogger, runWithContext } from "@distributed-systems/logger";
import { QueueNames, subscribeWork } from "@distributed-systems/rabbitmq";
import { InvoiceExchanges, type InvoiceMessagePayload } from "@distributed-systems/shared";

import { processInvoiceHandler } from "../../apps/worker/src/modules/invoicing/application/commands/process-invoice/process-invoice.handler";
import { invoicePublisher } from "../../apps/worker/src/modules/invoicing/infrastructure/messaging/invoice-publisher";
import { prismaInvoiceRepository } from "../../apps/worker/src/modules/invoicing/infrastructure/repositories/prisma-invoice.repository";
import { prismaUserRepository } from "../../apps/worker/src/modules/invoicing/infrastructure/repositories/prisma-user.repository";

const logger = createLogger("worker-double");

function isInvoiceCreatedPayload(v: unknown): v is InvoiceMessagePayload {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as InvoiceMessagePayload).invoiceId === "string" &&
    typeof (v as InvoiceMessagePayload).userId === "string"
  );
}

await subscribeWork(
  InvoiceExchanges.CREATED,
  QueueNames.WORKER_INVOICES_CREATED,
  async (payload) => {
    if (!isInvoiceCreatedPayload(payload)) {
      throw new Error("worker-double: invalid payload");
    }

    const { invoiceId, userId, requestId } = payload;
    const effectiveRequestId = requestId ?? crypto.randomUUID();

    await runWithContext(effectiveRequestId, () =>
      processInvoiceHandler(
        { invoiceId, userId },
        {
          publisher: invoicePublisher,
          invoiceRepository: prismaInvoiceRepository,
          userRepository: prismaUserRepository,
          processInvoice: async () => {}, // no-op: skips the expensive operation
        },
      ),
    );
  },
);

logger.info({}, "worker-double started");

import { QueueNames, subscribeWork } from "@distributed-systems/rabbitmq";
import { InvoiceExchanges } from "@distributed-systems/shared";

import { processInvoiceHandler } from "../../application/commands/process-invoice/process-invoice.handler";
import { invoicePublisher } from "./invoice-publisher";

interface InvoiceCreatedPayload {
  invoiceId: number;
}

function isInvoiceCreatedPayload(v: unknown): v is InvoiceCreatedPayload {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>).invoiceId === "number"
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
        console.warn("[consumer] unexpected invoices.created payload", payload);
        // Throwing here causes subscribeWork's catch block to nack without
        // requeue, routing the malformed message to the DLQ.
        throw new Error("invalid payload");
      }

      const processInvoiceCommand = { invoiceId: payload.invoiceId };
      const deps = { publisher: invoicePublisher };

      await processInvoiceHandler(processInvoiceCommand, deps);
    },
  );

  console.log(`[worker] work-queue consumer started on "${QueueNames.WORKER_INVOICES_CREATED}"`);
}

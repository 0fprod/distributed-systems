import { subscribe } from "@distributed-systems/rabbitmq";
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

// Starts consuming the "invoices.created" fanout exchange.
// Each message triggers a ProcessInvoiceHandler call.
// Using an exclusive, auto-delete queue so multiple worker instances each
// process every invoice independently (fanout semantics).
// prefetch(1): process one invoice at a time per worker instance to prevent
// a single slow invoice from monopolising the channel.
export async function startInvoiceCreatedConsumer(): Promise<void> {
  await subscribe(
    InvoiceExchanges.CREATED,
    async (payload) => {
      if (!isInvoiceCreatedPayload(payload)) {
        console.warn("[consumer] unexpected invoices.created payload", payload);
        // Throwing here causes subscribe's catch block to nack without requeue,
        // which prevents a malformed message from looping forever.
        throw new Error("invalid payload");
      }

      const processInvoiceCommand = { invoiceId: payload.invoiceId };
      const deps = { publisher: invoicePublisher };

      await processInvoiceHandler(processInvoiceCommand, deps);
    },
    // prefetch: 1 — work-queue semantics: broker withholds the next message
    // until the worker acks the current one.
    { prefetch: 1 },
  );

  console.log(`[worker] consuming "${InvoiceExchanges.CREATED}"`);
}

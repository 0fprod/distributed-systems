import { InvoiceExchanges } from "@distributed-systems/shared";

import { getRabbitMQChannel } from "#shared/infrastructure/messaging/rabbitmq.connection";

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
export async function startInvoiceCreatedConsumer(): Promise<void> {
  const channel = await getRabbitMQChannel();

  await channel.assertExchange(InvoiceExchanges.CREATED, "fanout", { durable: true });

  const { queue } = await channel.assertQueue("", { exclusive: true, autoDelete: true });
  await channel.bindQueue(queue, InvoiceExchanges.CREATED, "");

  // prefetch(1): process one invoice at a time per worker instance.
  // This prevents a single slow invoice from blocking others only when concurrency > 1.
  await channel.prefetch(1);

  await channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString()) as unknown;

      if (!isInvoiceCreatedPayload(payload)) {
        console.warn("[consumer] unexpected invoices.created payload", payload);
        channel.nack(msg, false, false);
        return;
      }

      await processInvoiceHandler(
        { invoiceId: payload.invoiceId },
        { publisher: invoicePublisher },
      );

      channel.ack(msg);
    } catch (err) {
      console.error("[consumer] processInvoiceHandler failed", err);
      channel.nack(msg, false, false);
    }
  });

  console.log(`[worker] consuming "invoices.created" via queue "${queue}"`);
}

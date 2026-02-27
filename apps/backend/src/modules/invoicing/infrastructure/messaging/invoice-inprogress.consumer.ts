import { createLogger } from "@distributed-systems/logger";
import { subscribe } from "@distributed-systems/rabbitmq";
import { InvoiceEvents, InvoiceExchanges } from "@distributed-systems/shared";

import { wsConnections } from "#invoicing/presentation/http/ws.routes";

const logger = createLogger("invoice-consumer");

interface InvoiceInProgressPayload {
  invoiceId: string;
  userId: string;
}

function isInvoiceInProgressPayload(v: unknown): v is InvoiceInProgressPayload {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>).invoiceId === "string" &&
    typeof (v as Record<string, unknown>).userId === "string"
  );
}

// Starts consuming the "invoices.inprogress" fanout exchange.
// On each message: broadcasts { type: "invoice:inprogress", invoiceId } to all
// connected WebSocket clients. The consumer and WS routes are decoupled via the
// module-level wsConnections Set — no class required.
export async function startInvoiceInProgressConsumer(): Promise<void> {
  await subscribe(InvoiceExchanges.INPROGRESS, async (payload) => {
    if (!isInvoiceInProgressPayload(payload)) {
      logger.warn({ exchange: InvoiceExchanges.INPROGRESS, payload }, "unexpected payload");
      return;
    }

    const message = JSON.stringify({
      type: InvoiceEvents.INPROGRESS,
      invoiceId: payload.invoiceId,
    });

    const send = wsConnections.get(payload.userId);
    if (send) {
      for (const s of send) {
        s(message);
      }
    }

    logger.info({ invoiceId: payload.invoiceId }, "invoice:inprogress broadcasted");
  });
}

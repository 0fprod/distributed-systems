import { subscribe } from "@distributed-systems/rabbitmq";
import { InvoiceEvents, InvoiceExchanges } from "@distributed-systems/shared";

import { wsConnections } from "#invoicing/presentation/http/ws.routes";

interface InvoiceInProgressPayload {
  invoiceId: number;
  userId: number;
}

function isInvoiceInProgressPayload(v: unknown): v is InvoiceInProgressPayload {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>).invoiceId === "number" &&
    typeof (v as Record<string, unknown>).userId === "number"
  );
}

// Starts consuming the "invoices.inprogress" fanout exchange.
// On each message: broadcasts { type: "invoice:inprogress", invoiceId } to all
// connected WebSocket clients. The consumer and WS routes are decoupled via the
// module-level wsConnections Set — no class required.
export async function startInvoiceInProgressConsumer(): Promise<void> {
  await subscribe(InvoiceExchanges.INPROGRESS, async (payload) => {
    if (!isInvoiceInProgressPayload(payload)) {
      console.warn("[consumer] unexpected invoices.inprogress payload", payload);
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

    console.log(`[consumer] broadcasted invoice:inprogress for invoiceId=${payload.invoiceId}`);
  });
}

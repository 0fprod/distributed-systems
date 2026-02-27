import { subscribe } from "@distributed-systems/rabbitmq";
import { InvoiceEvents, InvoiceExchanges } from "@distributed-systems/shared";

import { wsConnections } from "#invoicing/presentation/http/ws.routes";

interface InvoiceCompletedPayload {
  invoiceId: string;
  userId: string;
}

function isInvoiceCompletedPayload(v: unknown): v is InvoiceCompletedPayload {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>).invoiceId === "string" &&
    typeof (v as Record<string, unknown>).userId === "string"
  );
}

// Starts consuming the "invoices.completed" fanout exchange.
// On each message: broadcasts { type: "invoice:completed", invoiceId } to all
// connected WebSocket clients. The consumer and WS routes are decoupled via the
// module-level wsConnections Set — no class required.
export async function startInvoiceCompletedConsumer(): Promise<void> {
  await subscribe(InvoiceExchanges.COMPLETED, async (payload) => {
    if (!isInvoiceCompletedPayload(payload)) {
      console.warn("[consumer] unexpected invoices.completed payload", payload);
      return;
    }

    const message = JSON.stringify({ type: InvoiceEvents.COMPLETED, invoiceId: payload.invoiceId });

    const send = wsConnections.get(payload.userId);
    if (send) {
      for (const s of send) {
        s(message);
      }
    }

    console.log(`[consumer] broadcasted invoice:completed for invoiceId=${payload.invoiceId}`);
  });
}

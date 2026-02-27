import { subscribe } from "@distributed-systems/rabbitmq";
import { InvoiceEvents, InvoiceExchanges } from "@distributed-systems/shared";

import { wsConnections } from "#invoicing/presentation/http/ws.routes";

interface InvoiceFailedPayload {
  invoiceId: string;
  userId: string;
}

function isInvoiceFailedPayload(v: unknown): v is InvoiceFailedPayload {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>).invoiceId === "string" &&
    typeof (v as Record<string, unknown>).userId === "string"
  );
}

// Starts consuming the "invoices.failed" fanout exchange.
// On each message: broadcasts { type: "invoice:failed", invoiceId } to all
// connected WebSocket clients. The consumer and WS routes are decoupled via the
// module-level wsConnections Set — no class required.
export async function startInvoiceFailedConsumer(): Promise<void> {
  await subscribe(InvoiceExchanges.FAILED, async (payload) => {
    if (!isInvoiceFailedPayload(payload)) {
      console.warn("[consumer] unexpected invoices.failed payload", payload);
      return;
    }

    const message = JSON.stringify({ type: InvoiceEvents.FAILED, invoiceId: payload.invoiceId });

    const send = wsConnections.get(payload.userId);
    if (send) {
      for (const s of send) {
        s(message);
      }
    }

    console.log(`[consumer] broadcasted invoice:failed for invoiceId=${payload.invoiceId}`);
  });
}

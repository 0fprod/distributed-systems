import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { ApiRoutes, InvoiceEvents, InvoiceStatus } from "@distributed-systems/shared";
import type { InvoiceDTO, PaginatedResponse } from "@distributed-systems/shared";

import { createWebSocket } from "#shared/websocket";

interface InvoiceStatusMessage {
  type:
    | typeof InvoiceEvents.INPROGRESS
    | typeof InvoiceEvents.COMPLETED
    | typeof InvoiceEvents.FAILED;
  invoiceId: string;
}

const eventToStatus = {
  [InvoiceEvents.INPROGRESS]: InvoiceStatus.INPROGRESS,
  [InvoiceEvents.COMPLETED]: InvoiceStatus.COMPLETED,
  [InvoiceEvents.FAILED]: InvoiceStatus.FAILED,
} as const;

function buildWsUrl(path: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${path}`;
}

export function useInvoiceWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let destroyed = false;
    let ws: WebSocket;

    function connect() {
      if (destroyed) return;
      ws = createWebSocket(buildWsUrl(ApiRoutes.WS));

      ws.onmessage = (event: MessageEvent<string>) => {
        const message = JSON.parse(event.data) as InvoiceStatusMessage;
        const status = eventToStatus[message.type];
        if (!status) return;

        queryClient.setQueriesData<PaginatedResponse<InvoiceDTO>>(
          { queryKey: ["invoices"] },
          (old) => {
            if (!old) return old;
            return {
              ...old,
              data: old.data.map((invoice) =>
                invoice.id === String(message.invoiceId) ? { ...invoice, status } : invoice,
              ),
            };
          },
        );
      };

      ws.onclose = () => {
        if (!destroyed) {
          setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      ws.close();
    };
  }, [queryClient]);
}

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { ApiRoutes, InvoiceEvents } from "@distributed-systems/shared";

import { QueryKeys } from "#shared/query-keys";
import { createWebSocket } from "#shared/websocket";

interface InvoiceStatusMessage {
  type:
    | typeof InvoiceEvents.INPROGRESS
    | typeof InvoiceEvents.COMPLETED
    | typeof InvoiceEvents.FAILED;
  invoiceId: number;
}

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

        if (
          message.type === InvoiceEvents.COMPLETED ||
          message.type === InvoiceEvents.INPROGRESS ||
          message.type === InvoiceEvents.FAILED
        ) {
          void queryClient.invalidateQueries({ queryKey: QueryKeys.invoices });
        }
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

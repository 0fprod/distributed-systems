import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { ApiRoutes, InvoiceEvents } from "@distributed-systems/shared";

import { QueryKeys } from "#shared/query-keys";
import { createWebSocket } from "#shared/websocket";

interface InvoiceCompletedMessage {
  type: typeof InvoiceEvents.COMPLETED;
  invoiceId: number;
}

function buildWsUrl(path: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${path}`;
}

export function useInvoiceWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = createWebSocket(buildWsUrl(ApiRoutes.WS));

    ws.onmessage = (event: MessageEvent<string>) => {
      const message = JSON.parse(event.data) as InvoiceCompletedMessage;

      if (message.type === InvoiceEvents.COMPLETED) {
        void queryClient.invalidateQueries({ queryKey: QueryKeys.invoices });
      }
    };

    return () => {
      ws.close();
    };
  }, [queryClient]);
}

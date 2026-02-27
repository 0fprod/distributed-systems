import { useSuspenseQuery } from "@tanstack/react-query";

import { ApiRoutes } from "@distributed-systems/shared";
import type { InvoiceDTO } from "@distributed-systems/shared";

import { QueryKeys } from "#shared/query-keys";
import { request } from "#shared/request";

async function fetchInvoices(): Promise<InvoiceDTO[]> {
  const response = await request(ApiRoutes.INVOICES);

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return response.json() as Promise<InvoiceDTO[]>;
}

export function useInvoices() {
  return useSuspenseQuery<InvoiceDTO[]>({
    queryKey: QueryKeys.invoices,
    queryFn: fetchInvoices,
  });
}

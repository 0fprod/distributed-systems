import { useSuspenseQuery } from "@tanstack/react-query";

import { ApiRoutes } from "@distributed-systems/shared";
import type { Invoice } from "@distributed-systems/shared";

import { QueryKeys } from "#shared/query-keys";
import { request } from "#shared/request";

async function fetchInvoices(): Promise<Invoice[]> {
  const response = await request(ApiRoutes.INVOICES);

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return response.json() as Promise<Invoice[]>;
}

export function useInvoices() {
  return useSuspenseQuery<Invoice[]>({
    queryKey: QueryKeys.invoices,
    queryFn: fetchInvoices,
  });
}

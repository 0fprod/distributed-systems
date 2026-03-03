import { useSuspenseQuery } from "@tanstack/react-query";

import { ApiRoutes } from "@distributed-systems/shared";
import type { InvoiceDTO, PaginatedResponse } from "@distributed-systems/shared";

import type { InvoiceFilters } from "#shared/query-keys";
import { QueryKeys } from "#shared/query-keys";
import { request } from "#shared/request";

async function fetchInvoices(filters: InvoiceFilters): Promise<PaginatedResponse<InvoiceDTO>> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("limit", "20");
  if (filters.status) params.set("status", filters.status);
  if (filters.name) params.set("name", filters.name);
  if (filters.minAmount) params.set("minAmount", filters.minAmount);
  if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);

  const response = await request(`${ApiRoutes.INVOICES}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return response.json() as Promise<PaginatedResponse<InvoiceDTO>>;
}

export function useInvoices(filters: InvoiceFilters) {
  return useSuspenseQuery<PaginatedResponse<InvoiceDTO>>({
    queryKey: QueryKeys.invoices(filters),
    queryFn: () => fetchInvoices(filters),
  });
}

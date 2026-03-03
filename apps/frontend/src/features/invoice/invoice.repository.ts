import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { ApiRoutes } from "@distributed-systems/shared";
import type { InvoiceDTO, PaginatedResponse } from "@distributed-systems/shared";

import type { InvoiceFilters } from "#shared/query-keys";
import { QueryKeys } from "#shared/query-keys";
import { request } from "#shared/request";

// ─── HTTP functions ───────────────────────────────────────────────────────────

async function fetchInvoices(filters: InvoiceFilters): Promise<PaginatedResponse<InvoiceDTO>> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("limit", "20");
  if (filters.status) params.set("status", filters.status);
  if (filters.name) params.set("name", filters.name);
  if (filters.minAmount) params.set("minAmount", filters.minAmount);
  if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);

  const res = await request(`${ApiRoutes.INVOICES}?${params}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<PaginatedResponse<InvoiceDTO>>;
}

async function deleteInvoice(id: string): Promise<void> {
  const res = await request(`${ApiRoutes.INVOICES}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(res.statusText);
}

async function patchInvoice(invoice: Pick<InvoiceDTO, "id" | "name" | "amount">): Promise<void> {
  const res = await request(`${ApiRoutes.INVOICES}/${invoice.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: invoice.name, amount: invoice.amount }),
  });
  if (!res.ok) throw new Error(res.statusText);
}

async function createInvoice(data: { name: string; amount: number }): Promise<void> {
  const res = await request(ApiRoutes.INVOICES, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(res.statusText);
}

async function createInvalidInvoice(): Promise<void> {
  const res = await request(ApiRoutes.CREATE_INVALID_INVOICE, { method: "POST" });
  if (!res.ok) throw new Error(res.statusText);
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Mutations only — use in components that don't own the invoice list query. */
export function useInvoiceMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["invoices"] });

  const remove = useMutation({ mutationFn: deleteInvoice, onSuccess: invalidate });
  const update = useMutation({ mutationFn: patchInvoice, onSuccess: invalidate });
  const create = useMutation({ mutationFn: createInvoice, onSuccess: invalidate });
  const createInvalid = useMutation({ mutationFn: createInvalidInvoice, onSuccess: invalidate });

  return { remove, update, create, createInvalid };
}

/** Query + mutations — use in the component that owns the invoice list. */
export function useInvoices(filters: InvoiceFilters) {
  const query = useSuspenseQuery({
    queryKey: QueryKeys.invoices(filters),
    queryFn: () => fetchInvoices(filters),
  });

  const mutations = useInvoiceMutations();

  return { ...query, ...mutations };
}

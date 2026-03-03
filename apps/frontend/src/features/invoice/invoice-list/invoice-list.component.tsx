import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { InvoiceStatus } from "@distributed-systems/shared";
import type { InvoiceDTO } from "@distributed-systems/shared";

import type { InvoiceFilters } from "#shared/query-keys";

import { deleteInvoice } from "./delete-invoice";
import { EditInvoiceModal } from "./edit-invoice-modal";
import { InvoiceFilterBar } from "./invoice-filter-bar.component";
import { InvoiceListEmpty } from "./invoice-list.empty";
import { InvoicePagination } from "./invoice-pagination.component";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { useInvoices } from "./use-invoices.hook";

interface Props {
  filters: InvoiceFilters;
  onFilterChange: <K extends keyof InvoiceFilters>(key: K, value: InvoiceFilters[K]) => void;
}

export function InvoiceList({ filters, onFilterChange }: Props) {
  const { data } = useInvoices(filters);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceDTO | null>(null);
  const queryClient = useQueryClient();

  async function handleDelete(id: string) {
    await deleteInvoice(id);
    await queryClient.invalidateQueries({ queryKey: ["invoices"] });
  }

  return (
    <>
      <InvoiceFilterBar filters={filters} onFilterChange={onFilterChange} />

      {data.data.length === 0 ? (
        <InvoiceListEmpty />
      ) : (
        <>
          <table className="w-full table-auto text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th className="pb-2 pr-4 font-medium">#</th>
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Amount</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((invoice, index) => (
                <tr key={invoice.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-4 text-gray-500"># {index + 1}</td>
                  <td className="py-2 pr-4 text-gray-800">{invoice.name}</td>
                  <td className="py-2 pr-4 text-gray-800">
                    {invoice.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </td>
                  <td className="py-2 pr-4">
                    <InvoiceStatusBadge status={invoice.status} />
                    {invoice.status === InvoiceStatus.FAILED && (
                      <button
                        type="button"
                        onClick={() => setEditingInvoice(invoice)}
                        className="ml-2 text-xs text-red-600 underline hover:text-red-800"
                      >
                        Edit &amp; Retry
                      </button>
                    )}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(invoice.id)}
                      className="text-xs text-red-500 underline hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <InvoicePagination
            page={data.page}
            total={data.total}
            limit={data.limit}
            onPageChange={(page) => onFilterChange("page", page)}
          />
        </>
      )}

      {editingInvoice && (
        <EditInvoiceModal invoice={editingInvoice} onClose={() => setEditingInvoice(null)} />
      )}
    </>
  );
}

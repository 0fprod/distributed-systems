import { useState } from "react";

import { InvoiceStatus } from "@distributed-systems/shared";
import type { Invoice } from "@distributed-systems/shared";

import { EditInvoiceModal } from "./edit-invoice-modal";
import { InvoiceListEmpty } from "./invoice-list.empty";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { useInvoices } from "./use-invoices.hook";

export function InvoiceList() {
  const { data: invoices } = useInvoices();
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  if (invoices.length === 0) {
    return <InvoiceListEmpty />;
  }

  return (
    <>
      <table className="w-full table-auto text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-600">
            <th className="pb-2 pr-4 font-medium">#</th>
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium">Amount</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-gray-100 last:border-0">
              <td className="py-2 pr-4 text-gray-500">{invoice.id}</td>
              <td className="py-2 pr-4 text-gray-800">{invoice.name}</td>
              <td className="py-2 pr-4 text-gray-800">
                {invoice.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </td>
              <td className="py-2">
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
            </tr>
          ))}
        </tbody>
      </table>
      {editingInvoice && (
        <EditInvoiceModal invoice={editingInvoice} onClose={() => setEditingInvoice(null)} />
      )}
    </>
  );
}

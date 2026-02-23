import { InvoiceListEmpty } from "./invoice-list.empty";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { useInvoices } from "./use-invoices.hook";

export function InvoiceList() {
  const { data: invoices } = useInvoices();

  if (invoices.length === 0) {
    return <InvoiceListEmpty />;
  }

  return (
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
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function InvoiceListEmpty() {
  return (
    <div
      data-testid="invoice-list-empty"
      className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500"
    >
      <p className="text-sm">No invoices found.</p>
    </div>
  );
}

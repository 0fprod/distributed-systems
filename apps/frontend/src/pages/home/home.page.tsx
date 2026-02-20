import { GenerateInvoiceForm } from "#features/invoice/generate-invoice-form";
import { InvoiceList } from "#features/invoice/invoice-list";

export function HomePage() {
  return (
    <div>
      <GenerateInvoiceForm />
      <InvoiceList />
    </div>
  );
}

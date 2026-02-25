import { GenerateInvoiceForm, InvoiceListFeature } from "#features/invoice";

export function InvoicesPage() {
  return (
    <div className="space-y-8">
      <GenerateInvoiceForm />
      <InvoiceListFeature />
    </div>
  );
}

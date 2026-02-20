import { GenerateInvoiceForm, InvoiceListFeature } from "#features/invoice";

export function HomePage() {
  return (
    <div className="space-y-8">
      <GenerateInvoiceForm />
      <InvoiceListFeature />
    </div>
  );
}

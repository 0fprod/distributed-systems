import { LogoutButton } from "#features/auth/logout-user";
import { GenerateInvoiceFormFeature, InvoiceListFeature } from "#features/invoice";

export function InvoicesPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Invoices</h2>
        <LogoutButton />
      </div>
      <GenerateInvoiceFormFeature />
      <InvoiceListFeature />
    </div>
  );
}

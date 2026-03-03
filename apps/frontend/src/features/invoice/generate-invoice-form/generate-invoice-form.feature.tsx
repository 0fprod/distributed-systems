import { ErrorBoundary } from "react-error-boundary";

import { GenerateInvoiceForm } from "./generate-invoice-form.component";

function GenerateInvoiceFormError() {
  return (
    <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
      Something went wrong. Please reload the page.
    </p>
  );
}

export function GenerateInvoiceFormFeature() {
  return (
    <ErrorBoundary FallbackComponent={GenerateInvoiceFormError}>
      <GenerateInvoiceForm />
    </ErrorBoundary>
  );
}

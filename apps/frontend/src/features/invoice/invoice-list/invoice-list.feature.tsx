import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { InvoiceList } from "./invoice-list.component";
import { InvoiceListError } from "./invoice-list.error";
import { InvoiceListSkeleton } from "./invoice-list.skeleton";
import { useInvoiceWebSocket } from "./use-invoice-websocket.hook";

export function InvoiceListFeature() {
  const { reset } = useQueryErrorResetBoundary();
  useInvoiceWebSocket();

  return (
    <section className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-semibold text-gray-800">Invoices</h2>
      <ErrorBoundary FallbackComponent={InvoiceListError} onReset={reset}>
        <Suspense fallback={<InvoiceListSkeleton />}>
          <InvoiceList />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
}

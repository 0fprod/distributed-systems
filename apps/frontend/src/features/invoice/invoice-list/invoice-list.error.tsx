import type { FallbackProps } from "react-error-boundary";

export function InvoiceListError({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div
      data-testid="invoice-list-error"
      className="rounded-lg border border-red-300 bg-red-50 p-6 text-center"
    >
      <p className="mb-4 text-sm text-red-700">
        {error instanceof Error ? error.message : "Something went wrong"}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        Retry
      </button>
    </div>
  );
}

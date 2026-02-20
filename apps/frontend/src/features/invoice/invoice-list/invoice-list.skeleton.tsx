export function InvoiceListSkeleton() {
  return (
    <div data-testid="invoice-list-skeleton" className="animate-pulse space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-gray-200" />
      ))}
    </div>
  );
}

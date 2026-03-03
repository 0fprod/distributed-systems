import { useCallback, useState } from "react";

import { DEFAULT_INVOICE_FILTERS, type InvoiceFilters } from "#shared/query-keys";

export function useInvoiceFilters() {
  const [filters, setFilters] = useState<InvoiceFilters>(DEFAULT_INVOICE_FILTERS);

  const setFilter = useCallback(
    <K extends keyof InvoiceFilters>(key: K, value: InvoiceFilters[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        page: key === "page" ? (value as number) : 1,
      }));
    },
    [],
  );

  return { filters, setFilter };
}

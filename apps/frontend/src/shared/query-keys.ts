export interface InvoiceFilters {
  page: number;
  status: string; // "" = all statuses
  name: string; // "" = no filter
  minAmount: string; // "" = no filter (string for form binding)
  maxAmount: string; // "" = no filter
}

export const DEFAULT_INVOICE_FILTERS: InvoiceFilters = {
  page: 1,
  status: "",
  name: "",
  minAmount: "",
  maxAmount: "",
};

export const QueryKeys = {
  invoices: (filters: InvoiceFilters) => ["invoices", filters],
  me: ["me"] as const,
};

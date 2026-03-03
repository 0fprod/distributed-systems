import type { InvoiceFilters } from "#invoicing/domain/repositories/invoice.repository.interface";

// ListInvoicesQuery carries all inputs needed to list invoices for a specific user.
// It extends InvoiceFilters (page, limit, optional predicates) and adds userId so
// the handler receives a single cohesive input object — consistent with commands.
export interface ListInvoicesQuery extends InvoiceFilters {
  readonly userId: string;
}

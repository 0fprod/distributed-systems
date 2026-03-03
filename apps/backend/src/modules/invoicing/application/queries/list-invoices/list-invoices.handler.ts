import { Guid } from "@distributed-systems/shared";

import type { InvoicePersistenceError } from "#invoicing/domain/errors/invoice.errors";
import type {
  IInvoiceRepository,
  InvoiceFilters,
  PaginatedInvoices,
} from "#invoicing/domain/repositories/invoice.repository.interface";
import type { Result } from "#shared/core/result";

export async function listInvoicesHandler(
  repository: IInvoiceRepository,
  userId: string,
  filters: InvoiceFilters,
): Promise<Result<PaginatedInvoices, InvoicePersistenceError>> {
  return repository.findAll(Guid.fromString(userId), filters);
}

import { Guid } from "@distributed-systems/shared";

import type { InvoicePersistenceError } from "#invoicing/domain/errors/invoice.errors";
import type {
  IInvoiceRepository,
  PaginatedInvoices,
} from "#invoicing/domain/repositories/invoice.repository.interface";
import type { Result } from "#shared/core/result";

import type { ListInvoicesQuery } from "./list-invoices.query";

export async function listInvoicesHandler(
  query: ListInvoicesQuery,
  deps: { repository: IInvoiceRepository },
): Promise<Result<PaginatedInvoices, InvoicePersistenceError>> {
  const { userId, ...filters } = query;
  return deps.repository.findAll(Guid.fromString(userId), filters);
}

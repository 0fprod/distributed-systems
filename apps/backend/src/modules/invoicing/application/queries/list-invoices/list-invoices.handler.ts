import type { Invoice } from "@distributed-systems/shared";

import type { InvoicePersistenceError } from "#invoicing/domain/errors/invoice.errors";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import type { Result } from "#shared/core/result";

// Query handler: read-only — never mutates state.
// CQS compliance: this function has no side effects; it only retrieves data.
// Query handlers may use optimised read models in more complex systems;
// here the write model is simple enough that the same repository suffices.
//
// userId scopes the result set so that each user only sees their own invoices.
export async function listInvoicesHandler(
  repository: IInvoiceRepository,
  userId: number,
): Promise<Result<Invoice[], InvoicePersistenceError>> {
  return repository.findAll(userId);
}

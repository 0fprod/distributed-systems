import { Guid } from "@distributed-systems/shared";

import type { InvoicePersistenceError } from "#invoicing/domain/errors/invoice.errors";
import type { BackendInvoice } from "#invoicing/domain/invoice";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import type { Result } from "#shared/core/result";

export async function listInvoicesHandler(
  repository: IInvoiceRepository,
  userId: string,
): Promise<Result<BackendInvoice[], InvoicePersistenceError>> {
  return repository.findAll(Guid.fromString(userId));
}

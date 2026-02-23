import type { InvoicePersistenceError } from "#invoicing/domain/errors/invoice.errors";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import type { Result } from "#shared/core/result";

import type { DeleteInvoiceCommand } from "./delete-invoice.command";

// Handler: thin orchestration — delegates directly to the repository.
// No publisher needed: deletion has no downstream side effects that
// other bounded contexts need to react to.
export async function deleteInvoiceHandler(
  command: DeleteInvoiceCommand,
  deps: { repository: IInvoiceRepository },
): Promise<Result<void, InvoicePersistenceError>> {
  return deps.repository.deleteById(command.invoiceId);
}

import type { InvoicePersistenceError } from "#invoicing/domain/errors/invoice.errors";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import type { Result } from "#shared/core/result";

import type { DeleteInvoiceCommand } from "./delete-invoice.command";

type DeleteInvoiceError =
  | InvoicePersistenceError
  | { message: string; type: "not_found" | "forbidden" };

// Handler: thin orchestration — delegates directly to the repository.
// No publisher needed: deletion has no downstream side effects that
// other bounded contexts need to react to.
// Ownership is enforced by passing userId into the repository, which
// uses a compound WHERE clause to ensure only the owner can delete.
export async function deleteInvoiceHandler(
  command: DeleteInvoiceCommand,
  deps: { repository: IInvoiceRepository },
): Promise<Result<void, DeleteInvoiceError>> {
  return deps.repository.deleteById({ invoiceId: command.invoiceId, userId: command.userId });
}

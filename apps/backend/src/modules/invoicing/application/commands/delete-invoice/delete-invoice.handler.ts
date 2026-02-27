import { Guid } from "@distributed-systems/shared";

import {
  InvoiceForbiddenError,
  type InvoiceNotFoundError,
  type InvoicePersistenceError,
} from "#invoicing/domain/errors/invoice.errors";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import { type Result, err } from "#shared/core/result";

import type { DeleteInvoiceCommand } from "./delete-invoice.command";

export async function deleteInvoiceHandler(
  command: DeleteInvoiceCommand,
  deps: { repository: IInvoiceRepository },
): Promise<Result<void, InvoiceNotFoundError | InvoiceForbiddenError | InvoicePersistenceError>> {
  const findResult = await deps.repository.findById(Guid.fromString(command.invoiceId));

  if (!findResult.ok) return findResult; // Propagate the error (not found or persistence failure)
  const invoice = findResult.value;

  if (!invoice.belongsToUser(Guid.fromString(command.userId))) {
    return err(
      new InvoiceForbiddenError(
        `Invoice ${command.invoiceId} does not belong to user ${command.userId}`,
      ),
    );
  }

  return deps.repository.deleteById({
    invoiceId: Guid.fromString(command.invoiceId),
    userId: Guid.fromString(command.userId),
  });
}

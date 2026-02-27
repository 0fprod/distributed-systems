import { Guid, InvoiceExchanges, InvoiceStatus } from "@distributed-systems/shared";

import type { IMessagePublisher } from "#invoicing/application/ports/message-publisher.port";
import {
  InvoiceForbiddenError,
  InvoiceInvalidStatusError,
  type InvoiceNotFoundError,
  type InvoicePersistenceError,
} from "#invoicing/domain/errors/invoice.errors";
import { BackendInvoice } from "#invoicing/domain/invoice";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import { err, ok } from "#shared/core/result";
import type { Result } from "#shared/core/result";

import type { RetryInvoiceCommand } from "./retry-invoice.command";

type Dependencies = {
  repository: IInvoiceRepository;
  publisher: IMessagePublisher;
};

export async function retryInvoiceHandler(
  command: RetryInvoiceCommand,
  deps: Dependencies,
): Promise<
  Result<
    { id: string },
    | InvoiceNotFoundError
    | InvoiceForbiddenError
    | InvoicePersistenceError
    | InvoiceInvalidStatusError
  >
> {
  const findResult = await deps.repository.findById(Guid.fromString(command.invoiceId));

  if (!findResult.ok) return err(findResult.error);

  const currentInvoice = findResult.value;

  if (!currentInvoice.belongsToUser(Guid.fromString(command.userId))) {
    return err(
      new InvoiceForbiddenError(
        `User ${command.userId} is not the owner of invoice ${command.invoiceId}`,
      ),
    );
  }

  if (currentInvoice.isNotFailed()) {
    return err(
      new InvoiceInvalidStatusError(`Invoice ${command.invoiceId} is not in failed status`),
    );
  }

  const updated = BackendInvoice.create({
    id: currentInvoice.id,
    userId: currentInvoice.userId,
    name: command.name,
    amount: command.amount,
    status: InvoiceStatus.PENDING,
  });

  const updateResult = await deps.repository.update(updated);
  if (!updateResult.ok) return updateResult;

  await deps.publisher.publish(InvoiceExchanges.CREATED, {
    invoiceId: command.invoiceId,
    userId: command.userId,
  });

  return ok({ id: command.invoiceId });
}

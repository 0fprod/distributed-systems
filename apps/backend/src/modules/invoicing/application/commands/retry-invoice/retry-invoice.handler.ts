import { InvoiceExchanges, InvoiceStatus } from "@distributed-systems/shared";

import type { IMessagePublisher } from "#modules/invoicing/application/ports/message-publisher.port";
import type { InvoicePersistenceError } from "#modules/invoicing/domain/errors/invoice.errors";
import type { IInvoiceRepository } from "#modules/invoicing/domain/repositories/invoice.repository.interface";
import { err, ok } from "#shared/core/result";
import type { Result } from "#shared/core/result";

import type { RetryInvoiceCommand } from "./retry-invoice.command";

type RetryInvoiceError =
  | InvoicePersistenceError
  | { message: string; type: "not_found" | "invalid_status" };

// Handler: orchestrates the retry use case.
// Guard: only invoices in "failed" status can be retried — prevents accidental
// re-processing of completed or in-progress invoices.
export async function retryInvoiceHandler(
  command: RetryInvoiceCommand,
  deps: { repository: IInvoiceRepository; publisher: IMessagePublisher },
): Promise<Result<{ id: number }, RetryInvoiceError>> {
  const findResult = await deps.repository.findById(command.invoiceId);
  if (!findResult.ok) return findResult;
  if (!findResult.value)
    return err({ message: `Invoice ${command.invoiceId} not found`, type: "not_found" });

  const current = findResult.value;
  if (current.status !== InvoiceStatus.FAILED) {
    return err({
      message: `Invoice ${command.invoiceId} is not in failed status`,
      type: "invalid_status",
    });
  }

  const updateResult = await deps.repository.update({
    ...current,
    name: command.name,
    amount: command.amount,
    status: InvoiceStatus.PENDING,
  });

  if (!updateResult.ok) return updateResult;

  await deps.publisher.publish(InvoiceExchanges.CREATED, { invoiceId: command.invoiceId });

  return ok({ id: command.invoiceId });
}

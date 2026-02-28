import { getRequestId } from "@distributed-systems/logger";
import { Guid, InvoiceExchanges, InvoiceStatus } from "@distributed-systems/shared";

import type { IMessagePublisher } from "#invoicing/application/ports/message-publisher.port";
import type { InvoicePersistenceError } from "#invoicing/domain/errors/invoice.errors";
import { BackendInvoice } from "#invoicing/domain/invoice";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import type { Result } from "#shared/core/result";

import type { CreateInvoiceCommand } from "./create-invoice.command";

type Dependencies = {
  repository: IInvoiceRepository;
  publisher: IMessagePublisher;
};

export async function createInvoiceHandler(
  command: CreateInvoiceCommand,
  deps: Dependencies,
): Promise<Result<{ id: string }, InvoicePersistenceError>> {
  const invoice = BackendInvoice.create({
    id: Guid.create(),
    userId: Guid.fromString(command.userId),
    name: command.name,
    amount: command.amount,
    status: InvoiceStatus.PENDING,
  });

  const result = await deps.repository.save(invoice);
  if (!result.ok) return result;

  // Propagate the requestId so the worker can log under the same correlation id.
  await deps.publisher.publish(InvoiceExchanges.CREATED, {
    invoiceId: invoice.id.value,
    userId: command.userId,
    requestId: getRequestId(),
  });

  return { ok: true, value: { id: invoice.id.value } };
}

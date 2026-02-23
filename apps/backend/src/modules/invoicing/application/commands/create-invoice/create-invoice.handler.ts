import { InvoiceExchanges } from "@distributed-systems/shared";

import type { IMessagePublisher } from "#invoicing/application/ports/message-publisher.port";
import type { InvoicePersistenceError } from "#invoicing/domain/errors/invoice.errors";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import type { Result } from "#shared/core/result";

import type { CreateInvoiceCommand } from "./create-invoice.command";

// Handler: orchestrates the use case — no business logic lives here.
// Responsibility: persist the new invoice, then publish an integration event.
// CQS compliance: returns only { id } (a minimal acknowledgement), not the full Invoice.
export async function createInvoiceHandler(
  command: CreateInvoiceCommand,
  deps: { repository: IInvoiceRepository; publisher: IMessagePublisher },
): Promise<Result<{ id: number }, InvoicePersistenceError>> {
  const result = await deps.repository.save({ name: command.name, amount: command.amount });

  if (!result.ok) return result;

  const invoice = result.value;

  // Publish integration event to notify downstream consumers (worker).
  // "invoices.created" is a fanout exchange — the worker will process the invoice.
  await deps.publisher.publish(InvoiceExchanges.CREATED, { invoiceId: invoice.id });

  return { ok: true, value: { id: invoice.id } };
}

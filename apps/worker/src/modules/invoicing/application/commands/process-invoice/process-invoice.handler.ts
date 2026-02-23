import {
  type Invoice,
  InvoiceExchanges,
  InvoiceStatus,
  processFakeInvoice,
} from "@distributed-systems/shared";

import type { InvoiceWorkerPersistenceError } from "#modules/invoicing/domain/errors/invoice.errors";
import type { IInvoiceRepository } from "#modules/invoicing/domain/repositories/invoice.repository.interface";
import type { Result } from "#modules/shared/core/result";

import type { IMessagePublisher } from "../../ports/message-publisher.port";
import type { ProcessInvoiceCommand } from "./process-invoice.command";

// Handler orchestrates the invoice processing use case:
//   1. Call processFakeInvoice (domain work simulation — 3 s delay)
//   2. Persist the status change to "completed" in the DB
//   3. Publish an integration event so the backend can notify WS clients
//
// Domain rule enforced here: only "inprogress" invoices should be processed.
// Using Prisma directly (not via a domain repository) is a deliberate trade-off
// for the worker: it has no domain layer of its own — it is a pure orchestrator.
export async function processInvoiceHandler(
  command: ProcessInvoiceCommand,
  deps: { publisher: IMessagePublisher; repository: IInvoiceRepository },
): Promise<void> {
  const { invoiceId } = command;

  const invoice = await deps.repository.findById(invoiceId);
  ensureInvoiceIsValid(invoice, deps);

  if (invoice.ok) {
    await deps.repository.update({ ...invoice.value, status: InvoiceStatus.INPROGRESS });
    await deps.publisher.publish(InvoiceExchanges.INPROGRESS, { invoiceId });

    await processFakeInvoice(invoiceId);

    await deps.repository.update({ ...invoice.value, status: InvoiceStatus.COMPLETED });
    await deps.publisher.publish(InvoiceExchanges.COMPLETED, { invoiceId });

    console.log(`[worker] invoice ${invoiceId} completed and event published`);
  }
}

async function ensureInvoiceIsValid(
  invoice: Result<Invoice, InvoiceWorkerPersistenceError>,
  deps: { publisher: IMessagePublisher; repository: IInvoiceRepository },
): Promise<void> {
  if (!invoice.ok) {
    // Invoice not found or DB error — publish a FAILED event for the UI, then rethrow to route the message to the DLQ.
    const invoiceId = invoice.error.message.match(/id (\d+)/)?.[1] ?? "unknown";
    await deps.publisher.publish(InvoiceExchanges.FAILED, { invoiceId: Number(invoiceId) });

    throw new Error(`Failed to retrieve invoice with id ${invoiceId}: ${invoice.error.message}`);
  }

  if (!invoice.value.name || invoice.value.amount < 0) {
    // Mark the invoice as failed in the DB so the UI reflects the error state,
    // then publish the integration event before rethrowing so the message still
    // nacks to the DLQ for inspection / replay.
    await deps.repository.update({ ...invoice.value, status: InvoiceStatus.FAILED });

    await deps.publisher.publish(InvoiceExchanges.FAILED, { invoiceId: invoice.value.id });

    throw new Error(
      `[worker] invalid invoice ${invoice.value.id}: name="${invoice.value.name}" amount=${invoice.value.amount}`,
    );
  }
}

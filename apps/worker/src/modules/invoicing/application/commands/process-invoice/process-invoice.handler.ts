import { prisma } from "@distributed-systems/database";
import { InvoiceExchanges, InvoiceStatus, processFakeInvoice } from "@distributed-systems/shared";

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
  deps: { publisher: IMessagePublisher },
): Promise<void> {
  const { invoiceId } = command;

  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

  if (!invoice.name || invoice.amount < 0) {
    // Mark the invoice as failed in the DB so the UI reflects the error state,
    // then publish the integration event before rethrowing so the message still
    // nacks to the DLQ for inspection / replay.
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.FAILED },
    });
    await deps.publisher.publish(InvoiceExchanges.FAILED, { invoiceId });
    throw new Error(
      `[worker] invalid invoice ${invoiceId}: name="${invoice.name}" amount=${invoice.amount}`,
    );
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: InvoiceStatus.INPROGRESS },
  });

  await deps.publisher.publish(InvoiceExchanges.INPROGRESS, { invoiceId });

  await processFakeInvoice(invoiceId);

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: InvoiceStatus.COMPLETED },
  });

  await deps.publisher.publish(InvoiceExchanges.COMPLETED, { invoiceId });

  console.log(`[worker] invoice ${invoiceId} completed and event published`);
}

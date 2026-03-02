import { createLogger } from "@distributed-systems/logger";
import { InvoiceExchanges, InvoiceStatus } from "@distributed-systems/shared";

import type { InvoiceWorkerPersistenceError } from "#invoicing/domain/errors/invoice.errors";
import type { UserWorkerPersistenceError } from "#invoicing/domain/errors/user.errors";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import type { IUserRepository } from "#invoicing/domain/repositories/user.repository.interface";
import type { WorkerInvoice } from "#invoicing/domain/worker-invoice";
import type { WorkerUser } from "#invoicing/domain/worker-user";
import type { Result } from "#shared/core/result";

import type { IMessagePublisher } from "../../ports/message-publisher.port";
import type { ProcessInvoiceCommand } from "./process-invoice.command";

const logger = createLogger("process-invoice");

type Dependencies = {
  publisher: IMessagePublisher;
  invoiceRepository: IInvoiceRepository;
  userRepository: IUserRepository;
  processInvoice: (invoiceId: string) => Promise<void>;
};

// Handler orchestrates the invoice processing use case:
//   1. Call processFakeInvoice (domain work simulation — 10 s delay)
//   2. Persist the status change to "completed" in the DB
//   3. Publish an integration event so the backend can notify WS clients
export async function processInvoiceHandler(
  command: ProcessInvoiceCommand,
  deps: Dependencies,
): Promise<void> {
  const { invoiceId, userId } = command; // both are string UUIDs

  const [invoiceResult, userResult] = await Promise.all([
    deps.invoiceRepository.findById(invoiceId),
    deps.userRepository.findById(userId),
  ]);

  // Guard clauses — each throws on failure (routing the message to the DLQ)
  // and returns the unwrapped value so TypeScript can narrow the type.
  const user = await ensureUserIsValid(userResult, { invoiceId, userId }, deps);
  const invoice = await ensureInvoiceIsValid(invoiceResult, { invoiceId, userId }, deps);

  // Happy path — user and invoice are properly typed here.
  await deps.invoiceRepository.update({ ...invoice, status: InvoiceStatus.INPROGRESS });
  await deps.publisher.publish(InvoiceExchanges.INPROGRESS, { invoiceId, userId: user.id });

  await deps.processInvoice(invoiceId);

  await deps.invoiceRepository.update({ ...invoice, status: InvoiceStatus.COMPLETED });
  await deps.publisher.publish(InvoiceExchanges.COMPLETED, { invoiceId, userId: user.id });

  logger.info({ invoiceId }, "invoice completed");
}

// ── Guard clauses ─────────────────────────────────────────────────────────────
// Each function publishes a FAILED event and throws on error — never returns
// normally on failure. On success, returns the unwrapped value so the caller
// gets a properly typed result without needing non-null assertions (!).

async function ensureUserIsValid(
  user: Result<WorkerUser, UserWorkerPersistenceError>,
  ids: { invoiceId: string; userId: string },
  deps: Dependencies,
): Promise<WorkerUser> {
  if (!user.ok) {
    logger.error({ invoiceId: ids.invoiceId, err: user.error.cause }, user.error.message);
    await deps.publisher.publish(InvoiceExchanges.FAILED, ids);
    throw new Error(`Failed to retrieve user with id ${ids.userId}: ${user.error.message}`);
  }
  return user.value;
}

async function ensureInvoiceIsValid(
  invoice: Result<WorkerInvoice, InvoiceWorkerPersistenceError>,
  ids: { invoiceId: string; userId: string },
  deps: Dependencies,
): Promise<WorkerInvoice> {
  if (!invoice.ok) {
    logger.error({ invoiceId: ids.invoiceId, err: invoice.error.cause }, invoice.error.message);
    await deps.publisher.publish(InvoiceExchanges.FAILED, ids);
    throw new Error(
      `Failed to retrieve invoice with id ${ids.invoiceId}: ${invoice.error.message}`,
    );
  }

  if (!invoice.value.name || invoice.value.amount < 0) {
    logger.error(
      { invoiceId: ids.invoiceId },
      `invalid invoice: name="${invoice.value.name}" amount=${invoice.value.amount}`,
    );
    await deps.invoiceRepository.update({ ...invoice.value, status: InvoiceStatus.FAILED });
    await deps.publisher.publish(InvoiceExchanges.FAILED, ids);
    throw new Error(
      `[worker] invalid invoice ${ids.invoiceId}: name="${invoice.value.name}" amount=${invoice.value.amount}`,
    );
  }

  return invoice.value;
}

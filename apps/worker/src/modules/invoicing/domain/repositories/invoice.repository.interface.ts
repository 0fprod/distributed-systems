import type { Result } from "#shared/core/result";

import type { InvoiceWorkerPersistenceError } from "../errors/invoice.errors";
import type { WorkerInvoice } from "../worker-invoice";

// Repository interface — part of the domain layer.
// It is defined here (not in infrastructure) so the domain owns the contract.
// The infrastructure layer provides the concrete implementation.
// Only aggregate roots have repositories; Invoice IS the aggregate root here.
// IDs are plain strings (UUID) — consistent with WorkerInvoice.
export interface IInvoiceRepository {
  findById(id: string): Promise<Result<WorkerInvoice, InvoiceWorkerPersistenceError>>;
  update(invoice: WorkerInvoice): Promise<Result<WorkerInvoice, InvoiceWorkerPersistenceError>>;
}

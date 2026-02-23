import type { Invoice } from "@distributed-systems/shared";

import type { Result } from "#modules/shared/core/result";

import type { InvoiceWorkerPersistenceError } from "../errors/invoice.errors";

// Repository interface — part of the domain layer.
// It is defined here (not in infrastructure) so the domain owns the contract.
// The infrastructure layer provides the concrete implementation.
// Only aggregate roots have repositories; Invoice IS the aggregate root here.
export interface IInvoiceRepository {
  findById(id: number): Promise<Result<Invoice, InvoiceWorkerPersistenceError>>;
  update(invoice: Invoice): Promise<Result<Invoice, InvoiceWorkerPersistenceError>>;
}

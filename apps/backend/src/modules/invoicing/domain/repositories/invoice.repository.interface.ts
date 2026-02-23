import type { Invoice } from "@distributed-systems/shared";

import type { Result } from "#shared/core/result";

import type { InvoicePersistenceError } from "../errors/invoice.errors";

// Repository interface — part of the domain layer.
// It is defined here (not in infrastructure) so the domain owns the contract.
// The infrastructure layer provides the concrete implementation.
// Only aggregate roots have repositories; Invoice IS the aggregate root here.
export interface IInvoiceRepository {
  save(data: { name: string; amount: number }): Promise<Result<Invoice, InvoicePersistenceError>>;
  update(invoice: Invoice): Promise<Result<Invoice, InvoicePersistenceError>>;
  findById(id: number): Promise<Result<Invoice | null, InvoicePersistenceError>>;
  findAll(): Promise<Result<Invoice[], InvoicePersistenceError>>;
  deleteById(id: number): Promise<Result<void, InvoicePersistenceError>>;
}

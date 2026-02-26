import type { Invoice } from "@distributed-systems/shared";

import type { Result } from "#shared/core/result";

import type { InvoicePersistenceError } from "../errors/invoice.errors";

// Repository interface — part of the domain layer.
// It is defined here (not in infrastructure) so the domain owns the contract.
// The infrastructure layer provides the concrete implementation.
// Only aggregate roots have repositories; Invoice IS the aggregate root here.
export interface IInvoiceRepository {
  // userId is required — no invoice can be created without an owner.
  save(data: {
    name: string;
    amount: number;
    userId: number;
  }): Promise<Result<Invoice, InvoicePersistenceError>>;
  update(invoice: Invoice): Promise<Result<Invoice, InvoicePersistenceError>>;
  findById(id: number): Promise<Result<Invoice | null, InvoicePersistenceError>>;
  // userId scopes the result: each caller only receives their own invoices.
  findAll(userId: number): Promise<Result<Invoice[], InvoicePersistenceError>>;
  // invoiceId + userId pair guarantees ownership atomically: the row is only
  // removed when both columns match, preventing cross-user deletions.
  deleteById(params: {
    invoiceId: number;
    userId: number;
  }): Promise<
    Result<void, InvoicePersistenceError | { message: string; type: "not_found" | "forbidden" }>
  >;
}

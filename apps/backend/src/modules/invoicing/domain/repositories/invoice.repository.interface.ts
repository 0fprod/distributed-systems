import type { Guid } from "@distributed-systems/shared";

import type { BackendInvoice } from "#invoicing/domain/invoice";
import type { Result } from "#shared/core/result";

import type { InvoiceNotFoundError, InvoicePersistenceError } from "../errors/invoice.errors";

export interface IInvoiceRepository {
  save(invoice: BackendInvoice): Promise<Result<void, InvoicePersistenceError>>;
  update(invoice: BackendInvoice): Promise<Result<void, InvoicePersistenceError>>;
  findById(
    id: Guid,
  ): Promise<Result<BackendInvoice, InvoiceNotFoundError | InvoicePersistenceError>>;
  findAll(userId: Guid): Promise<Result<BackendInvoice[], InvoicePersistenceError>>;
  deleteById(params: {
    invoiceId: Guid;
    userId: Guid;
  }): Promise<Result<void, InvoicePersistenceError | InvoiceNotFoundError>>;
}

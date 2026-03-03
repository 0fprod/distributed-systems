import type { Guid, InvoiceStatus } from "@distributed-systems/shared";

import type { BackendInvoice } from "#invoicing/domain/invoice";
import type { Result } from "#shared/core/result";

import type { InvoiceNotFoundError, InvoicePersistenceError } from "../errors/invoice.errors";

export interface InvoiceFilters {
  readonly page: number;
  readonly limit: number;
  readonly status?: InvoiceStatus;
  readonly name?: string;
  readonly minAmount?: number;
  readonly maxAmount?: number;
}

export interface PaginatedInvoices {
  readonly items: BackendInvoice[];
  readonly total: number;
}

export interface IInvoiceRepository {
  save(invoice: BackendInvoice): Promise<Result<void, InvoicePersistenceError>>;
  update(invoice: BackendInvoice): Promise<Result<void, InvoicePersistenceError>>;
  findById(
    id: Guid,
  ): Promise<Result<BackendInvoice, InvoiceNotFoundError | InvoicePersistenceError>>;
  findAll(
    userId: Guid,
    filters: InvoiceFilters,
  ): Promise<Result<PaginatedInvoices, InvoicePersistenceError>>;
  deleteById(params: {
    invoiceId: Guid;
    userId: Guid;
  }): Promise<Result<void, InvoicePersistenceError | InvoiceNotFoundError>>;
}

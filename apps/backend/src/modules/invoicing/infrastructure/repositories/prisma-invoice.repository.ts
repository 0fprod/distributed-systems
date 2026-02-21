import { prisma, toDomainInvoice, toDomainInvoices } from "@distributed-systems/database";
import { InvoiceStatus } from "@distributed-systems/shared";

import { InvoicePersistenceError } from "#modules/invoicing/domain/errors/invoice.errors";
import type { IInvoiceRepository } from "#modules/invoicing/domain/repositories/invoice.repository.interface";
import { err, ok } from "#shared/core/result";

// Concrete repository: translates between the domain model and Prisma's persistence model.
// Using the Result pattern instead of throwing keeps error paths explicit and typed —
// the application layer decides how to handle persistence failures.
export const prismaInvoiceRepository: IInvoiceRepository = {
  async save(data) {
    try {
      const raw = await prisma.invoice.create({
        data: { name: data.name, amount: data.amount, status: InvoiceStatus.PENDING },
      });
      return ok(toDomainInvoice(raw));
    } catch (e) {
      return err(new InvoicePersistenceError("Failed to create invoice", e));
    }
  },

  async findAll() {
    try {
      const raws = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" } });
      return ok(toDomainInvoices(raws));
    } catch (e) {
      return err(new InvoicePersistenceError("Failed to list invoices", e));
    }
  },
};

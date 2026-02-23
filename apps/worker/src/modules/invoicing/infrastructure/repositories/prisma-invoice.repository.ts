import { prisma, toDomainInvoice } from "@distributed-systems/database";

import { InvoiceWorkerPersistenceError } from "#invoicing/domain/errors/invoice.errors";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import { err, ok } from "#shared/core/result";

// Concrete repository: translates between the domain model and Prisma's persistence model.
// Using the Result pattern instead of throwing keeps error paths explicit and typed —
// the application layer decides how to handle persistence failures.
export const prismaInvoiceRepository: IInvoiceRepository = {
  async findById(id) {
    try {
      const raw = await prisma.invoice.findUniqueOrThrow({ where: { id } });
      return ok(toDomainInvoice(raw));
    } catch (e) {
      return err(new InvoiceWorkerPersistenceError(`Failed to find invoice with id ${id}`, e));
    }
  },

  async update(invoice) {
    try {
      const raw = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { name: invoice.name, amount: invoice.amount, status: invoice.status },
      });
      return ok(toDomainInvoice(raw));
    } catch (e) {
      return err(new InvoiceWorkerPersistenceError("Failed to update invoice", e));
    }
  },
};

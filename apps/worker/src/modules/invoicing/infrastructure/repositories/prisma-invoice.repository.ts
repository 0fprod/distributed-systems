import { prisma } from "@distributed-systems/database";

import { InvoiceWorkerPersistenceError } from "#invoicing/domain/errors/invoice.errors";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import { err, ok } from "#shared/core/result";

import { toWorkerInvoice } from "./mapper";

// Concrete repository: translates between the worker read model and Prisma's persistence model.
// Uses the Result pattern to keep error paths explicit and typed.
export const prismaInvoiceRepository: IInvoiceRepository = {
  async findById(id) {
    try {
      const raw = await prisma.invoice.findUniqueOrThrow({ where: { id } });
      return ok(toWorkerInvoice(raw));
    } catch (e) {
      return err(new InvoiceWorkerPersistenceError(`Failed to find invoice with id ${id}`, e));
    }
  },

  async update(invoice) {
    try {
      const raw = await prisma.invoice.update({
        where: { id: invoice.id }, // plain string UUID
        data: { name: invoice.name, amount: invoice.amount, status: invoice.status },
      });
      return ok(toWorkerInvoice(raw));
    } catch (e) {
      return err(new InvoiceWorkerPersistenceError("Failed to update invoice", e));
    }
  },
};

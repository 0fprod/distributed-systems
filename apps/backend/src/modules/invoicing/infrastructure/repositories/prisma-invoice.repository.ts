import { prisma, toDomainInvoice, toDomainInvoices } from "@distributed-systems/database";
import { InvoiceStatus } from "@distributed-systems/shared";

import { InvoicePersistenceError } from "#invoicing/domain/errors/invoice.errors";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import { err, ok } from "#shared/core/result";

// Concrete repository: translates between the domain model and Prisma's persistence model.
// Using the Result pattern instead of throwing keeps error paths explicit and typed —
// the application layer decides how to handle persistence failures.
export const prismaInvoiceRepository: IInvoiceRepository = {
  async save(data) {
    try {
      const raw = await prisma.invoice.create({
        // userId links the invoice to its owner — enforced at the DB level (NOT NULL + FK).
        data: {
          name: data.name,
          amount: data.amount,
          status: InvoiceStatus.PENDING,
          userId: data.userId,
        },
      });
      return ok(toDomainInvoice(raw));
    } catch (e) {
      return err(new InvoicePersistenceError("Failed to create invoice", e));
    }
  },

  async findById(id) {
    try {
      const raw = await prisma.invoice.findUnique({ where: { id } });
      return ok(raw ? toDomainInvoice(raw) : null);
    } catch (e) {
      return err(new InvoicePersistenceError("Failed to find invoice", e));
    }
  },

  async findAll(userId) {
    try {
      // Scope the query to the requesting user's invoices only.
      const raws = await prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return ok(toDomainInvoices(raws));
    } catch (e) {
      return err(new InvoicePersistenceError("Failed to list invoices", e));
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
      return err(new InvoicePersistenceError("Failed to update invoice", e));
    }
  },

  async deleteById(id) {
    try {
      await prisma.invoice.delete({ where: { id } });
      return ok(undefined);
    } catch (e) {
      return err(new InvoicePersistenceError("Failed to delete invoice", e));
    }
  },
};

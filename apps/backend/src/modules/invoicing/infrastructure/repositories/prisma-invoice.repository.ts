import { prisma } from "@distributed-systems/database";
import { createLogger } from "@distributed-systems/logger";

import {
  InvoiceNotFoundError,
  InvoicePersistenceError,
} from "#invoicing/domain/errors/invoice.errors";
import type { BackendInvoice } from "#invoicing/domain/invoice";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import { toBackendInvoice } from "#invoicing/infrastructure/mappers/invoice.mapper";
import { err, ok } from "#shared/core/result";

const logger = createLogger("prisma-invoice-repository");

export const prismaInvoiceRepository: IInvoiceRepository = {
  async save(invoice: BackendInvoice) {
    try {
      await prisma.invoice.create({
        data: {
          id: invoice.id.value,
          name: invoice.name,
          amount: invoice.amount,
          status: invoice.status,
          userId: invoice.userId.value,
        },
      });

      return ok(undefined);
    } catch (e) {
      logger.error({ err: e }, "failed to create invoice");
      return err(new InvoicePersistenceError("Failed to create invoice", e));
    }
  },

  async findById(id) {
    try {
      const raw = await prisma.invoice.findUnique({ where: { id: id.value } });
      if (!raw) return err(new InvoiceNotFoundError(`Invoice ${id.value} not found`));
      return ok(toBackendInvoice(raw));
    } catch (e) {
      logger.error({ err: e }, "failed to find invoice by id");
      return err(new InvoicePersistenceError("Failed to find invoice", e));
    }
  },

  async findAll(userId) {
    try {
      const raws = await prisma.invoice.findMany({
        where: { userId: userId.value },
        orderBy: { createdAt: "desc" },
      });

      return ok(raws.map(toBackendInvoice));
    } catch (e) {
      logger.error({ err: e }, "failed to list invoices");
      return err(new InvoicePersistenceError("Failed to list invoices", e));
    }
  },

  async update(invoice: BackendInvoice) {
    try {
      await prisma.invoice.update({
        where: { id: invoice.id.value },
        data: { name: invoice.name, amount: invoice.amount, status: invoice.status },
      });

      return ok(undefined);
    } catch (e) {
      logger.error({ err: e }, "failed to update invoice");
      return err(new InvoicePersistenceError("Failed to update invoice", e));
    }
  },

  async deleteById({ invoiceId, userId }) {
    try {
      const { count } = await prisma.invoice.deleteMany({
        where: { id: invoiceId.value, userId: userId.value },
      });

      if (count === 0) {
        return err(
          new InvoiceNotFoundError(`Invoice ${invoiceId.value} not found for user ${userId.value}`),
        );
      }

      return ok(undefined);
    } catch (e) {
      logger.error({ err: e }, "failed to delete invoice");
      return err(new InvoicePersistenceError("Failed to delete invoice", e));
    }
  },
};

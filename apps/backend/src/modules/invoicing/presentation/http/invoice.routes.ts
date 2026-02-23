import { Elysia, t } from "elysia";

import { publish } from "@distributed-systems/rabbitmq";
import { ApiRoutes } from "@distributed-systems/shared";

import { createInvoiceHandler } from "#invoicing/application/commands/create-invoice/create-invoice.handler";
import { deleteInvoiceHandler } from "#invoicing/application/commands/delete-invoice/delete-invoice.handler";
import { retryInvoiceHandler } from "#invoicing/application/commands/retry-invoice/retry-invoice.handler";
import type { IMessagePublisher } from "#invoicing/application/ports/message-publisher.port";
import { listInvoicesHandler } from "#invoicing/application/queries/list-invoices/list-invoices.handler";
import { prismaInvoiceRepository } from "#invoicing/infrastructure/repositories/prisma-invoice.repository";

const repository = prismaInvoiceRepository;
// Thin local adapter: wraps the shared publish primitive and satisfies the
// IMessagePublisher port defined in the application layer. The port stays in
// this app; only the infrastructure primitive lives in @distributed-systems/rabbitmq.
const publisher: IMessagePublisher = { publish };

export const invoiceRoutes = new Elysia({ prefix: ApiRoutes.INVOICES })
  // GET /invoices — query, no side effects
  .get("/", async ({ status }) => {
    const result = await listInvoicesHandler(repository);

    if (!result.ok) {
      return status(500, { message: result.error.message });
    }

    return result.value;
  })
  // POST /invoices — command, returns { id } only (CQS: no domain data returned)
  .post(
    "/",
    async ({ body, status }) => {
      const createInvoiceCommand = { name: body.name, amount: body.amount };
      const deps = { repository, publisher };

      const result = await createInvoiceHandler(createInvoiceCommand, deps);

      if (!result.ok) {
        return status(500, { message: result.error.message });
      }

      return status(201, result.value); // { id: number }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        amount: t.Number({ minimum: 0 }),
      }),
    },
  )
  // PATCH /invoices/:id — fix data and re-queue a failed invoice
  .patch(
    "/:id",
    async ({ params, body, status }) => {
      const command = { invoiceId: Number(params.id), name: body.name, amount: body.amount };
      const result = await retryInvoiceHandler(command, { repository, publisher });

      if (!result.ok) {
        const error = result.error;
        const code = "type" in error && error.type === "not_found" ? 404 : 400;
        return status(code, { message: error.message });
      }

      return result.value;
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        amount: t.Number({ minimum: 0 }),
      }),
    },
  )
  // DELETE /invoices/:id — command, permanently removes an invoice
  .delete("/:id", async ({ params, status }) => {
    const result = await deleteInvoiceHandler({ invoiceId: Number(params.id) }, { repository });
    if (!result.ok) return status(500, { message: result.error.message });
    return status(204, null);
  });

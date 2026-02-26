import { Elysia, t } from "elysia";

import { publish } from "@distributed-systems/rabbitmq";
import { ApiRoutes } from "@distributed-systems/shared";

import { createInvoiceHandler } from "#invoicing/application/commands/create-invoice/create-invoice.handler";
import { deleteInvoiceHandler } from "#invoicing/application/commands/delete-invoice/delete-invoice.handler";
import { retryInvoiceHandler } from "#invoicing/application/commands/retry-invoice/retry-invoice.handler";
import type { IMessagePublisher } from "#invoicing/application/ports/message-publisher.port";
import { listInvoicesHandler } from "#invoicing/application/queries/list-invoices/list-invoices.handler";
import { prismaInvoiceRepository } from "#invoicing/infrastructure/repositories/prisma-invoice.repository";
import { authPlugin } from "#shared/plugins/auth.plugin";

const repository = prismaInvoiceRepository;
const publisher: IMessagePublisher = { publish };

interface InvoiceRoutesOptions {
  jwtSecret: string;
}

export function invoiceRoutes({ jwtSecret }: InvoiceRoutesOptions) {
  return (
    new Elysia({ prefix: ApiRoutes.INVOICES })
      .use(authPlugin({ jwtSecret }))

      // GET /invoices
      .get("/", async ({ status, currentUser }) => {
        const result = await listInvoicesHandler(repository, currentUser.userId);
        if (!result.ok) {
          return status(500, { message: result.error.message });
        }
        return result.value;
      })

      // POST /invoices
      .post(
        "/",
        async ({ body, status, currentUser }) => {
          const createInvoiceCommand = {
            name: body.name,
            amount: body.amount,
            userId: currentUser.userId,
          };
          const deps = { repository, publisher };

          const result = await createInvoiceHandler(createInvoiceCommand, deps);
          if (!result.ok) {
            return status(500, { message: result.error.message });
          }
          return status(201, result.value);
        },
        {
          body: t.Object({
            name: t.String({ minLength: 1 }),
            amount: t.Number({ minimum: 0 }),
          }),
        },
      )

      // PATCH /invoices/:id
      .patch(
        "/:id",
        async ({ params, body, status, currentUser }) => {
          const command = {
            invoiceId: Number(params.id),
            userId: currentUser.userId,
            name: body.name,
            amount: body.amount,
          };
          const result = await retryInvoiceHandler(command, { repository, publisher });

          if (!result.ok) {
            const error = result.error;
            if ("type" in error) {
              if (error.type === "not_found") return status(404, { message: error.message });
              if (error.type === "forbidden") return status(403, { message: error.message });
            }
            return status(400, { message: error.message });
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

      // DELETE /invoices/:id
      .delete("/:id", async ({ params, status, currentUser }) => {
        const result = await deleteInvoiceHandler(
          { invoiceId: Number(params.id), userId: currentUser.userId },
          { repository },
        );
        if (!result.ok) {
          const error = result.error;
          if ("type" in error) {
            if (error.type === "not_found") return status(404, { message: error.message });
            if (error.type === "forbidden") return status(403, { message: error.message });
          }
          return status(500, { message: error.message });
        }
        return status(204, null);
      })
  );
}

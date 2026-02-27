import { Elysia, t } from "elysia";

import { publish } from "@distributed-systems/rabbitmq";
import { ApiRoutes } from "@distributed-systems/shared";

import { createInvoiceHandler } from "#invoicing/application/commands/create-invoice/create-invoice.handler";
import { deleteInvoiceHandler } from "#invoicing/application/commands/delete-invoice/delete-invoice.handler";
import { retryInvoiceHandler } from "#invoicing/application/commands/retry-invoice/retry-invoice.handler";
import type { IMessagePublisher } from "#invoicing/application/ports/message-publisher.port";
import { listInvoicesHandler } from "#invoicing/application/queries/list-invoices/list-invoices.handler";
import {
  InvoiceForbiddenError,
  InvoiceInvalidStatusError,
  InvoiceNotFoundError,
  InvoicePersistenceError,
} from "#invoicing/domain/errors/invoice.errors";
import { prismaInvoiceRepository } from "#invoicing/infrastructure/repositories/prisma-invoice.repository";
import { toInvoiceDTO } from "#invoicing/presentation/http/invoice.mapper";
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
        return result.value.map(toInvoiceDTO);
      })

      // POST /invoices
      .post(
        "/",
        async ({ body, status, currentUser }) => {
          const createInvoiceCommand = {
            name: body.name,
            amount: body.amount,
            userId: currentUser.userId, // already a UUID string from the JWT
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
            invoiceId: params.id, // UUID string directly — no Number() coercion needed
            userId: currentUser.userId,
            name: body.name,
            amount: body.amount,
          };
          const result = await retryInvoiceHandler(command, { repository, publisher });

          if (!result.ok) {
            const error = result.error;
            const statusCode = getStatusCodeForError(error);
            return status(statusCode, { message: error.message });
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
          { invoiceId: params.id, userId: currentUser.userId },
          { repository },
        );
        if (!result.ok) {
          const error = result.error;
          const statusCode = getStatusCodeForError(error);
          return status(statusCode, { message: error.message });
        }
        return status(204, null);
      })
  );
}

function getStatusCodeForError(error: Error): number {
  if (error instanceof InvoicePersistenceError) {
    return 500;
  } else if (error instanceof InvoiceForbiddenError) {
    return 403;
  } else if (error instanceof InvoiceNotFoundError) {
    return 404;
  } else if (error instanceof InvoiceInvalidStatusError) {
    return 400;
  }

  return 400; // Default to Bad Request for unknown error types
}

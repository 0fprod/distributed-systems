import { Elysia, t } from "elysia";

import { publish } from "@distributed-systems/rabbitmq";
import { ApiRoutes } from "@distributed-systems/shared";

import { createInvoiceHandler } from "#modules/invoicing/application/commands/create-invoice/create-invoice.handler";
import type { IMessagePublisher } from "#modules/invoicing/application/ports/message-publisher.port";
import { listInvoicesHandler } from "#modules/invoicing/application/queries/list-invoices/list-invoices.handler";
import { prismaInvoiceRepository } from "#modules/invoicing/infrastructure/repositories/prisma-invoice.repository.js";

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
    // Validation schema for the request body
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        amount: t.Number({ minimum: 0 }),
      }),
    },
  );

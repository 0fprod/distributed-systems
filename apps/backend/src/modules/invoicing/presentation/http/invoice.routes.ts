import { Elysia, t } from "elysia";

import { ApiRoutes } from "@distributed-systems/shared";

import { createInvoiceHandler } from "#modules/invoicing/application/commands/create-invoice/create-invoice.handler";
import { listInvoicesHandler } from "#modules/invoicing/application/queries/list-invoices/list-invoices.handler";
import { prismaInvoiceRepository } from "#modules/invoicing/infrastructure/repositories/prisma-invoice.repository.js";
import { rabbitMQPublisher } from "#shared/infrastructure/messaging/rabbitmq.publisher";

const repository = prismaInvoiceRepository;
const publisher = rabbitMQPublisher;

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

import { Elysia, t } from "elysia";

import { createLogger, runWithContext } from "@distributed-systems/logger";
import { publish } from "@distributed-systems/rabbitmq";
import { ApiRoutes } from "@distributed-systems/shared";

import { createInvoiceHandler } from "#invoicing/application/commands/create-invoice/create-invoice.handler";
import { deleteInvoiceHandler } from "#invoicing/application/commands/delete-invoice/delete-invoice.handler";
import { retryInvoiceHandler } from "#invoicing/application/commands/retry-invoice/retry-invoice.handler";
import type { IMessagePublisher } from "#invoicing/application/ports/message-publisher.port";
import { listInvoicesHandler } from "#invoicing/application/queries/list-invoices/list-invoices.handler";
import type { ListInvoicesQuery } from "#invoicing/application/queries/list-invoices/list-invoices.query";
import { prismaInvoiceRepository } from "#invoicing/infrastructure/repositories/prisma-invoice.repository";
import { toInvoiceDTO } from "#invoicing/presentation/http/invoice.mapper";
import { authPlugin } from "#shared/plugins/auth.plugin";
import { requestIdPlugin } from "#shared/plugins/request-id.plugin";
import { markSpanError } from "#shared/utils/span";

const logger = createLogger("invoice-routes");

const repository = prismaInvoiceRepository;
const publisher: IMessagePublisher = { publish };

interface InvoiceRoutesOptions {
  jwtSecret: string;
}

export function invoiceRoutes({ jwtSecret }: InvoiceRoutesOptions) {
  return (
    new Elysia({ prefix: ApiRoutes.INVOICES })
      .use(requestIdPlugin)
      .use(authPlugin({ jwtSecret }))

      // GET /invoices
      .get(
        "/",
        async ({ status, currentUser, requestId, query }) => {
          return runWithContext(requestId, async () => {
            const listQuery: ListInvoicesQuery = {
              userId: currentUser.userId,
              page: query.page ?? 1,
              limit: query.limit ?? 20,
              ...(query.status !== undefined && { status: query.status }),
              ...(query.name !== undefined && { name: query.name }),
              ...(query.minAmount !== undefined && { minAmount: query.minAmount }),
              ...(query.maxAmount !== undefined && { maxAmount: query.maxAmount }),
            };
            const result = await listInvoicesHandler(listQuery, { repository });
            if (!result.ok) {
              logger.error({ err: result.error.cause }, result.error.message);
              markSpanError(result.error.cause, result.error.message);
              return status(500, { message: result.error.message });
            }
            return {
              data: result.value.items.map(toInvoiceDTO),
              total: result.value.total,
              page: listQuery.page,
              limit: listQuery.limit,
            };
          });
        },
        {
          query: t.Object({
            page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
            limit: t.Optional(t.Integer({ minimum: 1, maximum: 100, default: 20 })),
            status: t.Optional(
              t.Union([
                t.Literal("pending"),
                t.Literal("inprogress"),
                t.Literal("completed"),
                t.Literal("failed"),
              ]),
            ),
            name: t.Optional(t.String()),
            minAmount: t.Optional(t.Number({ minimum: 0 })),
            maxAmount: t.Optional(t.Number({ minimum: 0 })),
          }),
        },
      )

      // POST /invoices
      .post(
        "/",
        async ({ body, status, currentUser, requestId }) => {
          return runWithContext(requestId, async () => {
            const createInvoiceCommand = {
              name: body.name,
              amount: body.amount,
              userId: currentUser.userId, // already a UUID string from the JWT
            };
            const deps = { repository, publisher };

            const result = await createInvoiceHandler(createInvoiceCommand, deps);
            if (!result.ok) {
              logger.error({ err: result.error.cause }, result.error.message);
              markSpanError(result.error.cause, result.error.message);
              return status(500, { message: result.error.message });
            }
            return status(201, result.value);
          });
        },
        {
          body: t.Object({
            name: t.String({ minLength: 1 }),
            amount: t.Number({ minimum: 0 }),
          }),
        },
      )

      // POST /invoices/invalid — no body validation; hardcoded invalid data so the
      // request passes the HTTP layer but fails worker validation (ensureInvoiceIsValid),
      // routing the message to the DLQ. Used exclusively for DLQ testing.
      .post("/invalid", async ({ status, currentUser, requestId }) => {
        return runWithContext(requestId, async () => {
          const command = {
            name: "", // invalid: empty name
            amount: -1, // invalid: negative amount
            userId: currentUser.userId,
          };
          const result = await createInvoiceHandler(command, { repository, publisher });
          if (!result.ok) {
            logger.error({ err: result.error.cause }, result.error.message);
            markSpanError(result.error.cause, result.error.message);
            return status(500, { message: result.error.message });
          }
          return status(201, result.value);
        });
      })

      // PATCH /invoices/:id
      .patch(
        "/:id",
        async ({ params, body, status, currentUser, requestId }) => {
          return runWithContext(requestId, async () => {
            const command = {
              invoiceId: params.id, // UUID string directly — no Number() coercion needed
              userId: currentUser.userId,
              name: body.name,
              amount: body.amount,
            };
            const result = await retryInvoiceHandler(command, { repository, publisher });

            if (!result.ok) {
              const error = result.error;
              switch (error.type) {
                case "not_found":
                  return status(404, { message: error.message });
                case "forbidden":
                  return status(403, { message: error.message });
                case "invalid_status":
                  return status(400, { message: error.message });
                case "persistence_error":
                  logger.error({ err: error.cause }, error.message);
                  markSpanError(error.cause, error.message);
                  return status(500, { message: error.message });
              }
            }

            return result.value;
          });
        },
        {
          body: t.Object({
            name: t.String({ minLength: 1 }),
            amount: t.Number({ minimum: 0 }),
          }),
        },
      )

      // DELETE /invoices/:id
      .delete("/:id", async ({ params, status, currentUser, requestId }) => {
        return runWithContext(requestId, async () => {
          const result = await deleteInvoiceHandler(
            { invoiceId: params.id, userId: currentUser.userId },
            { repository },
          );
          if (!result.ok) {
            const error = result.error;
            switch (error.type) {
              case "not_found":
                return status(404, { message: error.message });
              case "forbidden":
                return status(403, { message: error.message });
              case "persistence_error":
                logger.error({ err: error.cause }, error.message);
                markSpanError(error.cause, error.message);
                return status(500, { message: error.message });
            }
          }
          return status(204, null);
        });
      })
  );
}

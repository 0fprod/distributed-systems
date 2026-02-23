import { describe, expect, it } from "bun:test";

import { InvoicePersistenceError } from "#invoicing/domain/errors/invoice.errors";
import type { IInvoiceRepository } from "#invoicing/domain/repositories/invoice.repository.interface";
import { err, ok } from "#shared/core/result";

import { deleteInvoiceHandler } from "./delete-invoice.handler";

// Stub repository: only deleteById is relevant to this use case.
// All other methods are intentionally left unimplemented — the handler
// must not touch them, and TypeScript will enforce the contract.
function makeRepository(deleteById: IInvoiceRepository["deleteById"]): IInvoiceRepository {
  return {
    save: () => {
      throw new Error("not implemented");
    },
    update: () => {
      throw new Error("not implemented");
    },
    findById: () => {
      throw new Error("not implemented");
    },
    findAll: () => {
      throw new Error("not implemented");
    },
    deleteById,
  };
}

describe("deleteInvoiceHandler", () => {
  it("returns ok(undefined) when the repository deletes successfully", async () => {
    const repository = makeRepository(async (_id) => ok(undefined));

    const result = await deleteInvoiceHandler({ invoiceId: 42 }, { repository });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeUndefined();
  });

  it("propagates the persistence error when the repository fails", async () => {
    const persistenceError = new InvoicePersistenceError("Failed to delete invoice");
    const repository = makeRepository(async (_id) => err(persistenceError));

    const result = await deleteInvoiceHandler({ invoiceId: 42 }, { repository });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(persistenceError);
  });

  it("passes the correct invoiceId to the repository", async () => {
    let capturedId: number | undefined;
    const repository = makeRepository(async (id) => {
      capturedId = id;
      return ok(undefined);
    });

    await deleteInvoiceHandler({ invoiceId: 7 }, { repository });

    expect(capturedId).toBe(7);
  });
});

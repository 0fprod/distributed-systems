import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";

import type { Invoice } from "@distributed-systems/shared";
import { ApiRoutes, InvoiceStatus } from "@distributed-systems/shared";

import { givenAnInvoice } from "./builders/invoice.builder";
import { type Stack, startStack, waitForStatus } from "./setup";

let ctx: Stack;

beforeAll(async () => {
  ctx = await startStack();
}, 90_000);

afterAll(async () => {
  await ctx.teardown();
});

beforeEach(async () => {
  await ctx.prisma.invoice.deleteMany();
});

describe("Invoice integration", () => {
  it("processes an invoice end-to-end", async () => {
    // Arrange — DB is clean (handled by beforeEach)

    // Act
    const postRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Acme Corp", amount: 1200 }),
    });

    expect(postRes.status).toBe(201);
    const { id } = (await postRes.json()) as Pick<Invoice, "id">;

    await waitForStatus(ctx.baseUrl, id, InvoiceStatus.COMPLETED);

    // Assert
    const listRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}`);
    const invoices = (await listRes.json()) as Invoice[];

    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({
      id,
      name: "Acme Corp",
      amount: 1200,
      status: InvoiceStatus.COMPLETED,
    });
  }, 30_000);

  it("deletes an invoice", async () => {
    // Arrange
    const invoice = await givenAnInvoice(ctx.prisma).save();

    // Act
    const deleteRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}/${invoice.id}`, {
      method: "DELETE",
    });

    // Assert
    expect(deleteRes.status).toBe(204);

    const listRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}`);
    const invoices = (await listRes.json()) as Invoice[];
    expect(invoices).toHaveLength(0);
  }, 15_000);

  it("updates a failed invoice and reprocesses it", async () => {
    // Arrange
    const failed = await givenAnInvoice(ctx.prisma)
      .withName("Bad Name")
      .withAmount(-1)
      .withStatus(InvoiceStatus.FAILED)
      .save();

    // Act
    const patchRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}/${failed.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Fixed Name", amount: 500 }),
    });

    expect(patchRes.status).toBe(200);
    await waitForStatus(ctx.baseUrl, failed.id, InvoiceStatus.COMPLETED);

    // Assert
    const listRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}`);
    const invoices = (await listRes.json()) as Invoice[];

    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({
      id: failed.id,
      name: "Fixed Name",
      amount: 500,
      status: InvoiceStatus.COMPLETED,
    });
  }, 30_000);

  it("rejects patch when invoice is not in failed status", async () => {
    // Arrange
    const completed = await givenAnInvoice(ctx.prisma).withStatus(InvoiceStatus.COMPLETED).save();

    // Act
    const patchRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}/${completed.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X", amount: 100 }),
    });

    // Assert
    expect(patchRes.status).toBe(400);
  }, 10_000);
});

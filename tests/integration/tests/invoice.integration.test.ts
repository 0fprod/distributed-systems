import { beforeAll, beforeEach, describe, expect, it } from "bun:test";

import type { InvoiceDTO, PaginatedResponse } from "@distributed-systems/shared";
import { ApiRoutes, InvoiceStatus } from "@distributed-systems/shared";

import { givenAnInvoice } from "../builders/invoice.builder";
import { type Stack, loginAs, waitForStatus } from "../setup";

let ctx: Stack;
let sessionCookie: string;
let userId: string; // UUID string since IDs migrated to uuid()

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx = (globalThis as any).__STACK__ as Stack;
  if (!ctx) throw new Error("Stack not initialized. Did you forget --preload?");
});

beforeEach(async () => {
  await ctx.prisma.invoice.deleteMany();
  await ctx.prisma.user.deleteMany();

  // Create the user directly in DB via the builder (avoids going through HTTP /register).
  // The builder stores passwords as-is in the passwordHash field, but login goes through
  // the HTTP stack which uses bcrypt — so we register via HTTP to get a properly hashed password,
  // and then use the builder only for invoice ownership (userId).
  await fetch(`${ctx.baseUrl}${ApiRoutes.REGISTER}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email: "test@example.com", password: "secret123" }),
  });

  // Obtain a fresh session cookie and userId for every test.
  ({ cookie: sessionCookie, userId } = await loginAs(ctx.baseUrl, "test@example.com", "secret123"));
});

describe("Invoice integration", () => {
  it("processes an invoice end-to-end", async () => {
    // Arrange — DB is clean (handled by beforeEach)

    // Act
    const postRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ name: "Acme Corp", amount: 1200 }),
    });

    expect(postRes.status).toBe(201);
    const { id } = (await postRes.json()) as Pick<InvoiceDTO, "id">;
    // id is now a UUID string
    expect(typeof id).toBe("string");

    await waitForStatus(ctx.baseUrl, id, InvoiceStatus.COMPLETED, 20_000, sessionCookie);

    // Assert
    const listRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}`, {
      headers: { Cookie: sessionCookie },
    });
    const { data: invoices } = (await listRes.json()) as PaginatedResponse<InvoiceDTO>;

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
    const invoice = await givenAnInvoice(ctx.prisma).forUser(userId).save();

    // Act
    const deleteRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}/${invoice.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie },
    });

    // Assert
    expect(deleteRes.status).toBe(204);

    const listRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}`, {
      headers: { Cookie: sessionCookie },
    });
    const { data: invoices } = (await listRes.json()) as PaginatedResponse<InvoiceDTO>;
    expect(invoices).toHaveLength(0);
  }, 15_000);

  it("updates a failed invoice and reprocesses it", async () => {
    // Arrange
    const failed = await givenAnInvoice(ctx.prisma)
      .forUser(userId)
      .withName("Bad Name")
      .withAmount(-1)
      .withStatus(InvoiceStatus.FAILED)
      .save();

    // Act
    const patchRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}/${failed.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ name: "Fixed Name", amount: 500 }),
    });

    expect(patchRes.status).toBe(200);
    await waitForStatus(ctx.baseUrl, failed.id, InvoiceStatus.COMPLETED, 20_000, sessionCookie);

    // Assert
    const listRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}`, {
      headers: { Cookie: sessionCookie },
    });
    const { data: invoices } = (await listRes.json()) as PaginatedResponse<InvoiceDTO>;

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
    const completed = await givenAnInvoice(ctx.prisma)
      .forUser(userId)
      .withStatus(InvoiceStatus.COMPLETED)
      .save();

    // Act
    const patchRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}/${completed.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ name: "X", amount: 100 }),
    });

    // Assert
    expect(patchRes.status).toBe(400);
  }, 10_000);

  it("user A cannot delete an invoice belonging to user B", async () => {
    // Arrange — register user B and create an invoice for them.
    await fetch(`${ctx.baseUrl}${ApiRoutes.REGISTER}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Other User",
        email: "other@example.com",
        password: "secret456",
      }),
    });
    const { userId: userIdB } = await loginAs(ctx.baseUrl, "other@example.com", "secret456");

    const invoiceB = await givenAnInvoice(ctx.prisma).forUser(userIdB).withName("B Invoice").save();

    // Act — user A (sessionCookie from beforeEach) tries to delete B's invoice.
    const deleteRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}/${invoiceB.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie },
    });

    // Assert — the server must reject the request (403 to avoid leaking ownership).
    expect(deleteRes.status).toBe(403);
  }, 15_000);

  it("user A cannot retry an invoice belonging to user B", async () => {
    // Arrange — register user B and create a failed invoice for them.
    await fetch(`${ctx.baseUrl}${ApiRoutes.REGISTER}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Other User",
        email: "other@example.com",
        password: "secret456",
      }),
    });
    const { userId: userIdB } = await loginAs(ctx.baseUrl, "other@example.com", "secret456");

    const failedB = await givenAnInvoice(ctx.prisma)
      .forUser(userIdB)
      .withName("B Failed")
      .withAmount(100)
      .withStatus(InvoiceStatus.FAILED)
      .save();

    // Act — user A (sessionCookie from beforeEach) tries to retry B's invoice.
    const patchRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}/${failedB.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ name: "Retry Attempt", amount: 200 }),
    });

    // Assert — the server must return 403 Forbidden.
    expect(patchRes.status).toBe(403);
  }, 15_000);

  it("user A cannot see invoices belonging to user B", async () => {
    // Arrange — register and login user B.
    await fetch(`${ctx.baseUrl}${ApiRoutes.REGISTER}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Other User",
        email: "other@example.com",
        password: "secret456",
      }),
    });
    const { cookie: cookieB, userId: userIdB } = await loginAs(
      ctx.baseUrl,
      "other@example.com",
      "secret456",
    );

    // User B has one invoice; the primary user (A) has none yet.
    await givenAnInvoice(ctx.prisma).forUser(userIdB).withName("B Invoice").save();

    // Act — user A lists their invoices.
    const listRes = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}`, {
      headers: { Cookie: sessionCookie },
    });
    const { data: invoicesA } = (await listRes.json()) as PaginatedResponse<InvoiceDTO>;

    // Assert — user A sees nothing (invoice belongs to B).
    expect(invoicesA).toHaveLength(0);

    // Sanity check — user B sees their own invoice.
    const listResB = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}`, {
      headers: { Cookie: cookieB },
    });
    const { data: invoicesB } = (await listResB.json()) as PaginatedResponse<InvoiceDTO>;
    expect(invoicesB).toHaveLength(1);
    expect(invoicesB[0]).toMatchObject({ name: "B Invoice" });
  }, 15_000);
});

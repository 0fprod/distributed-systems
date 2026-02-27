import { beforeAll, beforeEach, describe, expect, it } from "bun:test";

import { ApiRoutes } from "@distributed-systems/shared";

import type { Stack } from "../setup";

let ctx: Stack;

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx = (globalThis as any).__STACK__ as Stack;
  if (!ctx) throw new Error("Stack not initialized. Did you forget --preload?");
});

beforeEach(async () => {
  await ctx.prisma.user.deleteMany();
});

describe("User registration", () => {
  it("registers a user and persists them with a hashed password", async () => {
    // Act
    const res = await fetch(`${ctx.baseUrl}${ApiRoutes.REGISTER}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice", email: "alice@example.com", password: "secret123" }),
    });

    // Assert — HTTP
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    // id is now a UUID string (was a number before IDs migrated to uuid())
    expect(typeof body.id).toBe("string");
    expect(body.id.length).toBeGreaterThan(0);

    // Assert — DB: user persisted with hashed password
    const user = await ctx.prisma.user.findUnique({ where: { email: "alice@example.com" } });
    expect(user).not.toBeNull();
    expect(user!.name).toBe("Alice");
    expect(user!.password).not.toBe("secret123"); // must NOT be plain text
    expect(user!.password).toMatch(/^\$2[aby]\$/); // bcrypt hash
  }, 15_000);

  it("returns 400 when password is shorter than 6 characters", async () => {
    // Act
    const res = await fetch(`${ctx.baseUrl}${ApiRoutes.REGISTER}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bob", email: "bob@example.com", password: "abc" }),
    });

    // Assert
    expect(res.status).toBe(422);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain("6");
  }, 10_000);

  it("returns 400 when email is already registered", async () => {
    // Arrange — register once
    await fetch(`${ctx.baseUrl}${ApiRoutes.REGISTER}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Carol", email: "carol@example.com", password: "secret123" }),
    });

    // Act — register again with same email
    const res = await fetch(`${ctx.baseUrl}${ApiRoutes.REGISTER}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Carol 2", email: "carol@example.com", password: "secret456" }),
    });

    // Assert
    expect(res.status).toBe(400);
  }, 10_000);
});

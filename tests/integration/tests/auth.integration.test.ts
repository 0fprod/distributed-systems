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

// Helper: register a user and return their credentials
async function registerUser(email: string, password: string) {
  await fetch(`${ctx.baseUrl}${ApiRoutes.REGISTER}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email, password }),
  });
}

describe("Authentication — POST /login", () => {
  it("sets an HttpOnly session cookie on valid credentials", async () => {
    // Arrange
    await registerUser("alice@example.com", "secret123");

    // Act
    const res = await fetch(`${ctx.baseUrl}${ApiRoutes.LOGIN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@example.com", password: "secret123" }),
    });

    // Assert — status
    expect(res.status).toBe(200);

    // Assert — cookie set with HttpOnly flag
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain("session=");
    expect(setCookie?.toLowerCase()).toContain("httponly");
  }, 15_000);

  it("returns 401 for wrong password", async () => {
    // Arrange
    await registerUser("bob@example.com", "correct123");

    // Act
    const res = await fetch(`${ctx.baseUrl}${ApiRoutes.LOGIN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bob@example.com", password: "wrongpass" }),
    });

    // Assert
    expect(res.status).toBe(401);
  }, 10_000);

  it("returns 401 for non-existent email (no user enumeration)", async () => {
    // Act
    const res = await fetch(`${ctx.baseUrl}${ApiRoutes.LOGIN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ghost@example.com", password: "anything" }),
    });

    // Assert — same status code as wrong password (prevents user enumeration)
    expect(res.status).toBe(401);
  }, 10_000);
});

describe("Authentication — GET /me", () => {
  it("returns the current user when session cookie is valid", async () => {
    // Arrange — register and login to obtain cookie
    await registerUser("carol@example.com", "secret123");

    const loginRes = await fetch(`${ctx.baseUrl}${ApiRoutes.LOGIN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "carol@example.com", password: "secret123" }),
    });

    const setCookie = loginRes.headers.get("set-cookie")!;
    // Extract only the cookie name=value part to forward
    const cookieHeader = setCookie.split(";")[0];

    // Act
    const meRes = await fetch(`${ctx.baseUrl}${ApiRoutes.ME}`, {
      headers: { Cookie: cookieHeader },
    });

    // Assert
    expect(meRes.status).toBe(200);
    const body = (await meRes.json()) as { id: number; email: string };
    expect(body.email).toBe("carol@example.com");
    expect(body.id).toBeNumber();
  }, 15_000);

  it("returns 401 when no session cookie is present", async () => {
    const res = await fetch(`${ctx.baseUrl}${ApiRoutes.ME}`);
    expect(res.status).toBe(401);
  }, 10_000);
});

describe("Authentication — POST /logout", () => {
  it("clears the session cookie", async () => {
    // Arrange — register and login
    await registerUser("dave@example.com", "secret123");

    const loginRes = await fetch(`${ctx.baseUrl}${ApiRoutes.LOGIN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dave@example.com", password: "secret123" }),
    });

    const setCookie = loginRes.headers.get("set-cookie")!;
    const cookieHeader = setCookie.split(";")[0];

    // Act
    const logoutRes = await fetch(`${ctx.baseUrl}${ApiRoutes.LOGOUT}`, {
      method: "POST",
      headers: { Cookie: cookieHeader },
    });

    // Assert
    expect(logoutRes.status).toBe(200);

    // The Set-Cookie header should clear the session (max-age=0 or expires in the past)
    const logoutCookie = logoutRes.headers.get("set-cookie");
    expect(logoutCookie).not.toBeNull();
    // A cleared cookie will have Max-Age=0 or expires epoch
    const isCleared =
      logoutCookie?.includes("Max-Age=0") ||
      logoutCookie?.includes("max-age=0") ||
      logoutCookie?.includes("Expires=Thu, 01 Jan 1970");
    expect(isCleared).toBeTrue();
  }, 15_000);
});

describe("Invoice routes require authentication", () => {
  it("returns 401 when accessing /invoices without session cookie", async () => {
    const res = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}`);
    expect(res.status).toBe(401);
  }, 10_000);

  it("returns invoices when session cookie is valid", async () => {
    // Arrange — register and login
    await registerUser("eve@example.com", "secret123");

    const loginRes = await fetch(`${ctx.baseUrl}${ApiRoutes.LOGIN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "eve@example.com", password: "secret123" }),
    });

    const setCookie = loginRes.headers.get("set-cookie")!;
    const cookieHeader = setCookie.split(";")[0];

    // Act
    const res = await fetch(`${ctx.baseUrl}${ApiRoutes.INVOICES}`, {
      headers: { Cookie: cookieHeader },
    });

    // Assert
    expect(res.status).toBe(200);
  }, 15_000);
});

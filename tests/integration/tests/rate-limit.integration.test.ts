import { beforeAll, describe, expect, it } from "bun:test";

import { ApiRoutes } from "@distributed-systems/shared";

import type { Stack } from "../setup";

let ctx: Stack;

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx = (globalThis as any).__STACK__ as Stack;
  if (!ctx) throw new Error("Stack not initialized. Did you forget --preload?");
});

// Each test uses a unique IP range to avoid interference between tests.
// The rate limit store is shared across the entire test run (one backend process).

describe("Rate limiting", () => {
  it("includes RateLimit headers in every response", async () => {
    const res = await fetch(`${ctx.baseUrl}${ApiRoutes.HEALTH}`, {
      headers: { "X-Forwarded-For": "10.0.0.1" },
    });

    expect(res.headers.get("RateLimit-Limit")).toBe("60");
    expect(Number(res.headers.get("RateLimit-Remaining"))).toBeGreaterThanOrEqual(0);
    expect(Number(res.headers.get("RateLimit-Reset"))).toBeGreaterThanOrEqual(0);
  });

  it("counts each IP independently (X-Forwarded-For is used as key)", async () => {
    const ip1 = "10.0.1.1";
    const ip2 = "10.0.1.2";

    // Burn 5 requests from ip1
    for (let i = 0; i < 5; i++) {
      await fetch(`${ctx.baseUrl}${ApiRoutes.HEALTH}`, {
        headers: { "X-Forwarded-For": ip1 },
      });
    }

    // ip2 has its own independent counter — first request should show remaining = 59
    const res = await fetch(`${ctx.baseUrl}${ApiRoutes.HEALTH}`, {
      headers: { "X-Forwarded-For": ip2 },
    });

    expect(res.status).toBe(200);
    expect(Number(res.headers.get("RateLimit-Remaining"))).toBe(59);
  });

  it("returns 429 once the limit is exceeded", async () => {
    const ip = "10.0.2.1";
    const max = 60;

    // Exhaust the limit with concurrent requests
    await Promise.all(
      Array.from({ length: max }, () =>
        fetch(`${ctx.baseUrl}${ApiRoutes.HEALTH}`, {
          headers: { "X-Forwarded-For": ip },
        }),
      ),
    );

    // Request max+1 should be blocked
    const res = await fetch(`${ctx.baseUrl}${ApiRoutes.HEALTH}`, {
      headers: { "X-Forwarded-For": ip },
    });

    expect(res.status).toBe(429);
  }, 15_000);
});

import { describe, expect, it } from "bun:test";

import { Password } from "#users/domain/value-objects/password.vo";

describe("Password Value Object", () => {
  it("accepts a valid password (>= 6 characters)", async () => {
    const result = await Password.create("secret123");
    expect(result.ok).toBe(true);
  });

  it("rejects a password shorter than 6 characters", async () => {
    const result = await Password.create("abc");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("weak_password");
    }
  });

  it("stores a hash, not the plain text password", async () => {
    const raw = "secret123";
    const result = await Password.create(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).not.toBe(raw);
      expect(result.value.value).toMatch(/^\$2[aby]\$/); // bcrypt hash prefix
    }
  });
});

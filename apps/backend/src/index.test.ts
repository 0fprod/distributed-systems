import { describe, expect, it } from "bun:test";

import { greet } from "@distributed-systems/shared";

describe("backend", () => {
  it("greets the backend", () => {
    expect(greet("backend")).toBe("Hello from backend!");
  });
});

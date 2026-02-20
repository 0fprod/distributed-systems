import { describe, expect, it } from "bun:test";

import { greet } from "@distributed-systems/shared";

describe("worker", () => {
  it("greets the worker", () => {
    expect(greet("worker")).toBe("Hello from worker!");
  });
});

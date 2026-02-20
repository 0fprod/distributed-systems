import { describe, expect, it } from "bun:test";
import { greet } from "@distributed-systems/shared";

describe("frontend", () => {
  it("greets the frontend", () => {
    expect(greet("frontend")).toBe("Hello from frontend!");
  });
});

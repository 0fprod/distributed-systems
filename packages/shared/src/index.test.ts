import { describe, expect, it } from "bun:test";
import { greet } from "./index";

describe("shared", () => {
  it("greet returns expected message", () => {
    expect(greet("world")).toBe("Hello from world!");
  });

  it("greet handles empty string", () => {
    expect(greet("")).toBe("Hello from !");
  });
});

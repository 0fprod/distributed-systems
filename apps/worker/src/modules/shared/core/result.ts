// Single source of truth lives in @distributed-systems/shared.
// This re-export keeps all existing worker imports (`#shared/core/result`) working.
export { type Result, ok, err } from "@distributed-systems/shared";

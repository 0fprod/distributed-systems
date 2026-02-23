// Result<T, E> — a discriminated union for explicit error handling.
// Commands returning domain data violates CQS; instead we wrap errors
// in a typed Result so callers can handle failure without exceptions.
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

import { SpanStatusCode, trace } from "@opentelemetry/api";

/**
 * Marks the currently active OTel span as ERROR.
 *
 * Why: The Result pattern never throws, so @elysiajs/opentelemetry never
 * sees an exception and leaves the span status as OK — even for 500s.
 * This helper bridges that gap: call it for every persistence_error
 * (5xx) outcome so Jaeger surfaces the failure correctly.
 *
 * 4xx outcomes (not_found, forbidden, invalid_status, invalid_credentials,
 * weak_password, duplicate_email) are expected domain outcomes and must NOT
 * be marked as errors — they represent valid, handled business paths.
 */
export function markSpanError(err: unknown, message?: string): void {
  const span = trace.getActiveSpan();
  if (!span) return;
  span.recordException(err instanceof Error ? err : new Error(String(err)));
  // exactOptionalPropertyTypes: only include `message` when it is defined
  // to satisfy SpanStatus which declares `message?: string` (not `string | undefined`).
  span.setStatus(
    message !== undefined
      ? { code: SpanStatusCode.ERROR, message }
      : { code: SpanStatusCode.ERROR },
  );
}

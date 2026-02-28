import { AsyncLocalStorage } from "async_hooks";
import pino from "pino";

// Storage that propagates requestId throughout the entire async chain without
// threading it through every function parameter. Each HTTP request and each
// RabbitMQ message runs inside its own storage context so the requestId never
// leaks across concurrent operations.
const storage = new AsyncLocalStorage<{ requestId: string }>();

// Wrap an async function in a context that carries the given requestId.
// Call this at the entry point of each HTTP request and each RabbitMQ message.
export function runWithContext<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId }, fn);
}

// Exposed for callers that need to read the current requestId explicitly
// (e.g. when constructing a RabbitMQ payload to propagate the id downstream).
// Returns undefined when called outside an active context (startup, tests).
export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

const isDev = process.env.NODE_ENV !== "production";

// Base pino options shared across all loggers.
// In development: pretty-print for human readability.
// In production: JSON for log aggregators (Loki, Datadog, etc.).
// createLogger returns a named child logger.
// Pass the service/module name so every log line carries it:
//   { service: "backend", module: "invoice-consumer", ... }
export function createLogger(module: string) {
  // Conditional spread avoids assigning `undefined` to `transport`, which
  // violates `exactOptionalPropertyTypes` — the key must be absent entirely
  // when not in development, not present with an undefined value.
  const options = {
    level: process.env.LOG_LEVEL ?? "info",
    ...(isDev && {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
    }),
  };
  const base = pino(options).child({ module });

  // Enriches every log call with requestId from AsyncLocalStorage when a context
  // is active. If no context is set (startup logs, unit tests) the bindings are
  // returned unchanged — no requestId field is added.
  function withContext(bindings: object): object {
    const requestId = getRequestId();
    return requestId ? { requestId, ...bindings } : bindings;
  }

  return {
    info(bindings: object, msg: string): void {
      base.info(withContext(bindings), msg);
    },
    warn(bindings: object, msg: string): void {
      base.warn(withContext(bindings), msg);
    },
    error(bindings: object, msg: string): void {
      base.error(withContext(bindings), msg);
    },
    debug(bindings: object, msg: string): void {
      base.debug(withContext(bindings), msg);
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;

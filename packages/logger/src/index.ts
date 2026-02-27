import pino from "pino";

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
  return pino(options).child({ module });
}

export type Logger = ReturnType<typeof createLogger>;

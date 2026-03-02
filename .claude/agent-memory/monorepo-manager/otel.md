# OpenTelemetry — Detailed Reference

Project: `/Users/fran/Workspace/distributed-systems`
Last updated: 2026-03-01

---

## Package: `@distributed-systems/otel` (`packages/otel`)

### Purpose

Provides `initWorkerOtel()` for non-HTTP services (currently only `apps/worker`). HTTP services use `@elysiajs/opentelemetry` instead, which ships its own SDK init.

### Files

```
packages/otel/
  package.json
  tsconfig.json
  src/index.ts     # exports initWorkerOtel()
```

### `initWorkerOtel()` behaviour

```ts
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

export function initWorkerOtel() {
  const exporter = new OTLPTraceExporter({
    url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
  });
  const provider = new NodeTracerProvider({
    resource: { attributes: { 'service.name': process.env.OTEL_SERVICE_NAME } },
  });
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.register();
}
```

- Must be called at the very top of `apps/worker/src/index.ts`, before any other imports, so the SDK is registered before any instrumented library loads.
- Is a no-op if `OTEL_EXPORTER_OTLP_ENDPOINT` or `OTEL_SERVICE_NAME` are unset (no throw).

### package.json dependencies

```json
{
  "dependencies": {
    "@opentelemetry/exporter-trace-otlp-proto": "^0.200.0",
    "@opentelemetry/sdk-trace-base": "^2.0.0",
    "@opentelemetry/sdk-trace-node": "^2.0.0"
  }
}
```

---

## Package: `@distributed-systems/logger` (`packages/logger`)

### OTel integration added

`withContext()` now calls `trace.getActiveSpan()?.spanContext()` and, if `isSpanContextValid()` returns true, appends `traceId` and `spanId` to the structured log object.

```ts
import { isSpanContextValid, trace } from '@opentelemetry/api';

const span = trace.getActiveSpan();
const ctx = span?.spanContext();
if (ctx && isSpanContextValid(ctx)) {
  logObject.traceId = ctx.traceId;
  logObject.spanId  = ctx.spanId;
}
```

When the OTel SDK is not initialised, `trace.getActiveSpan()` returns `undefined` — fully backward-compatible (no-op).

### dependency added to packages/logger/package.json

```json
"@opentelemetry/api": "^1.9.0"
```

---

## Package: `@distributed-systems/rabbitmq` (`packages/rabbitmq`)

### `publisher.ts` — inject traceparent

On every `channel.publish()` call, inject the current W3C trace context into AMQP message headers:

```ts
import { context, propagation } from '@opentelemetry/api';

const headers: Record<string, string> = {};
propagation.inject(context.active(), headers);
channel.publish(exchange, routingKey, content, { headers });
```

When no SDK is active, `propagation.inject` is a no-op and headers remain empty.

### `subscriber.ts` — `subscribeWork()` — extract + CONSUMER span

For each incoming work message:

1. Extract parent context from headers: `propagation.extract(context.active(), msg.properties.headers)`.
2. Create a child CONSUMER span linked to the backend's parent span.
3. Process the message inside `tracer.startActiveSpan(..., parentCtx, async (span) => { ... span.end(); })`.

### `subscriber.ts` — `subscribe()` — extract only (no span)

For fire-and-forget WS broadcast messages, extract context only (no span created) to propagate traceId into logger without creating orphan spans.

### dependency added to packages/rabbitmq/package.json

```json
"@opentelemetry/api": "^1.9.0"
```

---

## App: `apps/backend`

### OTel plugin setup in `src/index.ts`

```ts
import { opentelemetry } from '@elysiajs/opentelemetry';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

const app = new Elysia()
  .use(opentelemetry({
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  }))
  // ... other plugins
```

`@elysiajs/opentelemetry` MUST be the first plugin. It auto-configures `NodeTracerProvider` and instruments all Elysia routes and middleware.

`OTLPTraceExporter` reads `OTEL_EXPORTER_OTLP_ENDPOINT` from env automatically (no explicit url needed when the standard env var is set).

### dependencies added to apps/backend/package.json

```json
"@elysiajs/opentelemetry": "^1.4.0",
"@opentelemetry/exporter-trace-otlp-proto": "^0.200.0",
"@opentelemetry/sdk-trace-base": "^2.0.0"
```

---

## App: `apps/worker`

### `src/index.ts` — init before imports

```ts
import { initWorkerOtel } from '@distributed-systems/otel';
initWorkerOtel();

// all other imports follow AFTER this point
import { createConnection } from '@distributed-systems/rabbitmq';
// ...
```

### dependency added to apps/worker/package.json

```json
"@distributed-systems/otel": "workspace:*"
```

---

## Docker Compose — Jaeger service

```yaml
jaeger:
  image: jaegertracing/all-in-one:latest
  ports:
    - "16686:16686"   # Jaeger UI
    - "4318:4318"     # OTLP HTTP collector
  environment:
    COLLECTOR_OTLP_ENABLED: "true"
```

Backend and worker both point to Jaeger in docker-compose:

```yaml
OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4318
OTEL_SERVICE_NAME: backend   # or worker
```

For local dev (outside Docker), both `.env` files point to `http://localhost:4318`.

---

## Version Compatibility Matrix

| Package                                    | Version used  | Notes                                              |
| ------------------------------------------ | ------------- | -------------------------------------------------- |
| `@elysiajs/opentelemetry`                  | `^1.4.0`      | Pulls in `@opentelemetry/sdk-node@0.200.0`         |
| `@opentelemetry/sdk-trace-node`            | `^2.0.0`      | Required by `@elysiajs/opentelemetry` and `otel`   |
| `@opentelemetry/sdk-trace-base`            | `^2.0.0`      | Required by backend + otel package                 |
| `@opentelemetry/exporter-trace-otlp-proto` | `^0.200.0`    | Versioned as 0.200.x for OTel SDK 2.x              |
| `@opentelemetry/api`                       | `^1.9.0`      | Used by logger + rabbitmq (peer dep of SDK)        |

DO NOT install `@opentelemetry/sdk-trace-node@^1.x`, `@opentelemetry/sdk-trace-base@^1.x`, or `@opentelemetry/exporter-trace-otlp-proto@^0.57.x` alongside `@elysiajs/opentelemetry@1.4.x`. TypeScript will report errors because the `Resource` and `Span` types differ between SDK 1.x and 2.x.

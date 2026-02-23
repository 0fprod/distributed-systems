# CQS/DDD Backend Expert — Project Memory

## Project: distributed-systems monorepo

Root: `/Users/fran/Workspace/distributed-systems`
Package manager: bun@1.3.6 workspaces (`apps/*`, `packages/*`)
All commands: bun (never npm/npx)

## Domain

**Bounded context**: Invoicing
**Domain model** (in `packages/shared/src/index.ts`):

- `Invoice { id: number, name: string, amount: number, status: InvoiceStatus }`
- `InvoiceStatus = "inprogress" | "completed"`
- No DTOs — domain model IS the contract across all apps
- Mapper functions: PrismaInvoice → Invoice (in `packages/database`)

## Architecture decisions

See `plan.md` for full implementation plan.

Key decisions:

- Prisma lives in `packages/database` (Option C) — clean separation, both backend and worker import it
- SQLite for dev (`dev.db` at monorepo root)
- RabbitMQ fanout exchanges: `invoices.created` (backend→worker) and `invoices.completed` (worker→backend)
- Backend: ElysiaJS on port 3000; worker: pure RabbitMQ consumer (no HTTP server)
- Singleton channel pattern: one `amqplib.Channel` per process reused across all operations
- Exclusive + autoDelete queues for fanout consumers so each instance gets every message

## RabbitMQ conventions

**Package**: `packages/rabbitmq` (`@distributed-systems/rabbitmq`)

### Exported API

- `publish(exchange, message)` — uses dedicated publisher connection
- `subscribe(exchange, handler)` — fanout + exclusive + autoDelete → backend WS broadcast
- `subscribeWork(exchange, queueName, handler, options?)` — fanout + named durable queue + DLQ → worker competing consumers (messages persist, failed go to DLQ)
- `ConsumerChannels` — channel Map keys (infrastructure only)
- `QueueNames` — durable queue names (`worker.invoices.created`, `invoices.dead-letter`)
- `ExchangeNames` — DLX exchange name (`invoices.dlx`)

### Connection model

- Two separate connections: publisher + consumer (failure isolation)
- `getPublisherChannel()` — single channel for all publishing
- `getConsumerChannel(id: string)` — one channel per consumer in `Map<string, Channel>`; channel error only kills that consumer
- On connection error: all channels for that connection are cleared (`channels.clear()`)

### Consumer patterns

- `subscribe()`: `exclusive: true, autoDelete: true` → ephemeral per process, WS broadcast
- `subscribeWork()`: named durable queue + DLQ:
  - asserts `invoices.dlx` (direct, durable) + `invoices.dead-letter` queue
  - main queue has `x-dead-letter-exchange: invoices.dlx`
  - `nack(msg, false, false)` → message goes to DLQ instead of being lost
  - `prefetch` defaults to 1

### Layer boundaries (critical)

- `IMessagePublisher` port stays LOCAL to each app's `application/ports/` — not in `packages/rabbitmq`
- `InvoiceExchanges` stays in `packages/shared` — application-level contracts used by application layer handlers; moving to `packages/rabbitmq` = application → infrastructure layer violation
- `ConsumerChannels`, `QueueNames`, `ExchangeNames` live in `packages/rabbitmq` — pure infrastructure topology

### Other

- `amqplib` and `@types/amqplib` in `packages/rabbitmq/package.json` — apps do NOT declare them
- `RABBITMQ_URL` env var, defaults to `amqp://localhost`
- RabbitMQ Management UI: `http://localhost:15672` (guest/guest) — port 15672 exposed in docker-compose.yml

### Deleted files (consolidated into packages/rabbitmq)

- `apps/backend/src/shared/infrastructure/messaging/` — entire directory removed
- `apps/worker/src/shared/infrastructure/messaging/rabbitmq.connection.ts` — removed

## Result<T,E> pattern

Located at `apps/backend/src/shared/core/result.ts`.

```ts
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

Repository methods return `Promise<Result<T, InvoicePersistenceError>>`.

## Elysia gotchas

- Use `status(code, body)` from context (NOT `error()`) for error responses in handlers
- `error()` does not exist on the Elysia context object — TypeScript will catch this
- WS: use module-level `Set<SendFn>` + a `Map<object, SendFn>` registry for correct cleanup on close
- `ws.raw` (type `object`) is the stable key for the registry map
- ElysiaJS plugin pattern: each route group is a `new Elysia()` instance, composed with `.use()` in `index.ts`

## Class property overrides

- When extending `Error`, `cause` is defined on the base class in ES2022 — must use `override readonly cause`
- Root `tsconfig.json` likely has `"useUnknownInCatchVariables": true` and strict settings — check before adding `public` fields that shadow builtins

## Conventions

- `#*` alias → `./src/*` in each workspace
- Import order: third-party → `@distributed-systems/*` → `#*` → relative
- Named exports only, `import type` for type-only
- Absolute imports via `#` aliases

## Implementation status

COMPLETE (v2 — RabbitMQ architecture) — all checks pass (typecheck, lint, knip)

## Key implementation decisions (post-plan adjustments)

- Prisma output changed to `src/generated/client` (not `node_modules/.prisma/client`) — Bun does not create the `.prisma/client` symlink inside `@prisma/client`, so TypeScript cannot resolve types via the default mechanism
- `@prisma/client` removed from `packages/database` dependencies — direct import from `./generated/client` path instead
- Barrel files (`packages/shared/src/index.ts`, `packages/database/src/index.ts`) use relative imports, NOT `#*` subpath aliases — TypeScript does not resolve `#*` in cross-package dependencies (it resolves in the context of the consuming tsconfig, not the source package)
- `knip.json` excludes `src/generated/**` from `packages/database` to avoid false positives on Prisma generated files
- ESLint ignores `**/src/generated/**` to avoid linting Prisma generated JS files
- WS manager uses a `Set<SendFn>` (where `SendFn = (data: string) => void`) — decouples from Bun's `ServerWebSocket<T>` generic type parameter issues with `exactOptionalPropertyTypes: true`
- WS routes use a module-level `Map<object, SendFn>` registry to correctly remove send functions on `close`
- `packages/database/.env` added with `DATABASE_URL="file:./dev.db"` so Prisma CLI finds the env var when run from within the package directory

## Running the system

1. `bun run --filter "@distributed-systems/database" db:push` — creates/updates dev.db
2. `bun run --filter "@distributed-systems/backend" dev` — starts ElysiaJS on port 3000
3. `bun run --filter "@distributed-systems/worker" dev` — starts polling worker

# Architecture Reference — distributed-systems monorepo

## Subpath Aliases

Both backend and worker use Node.js subpath imports (`"imports"` in `package.json`),
NOT tsconfig `paths` alone. Both are needed for runtime + type resolution.

**Backend** (`apps/backend/package.json`):

```json
"#invoicing/*": "./src/modules/invoicing/*.ts"
"#shared/*":    "./src/shared/*.ts"
"#test/*":      "./src/test/*.ts"
```

**Worker** (`apps/worker/package.json`):

```json
"#invoicing/*": "./src/modules/invoicing/*.ts"
"#shared/*":    "./src/modules/shared/*.ts"
"#test/*":      "./src/test/*.ts"
```

Note: Worker's `#shared/*` maps to `src/modules/shared/` (NOT `src/shared/`).
Note: tsconfig `paths` mirrors the same mappings (required for `tsc --noEmit`).

## packages/shared

File: `packages/shared/src/index.ts`

Exports:

- `InvoiceStatus` (const object + type union)
- `Invoice` (interface)
- `ApiRoutes` — `/health`, `/invoices`, `/ws`
- `InvoiceExchanges` — `invoices.created`, `invoices.inprogress`, `invoices.completed`, `invoices.failed`
- `InvoiceEvents` — `invoice:inprogress`, `invoice:completed`, `invoice:failed`
- `processFakeInvoice(id: number): Promise<void>` — sleeps 10 s
- `sleep(ms: number): Promise<void>`

Critical: `InvoiceExchanges` lives in `packages/shared` (not `packages/rabbitmq`) because it is
an application-level contract used by application layer handlers. Moving it to the infra package
would be a layer violation.

## packages/database

Provider: **MySQL** (NOT SQLite).
Local dev URL: `mysql://root:root@localhost:3306/invoices` (`packages/database/.env`)
Generated client: `packages/database/src/generated/client` (output in schema.prisma)
Reason for custom output: Bun does not create the `.prisma/client` symlink automatically.

Schema model `Invoice`:

```prisma
model Invoice {
  id        Int      @id @default(autoincrement())
  name      String
  amount    Float
  status    String   @default("pending")   // no enum — mirrored via InvoiceStatus in shared
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Barrel exports from `packages/database/src/index.ts`:

- `prisma` — singleton `PrismaClient` instance
- `PrismaClient` — class (for test injection)
- `toDomainInvoice(raw)` / `toDomainInvoices(raws)` — anti-corruption mappers

Migration: `packages/database/prisma/migrations/20250101000000_init/migration.sql`
Commands (run from monorepo root):

- `bun run db:generate` → `prisma generate`
- `bun run db:push` → `prisma db push` (dev only)
- `bun run db:migrate` → `prisma migrate dev`

## packages/rabbitmq

Exports: `publish`, `subscribe`, `subscribeWork`, `ConsumerChannels`, `ExchangeNames`, `QueueNames`

**Connection model** (two separate connections):

- Publisher: single channel `getPublisherChannel()` — reused for all `publish()` calls
- Consumer: one channel per consumer via `getConsumerChannel(id: string)` → `Map<string, Channel>`
- On connection error: all channels cleared, connection nulled
- Channel error: only that channel's entry removed from map

**`publish(exchange, message)`**: asserts fanout exchange (durable), publishes with `persistent: true`

**`subscribe(exchange, handler)`**: ephemeral exclusive+autoDelete queue — each process instance
receives every message (WS broadcast pattern). Channel ID = exchange name.

**`subscribeWork(exchange, queueName, handler, options?)`**: named durable queue with DLQ:

- Asserts `invoices.dlx` (direct, durable) + `invoices.dead-letter` queue
- Main queue has `x-dead-letter-exchange: invoices.dlx`
- `prefetch` defaults to 1 (competing consumers, one-at-a-time)
- `nack(msg, false, false)` on error → message goes to DLQ

Constants:

- `QueueNames.WORKER_INVOICES_CREATED = "worker.invoices.created"`
- `QueueNames.DEAD_LETTER = "invoices.dead-letter"`
- `ExchangeNames.DEAD_LETTER = "invoices.dlx"`

Env var: `RABBITMQ_URL` (default `amqp://localhost`)
Retry on connect: exponential backoff, 8 attempts, starting 1000 ms, max 10 000 ms.

## apps/backend

Entry: `apps/backend/src/index.ts`
Port: `process.env.PORT ?? 3000` (3099 during integration tests)
Startup: starts 3 RabbitMQ consumers BEFORE accepting HTTP traffic

**Module structure** (all under `src/modules/invoicing/`):

```
application/
  commands/
    create-invoice/
      create-invoice.command.ts   — interface { name, amount }
      create-invoice.handler.ts   — save → publish CREATED → return { id }
    delete-invoice/
      delete-invoice.command.ts   — interface { invoiceId }
      delete-invoice.handler.ts   — repository.deleteById only
      delete-invoice.handler.test.ts  — unit tests with stub repo
    retry-invoice/
      retry-invoice.command.ts    — interface { invoiceId, name, amount }
      retry-invoice.handler.ts    — guard FAILED → update to PENDING → publish CREATED
  queries/
    list-invoices/
      list-invoices.handler.ts    — repository.findAll(), read-only
  ports/
    message-publisher.port.ts     — interface IMessagePublisher { publish(exchange, payload) }

domain/
  errors/invoice.errors.ts        — InvoicePersistenceError (extends Error, kind discriminant)
  repositories/invoice.repository.interface.ts — IInvoiceRepository (5 methods)

infrastructure/
  repositories/
    prisma-invoice.repository.ts  — IInvoiceRepository impl, Result pattern
  messaging/
    invoice-completed.consumer.ts — subscribe(COMPLETED) → broadcast WS
    invoice-failed.consumer.ts    — subscribe(FAILED)    → broadcast WS
    invoice-inprogress.consumer.ts— subscribe(INPROGRESS)→ broadcast WS

presentation/http/
  invoice.routes.ts    — Elysia plugin, prefix /invoices
  ws.routes.ts         — Elysia WS plugin at /ws
```

**IInvoiceRepository** (backend):

```ts
save(data: { name, amount }): Promise<Result<Invoice, InvoicePersistenceError>>
update(invoice: Invoice): Promise<Result<Invoice, InvoicePersistenceError>>
findById(id): Promise<Result<Invoice | null, InvoicePersistenceError>>
findAll(): Promise<Result<Invoice[], InvoicePersistenceError>>
deleteById(id): Promise<Result<void, InvoicePersistenceError>>
```

**HTTP routes** (ElysiaJS):

- `GET  /health` → `{ status: "ok" }`
- `GET  /invoices` → `Invoice[]`
- `POST /invoices` → body `{ name: string, amount: number }` → `201 { id: number }`
- `PATCH /invoices/:id` → body `{ name, amount }` → `200 { id }` | `400` | `404`
- `DELETE /invoices/:id` → `204` | `500`
- `WS  /ws` → broadcast-only (server→client events)

**WS pattern**:

- `wsConnections: Set<SendFn>` — module-level, exported for consumers
- `wsRegistry: Map<object, SendFn>` — maps `ws.raw` to send fn for cleanup on close
- Consumers import `wsConnections` directly and call `send(JSON.stringify({ type, invoiceId }))`

**WS events** (type field):

- `invoice:inprogress`, `invoice:completed`, `invoice:failed`

**Elysia adapter** (thin, local):

```ts
const publisher: IMessagePublisher = { publish }; // publish from @distributed-systems/rabbitmq
```

**Error response**: use `status(code, body)` from Elysia context — NOT `error()`.

## apps/worker

Entry: `apps/worker/src/index.ts`
No HTTP server — pure RabbitMQ consumer.

**Module structure** (under `src/modules/invoicing/`):

```
application/
  commands/
    process-invoice/
      process-invoice.command.ts  — interface { invoiceId }
      process-invoice.handler.ts  — orchestrates full processing pipeline
  ports/
    message-publisher.port.ts     — local IMessagePublisher (same shape, different file)

domain/
  errors/invoice.errors.ts        — InvoiceWorkerPersistenceError
  repositories/invoice.repository.interface.ts — IInvoiceRepository { findById, update }

infrastructure/
  repositories/prisma-invoice.repository.ts — uses findUniqueOrThrow
  messaging/
    invoice-created.consumer.ts   — subscribeWork(CREATED, WORKER_INVOICES_CREATED)
    invoice-publisher.ts          — thin adapter: { publish }

src/modules/shared/core/result.ts — identical Result<T,E> type (local copy)
```

**ProcessInvoiceHandler flow**:

1. `findById(invoiceId)` — throws/nacks to DLQ on error
2. Validate: name present, amount >= 0 — else mark FAILED, publish FAILED, nack to DLQ
3. `update(INPROGRESS)` → `publish(INPROGRESS)` → `processFakeInvoice(id)` (10 s)
4. `update(COMPLETED)` → `publish(COMPLETED)`

**Worker IInvoiceRepository** (narrower than backend):

```ts
findById(id): Promise<Result<Invoice, InvoiceWorkerPersistenceError>>
update(invoice: Invoice): Promise<Result<Invoice, InvoiceWorkerPersistenceError>>
```

## Result<T, E> Pattern

Location: `apps/backend/src/shared/core/result.ts` and `apps/worker/src/modules/shared/core/result.ts`

```ts
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

Repository methods return `Promise<Result<T, Error>>`.
Command handlers propagate results upward; routes map to HTTP status codes.

## Integration Tests

Location: `integration-tests/` (monorepo root workspace)
Runner: `bun test` (bun:test)

**Setup** (`integration-tests/setup.ts`):

- Starts `MySqlContainer("mysql:8.0")` + `RabbitMQContainer("rabbitmq:3-management")` in parallel
- Applies migrations with `Bun.spawnSync(["bun", "x", "prisma", "migrate", "deploy", "--schema", SCHEMA])`
  - cwd = `integration-tests/` (avoids packages/database/.env overriding DATABASE_URL)
  - `env: { ...process.env, DATABASE_URL: containerUrl }`
- Spawns backend: `Bun.spawn(["bun", "run", "src/index.ts"], { cwd: BACKEND, env: {..., PORT: "3099"} })`
- Spawns worker: `Bun.spawn(["bun", "run", "src/index.ts"], { cwd: WORKER, env: {...} })`
- Backend port: **3099** (avoid conflict with docker-compose port 3000)
- Polls `GET /health` until ready (15 s timeout)

**Exported `Stack`**:

```ts
interface Stack {
  baseUrl: string; // http://localhost:3099
  prisma: PrismaClient; // injected with container URL
  teardown: () => Promise<void>;
}
```

**`waitForStatus(baseUrl, invoiceId, expectedStatus, timeoutMs = 20_000)`**:

- Polls `GET /invoices` every 300 ms until invoice reaches expected status

**Test lifecycle**:

- `beforeAll` timeout: 90 000 ms (container + migration + process boot)
- `beforeEach`: `ctx.prisma.invoice.deleteMany()` — clean state
- Individual test timeouts passed as 3rd arg to `it(name, fn, timeoutMs)`

**Covered scenarios**:

1. End-to-end: POST → wait COMPLETED (30 s timeout)
2. Delete: builder.save() → DELETE → verify 204 + list empty (15 s)
3. Retry: builder with FAILED → PATCH → wait COMPLETED (30 s)
4. Guard: PATCH on COMPLETED invoice → 400 (10 s)

**Builder** (`integration-tests/builders/invoice.builder.ts`):

```ts
givenAnInvoice(prisma: PrismaClient)
  .withName("Name")
  .withAmount(100)
  .withStatus(InvoiceStatus.FAILED)
  .save()     // Promise<PersistedInvoice> — writes to DB
  .build()    // InvoiceData — no DB write
```

Defaults: `{ name: "Test Invoice", amount: 250.0, status: "pending" }`

**PrismaClient in tests**: instantiate with container URL:

```ts
new PrismaClient({ datasources: { db: { url: mysql.getConnectionUri() } } });
```

## docker-compose Services

- `rabbitmq` — `rabbitmq:3-management-alpine`, ports 5672 + 15672
- `mysql` — `mysql:8.0`, port 3306, db=invoices, root/root
- `backend` — port 3000, env DATABASE_URL + RABBITMQ_URL
- `worker` — no exposed port
- `adminer` — port 8081 (DB admin UI)
- `frontend` — port 8080

## Conventions

- Named exports only, `import type` for type-only imports
- Import order: third-party → `@distributed-systems/*` → `#*` aliases → relative
- Commit style: conventional commits (commitlint enforced via husky)
- `InvoicePersistenceError` uses `override readonly cause` (ES2022 base class conflict)
- Handler functions (not classes): `createInvoiceHandler(command, deps)` pattern
- Repository is a plain `const` object literal implementing the interface (not a class)

## Running the System

**Local dev** (requires docker-compose for MySQL + RabbitMQ):

```sh
docker compose up -d mysql rabbitmq
bun run db:push                                # schema → dev DB
bun run --filter "@distributed-systems/backend" dev
bun run --filter "@distributed-systems/worker" dev
```

**Integration tests**:

```sh
bun test --filter "@distributed-systems/integration-tests"
# or from integration-tests/:
cd integration-tests && bun test
```

**Typecheck all**:

```sh
bun run typecheck
```

## Known Gotchas

- Prisma generated client is in `src/generated/client/`, not `node_modules/.prisma/client/` — Bun doesn't create the symlink
- Worker's `#shared/*` alias points to `src/modules/shared/` (different from backend's `src/shared/`)
- `packages/database/src/index.ts` uses relative imports for barrel (not `#*` aliases) because `#` resolves in the consuming tsconfig context, not the source package
- `knip.json` excludes `src/generated/**` in packages/database to avoid false positives
- ESLint ignores `**/src/generated/**`
- Integration tests spawn backend + worker as subprocesses — never import `src/index.ts` directly (top-level awaits break the test process)
- `processFakeInvoice` sleeps 10 s → tests need 30 s timeout for end-to-end completion
- Elysia: use `status(code, body)` from context, NOT `error()` — `error()` does not exist
- `packages/rabbitmq/.env` has docker-compose URL: `amqp://guest:guest@rabbitmq:5672` — override with `RABBITMQ_URL=amqp://localhost` for local dev without compose

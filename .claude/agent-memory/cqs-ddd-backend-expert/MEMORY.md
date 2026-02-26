# CQS/DDD Backend Expert — Project Memory

## Project: distributed-systems monorepo

Root: `/Users/fran/Workspace/distributed-systems`
Package manager: bun@1.3.6 workspaces (`apps/*`, `packages/*`, `integration-tests`)
All commands: bun (never npm/npx)
Full architecture details: see `architecture.md`

## Domain

**Bounded contexts**: Invoicing (Invoice aggregate), Users (login-user command added)
**User auth**: JWT in HttpOnly cookie "session"; secret from env JWT_SECRET
**Bounded context**: Invoicing | **Aggregate root**: `Invoice`
**Status values**: `pending | inprogress | completed | failed` (`InvoiceStatus` in `@distributed-systems/shared`)
**Domain model is the API contract** — no separate DTOs.
**Key rule**: only `FAILED` invoices can be retried (guard in `retryInvoiceHandler`).

## Subpath Aliases

Backend `#invoicing/*` → `src/modules/invoicing/*.ts`, `#shared/*` → `src/shared/*.ts`
Worker `#invoicing/*` → `src/modules/invoicing/*.ts`, `#shared/*` → `src/modules/shared/*.ts`
Both defined in each app's `package.json` imports AND tsconfig paths.

## Database

Provider: **MySQL** (NOT SQLite). Dev: `mysql://root:root@localhost:3306/invoices`
Generated client: `packages/database/src/generated/client` (custom output — Bun doesn't create symlink)
Barrel: `prisma`, `PrismaClient`, `toDomainInvoice`, `toDomainInvoices` from `@distributed-systems/database`
Migrations: `packages/database/prisma/migrations/20250101000000_init/migration.sql`
Note: `packages/database/.env` has local dev URL; integration tests override with container URL.

## RabbitMQ

Package: `@distributed-systems/rabbitmq`

- `publish(exchange, msg)` — fanout, durable, persistent
- `subscribe(exchange, handler)` — exclusive+autoDelete queue (WS broadcast: every process gets all msgs)
- `subscribeWork(exchange, queueName, handler)` — durable named queue + DLQ, prefetch=1 (competing consumers)
- `InvoiceExchanges` stays in `@distributed-systems/shared` (application contract, not infra)
- `IMessagePublisher` port is LOCAL to each app's `application/ports/` (bounded context autonomy)
- Two separate connections: publisher + consumer (failure isolation)
- Retry on connect: exponential backoff, 8 attempts, starting 1000 ms, max 10 000 ms

## Backend Structure

`src/modules/invoicing/application/commands/`: create-invoice, delete-invoice, retry-invoice
`src/modules/invoicing/application/queries/`: list-invoices
`src/modules/invoicing/infrastructure/messaging/`: 3 consumers (completed, failed, inprogress) → WS broadcast
`src/modules/invoicing/presentation/http/`: invoice.routes.ts + ws.routes.ts
`src/modules/users/application/commands/`: register-user, login-user
`src/modules/users/presentation/http/`: user.routes.ts, auth.routes.ts
`src/shared/plugins/`: auth.plugin.ts (JWT guard — use on protected routes)
WS: `wsConnections: Set<SendFn>` exported from ws.routes.ts, imported by consumers directly.
Routes: GET /health, GET /invoices*, POST /invoices* → 201 {id}, PATCH /invoices/:id*, DELETE /invoices/:id* → 204
POST /register, POST /login, POST /logout, GET /me (\* = requires auth cookie)
Auth guard: `.use(authPlugin({ jwtSecret }))` — injects `currentUser: {userId, email}` via resolve({ as: "scoped" })

## Worker Structure

`src/index.ts` → `startInvoiceCreatedConsumer()` (no HTTP server)
`subscribeWork(CREATED, "worker.invoices.created")` → `processInvoiceHandler`
Flow: findById → validate → INPROGRESS+publish → processFakeInvoice (10s) → COMPLETED+publish
On failure: mark FAILED in DB, publish FAILED exchange, nack → DLQ
Worker `#shared/*` maps to `src/modules/shared/` (has its own local Result<T,E> copy)

## Result Pattern

`Result<T,E> = { ok: true; value: T } | { ok: false; error: E }` + `ok()` / `err()` constructors
Backend: `apps/backend/src/shared/core/result.ts`
Worker: `apps/worker/src/modules/shared/core/result.ts`

## Integration Tests

Location: `tests/integration/` (monorepo root, NOT `integration-tests/`)
Setup: MySqlContainer + RabbitMQContainer → migrate → spawn backend (port 3099) + worker as subprocesses
Migrations: `Bun.spawnSync(["bun", "run", "--cwd", "packages/database", "prisma", "migrate", "deploy", ...], ...)`
Builder: `givenAnInvoice(prisma).withName().withAmount().withStatus().save()`
Auth helper: `loginAs(baseUrl, email, password): Promise<string>` → returns "session=<token>" cookie string
Timeouts: beforeAll=90s, end-to-end tests=30s (processFakeInvoice takes 10s)
Clean state: `ctx.prisma.invoice.deleteMany()` + `ctx.prisma.user.deleteMany()` in beforeEach (invoice tests)
PrismaClient: `new PrismaClient({ datasources: { db: { url: mysql.getConnectionUri() } } })`
Backend port 3099 during tests (avoids conflict with docker-compose port 3000)
waitForStatus: now accepts optional `sessionCookie` param (required since /invoices is protected)

## Elysia Gotchas

- Use `status(code, body)` from context — NOT `error()` (doesn't exist on Elysia context)
- Handler functions (not classes): `createInvoiceHandler(command, deps)` with injected deps
- WS: `wsConnections: Set<SendFn>` + `wsRegistry: Map<object, SendFn>` (ws.raw as key for cleanup)
- `InvoicePersistenceError`: use `override readonly cause` (ES2022 base class conflict)
- Barrel files in packages use relative imports (NOT `#*`) — `#*` resolves in consuming tsconfig context
- Cookie access in generic context: use `cookie["key"]` (Record<string, Cookie<unknown>>) — NOT destructure
- `noUncheckedIndexedAccess: true` → `cookie["key"]` may be undefined; use `?.value` + typeof guard
- TS2742 portability error with jwt/jose: add `"declaration": false` to app tsconfig (apps don't publish types)
- JWT plugin: `jwt({ name: "jwt", secret, exp: "7d" })` — use `.resolve({ as: "scoped" })` for auth guard

## Running the System

```sh
docker compose up -d mysql rabbitmq
bun run db:push                                     # apply schema to dev DB
bun run --filter "@distributed-systems/backend" dev
bun run --filter "@distributed-systems/worker" dev
bun test --filter "@distributed-systems/integration-tests"
```

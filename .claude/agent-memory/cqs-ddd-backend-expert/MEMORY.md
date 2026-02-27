# CQS/DDD Backend Expert — Project Memory

## Project: distributed-systems monorepo

Root: `/Users/fran/Workspace/distributed-systems`
Package manager: bun@1.3.6 workspaces (`apps/*`, `packages/*`, `integration-tests`)
All commands: bun (never npm/npx)
Full architecture details: see `architecture.md`

## Domain

**Bounded contexts**: Invoicing (Invoice aggregate), Users (login-user command added)
**User auth**: JWT in HttpOnly cookie "session"; secret from env JWT_SECRET
**Status values**: `pending | inprogress | completed | failed` (`InvoiceStatus` in `@distributed-systems/shared`)
**Key rule**: only `FAILED` invoices can be retried (guard in `retryInvoiceHandler`).
**Ownership**: Invoice.userId NOT NULL — every invoice must have an owner.
**Ownership enforcement**: DELETE uses compound WHERE `{ id: id.value, userId: userId.value }` — atomic. PATCH (retry) uses `Guid.equals()` before status guard, returns `forbidden`. Routes map `not_found` → 404, `forbidden` → 403.

## Domain Entities (Classes, NOT interfaces)

`BackendInvoice` and `BackendUser` are **classes** with private constructor + static `create()` factory + getters.

- `BackendInvoice.create({ id: Guid, userId: Guid, name, amount, status })` — used for creation AND reconstitution
- `BackendUser.create({ id: Guid, name, email, passwordHash })` — used for creation AND reconstitution
- Object spread (`{ ...entity }`) does NOT work — always build a new instance explicitly with `Entity.create()`
- Getters: `.id`, `.userId`, `.name`, `.amount`, `.status`, `.email`, `.passwordHash`

## Entity Creation Flow (Handler → Repository)

1. Handler calls `Guid.create()` to generate a new UUID
2. Handler calls `Entity.create({ id, ...fields })` to build the entity
3. Handler calls `repository.save(entity)` — receives `Result<void, Error>`
4. Handler reads `entity.id.value` to return the id in the response
5. Repository writes `entity.id.value` (string) to DB directly — no DB-generated IDs

## Repository Contracts

`IInvoiceRepository.save(invoice: BackendInvoice)` → `Result<void, InvoicePersistenceError>`
`IInvoiceRepository.update(invoice: BackendInvoice)` → `Result<void, InvoicePersistenceError>`
`IInvoiceRepository.findById(id: Guid)` → `Result<BackendInvoice | null, ...>`
`IInvoiceRepository.findAll(userId: Guid)` → `Result<BackendInvoice[], ...>`
`IInvoiceRepository.deleteById({ invoiceId: Guid, userId: Guid })` → `Result<void, ...>`
`IUserRepository.save(user: BackendUser)` → `Result<void, DuplicateEmailError | UserPersistenceError>`
`IUserRepository.findByEmail(email)` → `BackendUser | null`

## Mapper Architecture (2 mappers per entity)

**Infrastructure mappers** (Prisma → Domain entity):

- `apps/backend/src/modules/invoicing/infrastructure/mappers/invoice.mapper.ts` → `toBackendInvoice(raw: PrismaInvoice): BackendInvoice`
- `apps/backend/src/modules/users/infrastructure/mappers/user.mapper.ts` → `toBackendUser(raw: PrismaUser): BackendUser`
- Uses `Guid.fromString()` — existing DB id, not new

**Presentation mappers** (Domain entity → DTO for HTTP):

- `apps/backend/src/modules/invoicing/presentation/http/invoice.mapper.ts` → `toInvoiceDTO(invoice: BackendInvoice): InvoiceDTO`
- `apps/backend/src/modules/users/presentation/http/user.mapper.ts` → `toUserDTO(user: BackendUser): UserDTO`
- Explicit `entity.id.value` — no implicit `toString()`; NEVER includes passwordHash

**Routes use presentation mappers explicitly**: `result.value.map(toInvoiceDTO)` in GET /invoices.

## ID Strategy (UUID)

All IDs are **UUID strings** (`String @id @default(uuid())` in Prisma).
`packages/shared` exports `Guid` VO + `InvoiceDTO`/`UserDTO` (string ids, no passwordHash in DTO).
Backend domain uses `Guid` for typed IDs; application layer converts `string→Guid` via `Guid.fromString()`.
Worker uses plain `string` ids — no Guid wrapper needed.

## Domain Types Locations

| Type             | File                                                         | Notes                       |
| ---------------- | ------------------------------------------------------------ | --------------------------- |
| `UserDTO`        | `packages/shared/src/index.ts`                               | id: string, no passwordHash |
| `InvoiceDTO`     | `packages/shared/src/index.ts`                               | id: string, userId: string  |
| `Guid`           | `packages/shared/src/value-objects/guid.ts`                  | UUID wrapper VO             |
| `BackendUser`    | `apps/backend/src/modules/users/domain/user.ts`              | class, private constructor  |
| `BackendInvoice` | `apps/backend/src/modules/invoicing/domain/invoice.ts`       | class, private constructor  |
| `WorkerUser`     | `apps/worker/src/modules/invoicing/domain/worker-user.ts`    | interface, id: string       |
| `WorkerInvoice`  | `apps/worker/src/modules/invoicing/domain/worker-invoice.ts` | interface, id: string       |

## Database Package (`packages/database`)

Barrel exports: `prisma`, `PrismaClient`, `Invoice`, `User` (Prisma model types), `toInvoiceDTO`, `toInvoiceDTOs`, `toPrismaUserFields`, `toUserDTO`
`Invoice` and `User` re-exported so bounded-context mappers can type Prisma rows without reaching into generated client internals.
`toPrismaUserFields` and `toInvoiceDTO` still used by integration test builders — do NOT remove.
After schema changes, always regenerate client: `bun run --filter "@distributed-systems/database" db:generate`

## Subpath Aliases

Backend `#invoicing/*` → `src/modules/invoicing/*.ts`, `#shared/*` → `src/shared/*.ts`, `#users/*` → `src/modules/users/*.ts`
Worker `#invoicing/*` → `src/modules/invoicing/*.ts`, `#shared/*` → `src/modules/shared/*.ts`
Both defined in each app's `package.json` imports AND tsconfig paths.

## Database

Provider: **MySQL** (NOT SQLite). Dev: `mysql://root:root@localhost:3306/invoices`
Schema: `String @id @default(uuid())` for both User and Invoice (also userId in Invoice is String).
Generated client: `packages/database/src/generated/client`
Migrations: latest is `20260227000000_uuid_ids`

## RabbitMQ

Message payloads: `{ invoiceId: string, userId: string }` — plain UUID strings.
`publish(exchange, msg)` / `subscribe(exchange, handler)` / `subscribeWork(exchange, queueName, handler)`
Two separate connections; `InvoiceExchanges` in shared; `IMessagePublisher` port local to each app.

## Backend Structure

Commands: create-invoice, delete-invoice, retry-invoice (string IDs in commands, Guid inside handlers)
Queries: list-invoices (string userId arg, Guid.fromString inside handler)
Consumers (3): completed/failed/inprogress → WS broadcast; payloads use string IDs
WS: `wsConnections: Map<string, Set<SendFn>>` (key = userId UUID string)
Auth guard: `currentUser: { userId: string; email: string }` — string UUID

## Worker Structure

`subscribeWork(CREATED, "worker.invoices.created")` → `processInvoiceHandler`
Uses `WorkerUser`/`WorkerInvoice` — plain string ids throughout (interfaces, not classes)
Prisma user repo uses `select: { id, name, email }` — never fetches password

## Result Pattern

`Result<T,E> = { ok: true; value: T } | { ok: false; error: E }` + `ok()` / `err()`
Backend: `apps/backend/src/shared/core/result.ts`
Worker: `apps/worker/src/modules/shared/core/result.ts`

## Integration Tests

Location: `tests/integration/` (monorepo root)
`givenAnInvoice(prisma).forUser(userId: string).save()` → `InvoiceDTO`
`givenAUser(prisma).save()` → `PersistedUser { id: string, ... }`
`loginAs(url, email, pw)` → `{ cookie, userId: string }`
`waitForStatus(..., invoiceId: string, ...)`
Backend port 3099 during tests

## Elysia Gotchas

- `status(code, body)` from context — NOT `error()`
- `InvoicePersistenceError`: use `override readonly cause`
- Barrel files use relative imports (NOT `#*`)
- `cookie["key"]?.value` + typeof guard (`noUncheckedIndexedAccess: true`)
- `"declaration": false` in app tsconfig to fix TS2742
- JWT: `jwt({ name: "jwt", secret, exp: "7d" })` + `.resolve({ as: "scoped" })`

## Running the System

```sh
docker compose up -d mysql rabbitmq
bun run db:push
bun run --filter "@distributed-systems/backend" dev
bun run --filter "@distributed-systems/worker" dev
bun test --filter "@distributed-systems/integration-tests"
```

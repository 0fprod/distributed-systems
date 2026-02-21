# Implementation Plan — Backend + Worker

## Architectural decision: Where does Prisma live?

**Choice: Option C — `packages/database`**

Rationale:

- Backend and worker both need the Prisma client → shared package avoids duplication
- Keeps `packages/shared` as pure domain types (no infrastructure deps)
- `packages/database` owns: schema, generated client, mappers
- Domain model stays in `packages/shared` — zero Prisma dependency there
- Frontend never imports `packages/database` (only `packages/shared`)

Dependency graph:

```
packages/shared     ← domain types (Invoice, InvoiceStatus, sleep, processFakeInvoice)
packages/database   ← prisma client + mappers (depends on @distributed-systems/shared)
apps/backend        ← depends on shared + database
apps/worker         ← depends on shared + database
apps/frontend       ← depends on shared only
```

---

## Step 1 — `packages/shared/src/utils.ts`

Add to shared (no new deps needed):

```ts
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const processFakeInvoice = async (invoiceId: number): Promise<void> => {
  await sleep(3000);
  console.log(`[worker] Invoice ${invoiceId} processed`);
};
```

Re-export from `packages/shared/src/index.ts`.

---

## Step 2 — `packages/database`

### Install (via monorepo-manager agent)

- `prisma` + `@prisma/client` as deps of `packages/database`

### Files

```
packages/database/
  package.json         name: @distributed-systems/database
  tsconfig.json        extends ../../tsconfig.json, types: ["bun"]
  prisma/
    schema.prisma      datasource sqlite, generator client, Invoice model
  src/
    client.ts          singleton PrismaClient export
    invoice/
      invoice.mapper.ts  PrismaInvoice → Invoice (domain)
    index.ts           barrel: export { prisma } from client, { toInvoice } from mapper
```

### `prisma/schema.prisma`

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:../../dev.db"
}

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/client"
}

model Invoice {
  id        Int      @id @default(autoincrement())
  name      String
  amount    Float
  status    String   @default("inprogress")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### `src/client.ts`

```ts
import { PrismaClient } from "#generated/client";

export const prisma = new PrismaClient();
```

### `src/invoice/invoice.mapper.ts`

```ts
import type { Invoice } from "@distributed-systems/shared";

import type { Invoice as PrismaInvoice } from "#generated/client";

export const toInvoice = (p: PrismaInvoice): Invoice => ({
  id: p.id,
  name: p.name,
  amount: p.amount,
  status: p.status as Invoice["status"],
});
```

### package.json scripts

```json
"scripts": {
  "db:generate": "prisma generate",
  "db:push": "prisma db push",
  "db:studio": "prisma studio",
  "build": "bun run db:generate",
  "typecheck": "tsc --noEmit"
}
```

---

## Step 3 — `apps/backend`

### Install (via monorepo-manager)

- `elysia` as dependency
- `@distributed-systems/database` as workspace dep

### File structure

```
apps/backend/src/
  index.ts                             ← Elysia app, mounts all routes
  shared/
    infrastructure/
      ws/
        ws.manager.ts                  ← tracks WS clients, broadcast fn
  modules/
    invoicing/
      domain/
        repositories/
          invoice.repository.interface.ts  ← IInvoiceRepository
      application/
        commands/
          create-invoice/
            create-invoice.command.ts
            create-invoice.handler.ts
        queries/
          list-invoices/
            list-invoices.query.ts
            list-invoices.handler.ts
        ports/
          invoice.repository.port.ts   ← re-export of interface
      infrastructure/
        database/
          prisma-invoice.repository.ts ← implements IInvoiceRepository using prisma
      presentation/
        http/
          invoice.routes.ts            ← GET /invoices, POST /invoices
          internal.routes.ts           ← POST /internal/invoice-completed (called by worker)
          ws.routes.ts                 ← WS /ws
```

### Endpoints

- `POST /invoices` body: `{ name: string, amount: number }` → CreateInvoiceHandler → returns `{ id }`
- `GET /invoices` → ListInvoicesHandler → returns `Invoice[]`
- `POST /internal/invoice-completed` body: `{ invoiceId: number }` → broadcasts WS event
- `WS /ws` → clients subscribe for real-time updates

### WS message format

```json
{ "type": "invoice:completed", "invoiceId": 42 }
```

### `index.ts` entry

```ts
import { Elysia } from "elysia";

const app = new Elysia().use(invoiceRoutes).use(wsRoutes).use(internalRoutes).listen(3000);
console.log("Backend running on http://localhost:3000");
```

---

## Step 4 — `apps/worker`

### Install (via monorepo-manager)

- `@distributed-systems/database` as workspace dep

### File structure

```
apps/worker/src/
  index.ts                              ← starts polling loop
  modules/
    invoicing/
      application/
        commands/
          process-invoice/
            process-invoice.command.ts
            process-invoice.handler.ts  ← calls processFakeInvoice, updates DB, notifies backend
      presentation/
        consumers/
          invoice.poller.ts             ← polls DB every 5s for inprogress invoices
```

### Worker flow

1. `invoice.poller.ts` runs `setInterval` every 5000ms
2. Queries DB for invoices with `status = "inprogress"`
3. For each: calls `ProcessInvoiceHandler`
4. Handler: calls `processFakeInvoice(id)` (3s delay), updates DB to `"completed"`, POSTs to `http://localhost:3000/internal/invoice-completed`

---

## Step 5 — verification

```bash
bun run typecheck
bun run lint
bun run knip
```

---

## Notes

- `knip.json` needs update for `packages/database` entry: `src/index.ts`
- `packages/database` must be added to root `package.json` workspaces (already covered by `packages/*`)
- Run `bun run --filter '@distributed-systems/database' db:push` before starting backend/worker
- The generated Prisma client goes to `src/generated/client` inside `packages/database`
- `#generated/client` resolves via `"imports": { "#*": "./src/*" }` in `packages/database/package.json`

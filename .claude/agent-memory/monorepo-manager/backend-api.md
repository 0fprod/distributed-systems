# Backend API — HTTP Endpoints

Project: `/Users/fran/Workspace/distributed-systems`
Last updated: 2026-03-01

Entry point: `apps/backend/src/index.ts`
Framework: **ElysiaJS** (Bun runtime, port 3000)
Auth: **JWT in HttpOnly cookie** (`session`), verified by `authPlugin` (`apps/backend/src/shared/plugins/auth.plugin.ts`)

---

## Route registration order (index.ts)

```
requestIdPlugin   → injects requestId into every handler context
healthRoutes()    → GET /health (public)
authRoutes()      → POST /login, POST /logout (public)
userRoutes()      → POST /register (public) + GET /me (protected)
invoiceRoutes()   → all /invoices routes (protected)
wsRoutes()        → WS /ws (protected)
```

---

## Endpoint reference

### Health

| Method | Path      | Auth | Request body | Success response                          | Error responses                  |
| ------ | --------- | ---- | ------------ | ----------------------------------------- | -------------------------------- |
| GET    | `/health` | none | —            | `200 { status, db, rabbitmq }` (all "ok") | `503 { status:"degraded", ... }` |

Checks: `prisma.$queryRaw SELECT 1` + `isRabbitMQHealthy()` in parallel.

---

### Users — auth routes (`authRoutes`)

| Method | Path      | Auth | Request body                          | Success response                                                                    | Error responses                                                 |
| ------ | --------- | ---- | ------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| POST   | `/login`  | none | `{ email: string, password: string }` | `200 { message: "Logged in" }` + sets `session` cookie (HttpOnly, SameSite=lax, 7d) | `401 { message }` invalid credentials · `500` persistence error |
| POST   | `/logout` | none | —                                     | `200 { message: "Logged out" }` + removes `session` cookie                          | —                                                               |

JWT payload signed into cookie: `{ userId: string (UUID), email: string }`, exp 7d.

---

### Users — user routes (`userRoutes`)

| Method | Path        | Auth       | Request body                                                        | Success response                    | Error responses                                                             |
| ------ | ----------- | ---------- | ------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| POST   | `/register` | none       | `{ name: string (min 1), email: string, password: string (min 6) }` | `201 { id: string (UUID) }`         | `400 { message }` weak_password / duplicate_email · `500` persistence error |
| GET    | `/me`       | JWT cookie | —                                                                   | `200 { id: string, email: string }` | `401 { message: "Unauthorized" }`                                           |

---

### Invoices (`invoiceRoutes` — all protected by JWT cookie)

Prefix: `/invoices`

| Method | Path                | Request body                                        | Success response           | Error responses                                                                    |
| ------ | ------------------- | --------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------- |
| GET    | `/invoices`         | —                                                   | `200 InvoiceDTO[]`         | `500 { message }`                                                                  |
| POST   | `/invoices`         | `{ name: string (min 1), amount: number (≥ 0) }`    | `201 InvoiceDTO`           | `500 { message }`                                                                  |
| POST   | `/invoices/invalid` | — (no body; hardcodes invalid data for DLQ testing) | `201 InvoiceDTO`           | `500 { message }`                                                                  |
| PATCH  | `/invoices/:id`     | `{ name: string (min 1), amount: number (≥ 0) }`    | `200 InvoiceDTO` (retried) | `400` invalid_status · `403` forbidden · `404` not_found · `500` persistence_error |
| DELETE | `/invoices/:id`     | —                                                   | `204 null`                 | `404` not_found · `500` persistence_error                                          |

`InvoiceDTO`:

```ts
{
  id: string;
  userId: string;
  name: string;
  amount: number;
  status: InvoiceStatus;
}
// InvoiceStatus: "pending" | "inprogress" | "completed" | "failed"
```

PATCH re-publishes the invoice to `invoices.created` exchange (retry path). Only FAILED invoices can be retried — other statuses return 400 invalid_status.

`/invoices/invalid` is a testing utility that bypasses body validation and submits an invoice with `name: ""` and `amount: -1`, which the worker rejects and routes to the DLQ.

---

### WebSocket (`wsRoutes` — protected by JWT cookie)

| Protocol | Path  | Auth       | Description                                                                             |
| -------- | ----- | ---------- | --------------------------------------------------------------------------------------- |
| WS       | `/ws` | JWT cookie | Per-user push channel; backend fans events from RabbitMQ consumers to connected sockets |

Server-push events (JSON string):

- `invoice:inprogress` — worker started processing
- `invoice:completed` — worker finished successfully
- `invoice:failed` — worker failed / DLQ

Client→server messages are ignored. Multiple tabs per user are supported (Map<userId, Set<SendFn>>).

---

## Module architecture comparison

### `invoicing` module

- Commands: `create-invoice`, `delete-invoice`, `retry-invoice`
- Queries: `list-invoices`
- Infrastructure: Prisma repository + 3 RabbitMQ consumers (inprogress, completed, failed)
- Presentation: `invoice.routes.ts` (REST), `ws.routes.ts` (WebSocket)

### `users` module

- Commands: `register-user`, `login-user`
- No queries (profile fetched from JWT context — no DB round-trip on GET /me)
- Infrastructure: Prisma user repository only (no messaging)
- Presentation: `auth.routes.ts` (login/logout), `user.routes.ts` (register/me)
- Domain value objects: `password.vo.ts` (hashing + strength validation)

Key difference: `users` has no RabbitMQ involvement. Authentication is session-based (HttpOnly cookie + JWT). The `GET /me` endpoint reads `currentUser` from the JWT context injected by `authPlugin` — no database query needed.

---

## Shared plugins

### `authPlugin` (`apps/backend/src/shared/plugins/auth.plugin.ts`)

Elysia scoped plugin. Reads `session` cookie, verifies JWT, injects `currentUser: { userId: string, email: string }` into handler context. Returns 401 if cookie absent or JWT invalid/expired.

### `requestIdPlugin` (`apps/backend/src/shared/plugins/request-id.plugin.ts`)

Injects `requestId` into handler context. Returned to client via `x-request-id` response header.

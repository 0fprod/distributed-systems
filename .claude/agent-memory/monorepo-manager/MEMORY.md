# Monorepo Manager — Project Memory

Last updated: 2026-03-01 (OTel integration)

Root: `/Users/fran/Workspace/distributed-systems`

---

## Package Manager

**Bun 1.3.6** — never npm, npx, pnpm, or yarn.
All commands use `bun` / `bunx`.
`"packageManager": "bun@1.3.6"` is set in root `package.json`.

---

## Workspace Layout

```
distributed-systems/
├── package.json          # root — workspaces, devDeps, scripts
├── bun.lock
├── tsconfig.json
├── knip.json
├── docker-compose.yml
├── .env                  # DATABASE_URL only (MySQL, localhost)
├── apps/
│   ├── backend/          # @distributed-systems/backend  — Elysia HTTP + WS server
│   ├── worker/           # @distributed-systems/worker   — RabbitMQ consumer, no HTTP
│   └── frontend/         # @distributed-systems/frontend — React + Vite + Tailwind
├── packages/
│   ├── database/         # @distributed-systems/database — Prisma client + mappers
│   ├── logger/           # @distributed-systems/logger   — structured logger + OTel trace context
│   ├── otel/             # @distributed-systems/otel     — OTel SDK init for non-HTTP services
│   ├── rabbitmq/         # @distributed-systems/rabbitmq — amqplib wrappers + OTel propagation
│   └── shared/           # @distributed-systems/shared   — domain types, enums, routes
└── tests/
    └── integration/      # @distributed-systems/integration-tests — testcontainers suites
```

Root `package.json` workspaces field:

```json
"workspaces": ["apps/*", "packages/*", "tests/integration"]
```

`tests/integration` is listed as a bare path (not a glob) because it is a single directory nested under `tests/`, not under a common workspace parent.

---

## Dependency Graph (workspace packages)

```
@distributed-systems/shared       (no workspace deps)
@distributed-systems/otel         (no workspace deps)
@distributed-systems/logger       (no workspace deps — uses @opentelemetry/api directly)
@distributed-systems/rabbitmq     (no workspace deps — uses @opentelemetry/api directly)
@distributed-systems/database  -> @distributed-systems/shared
@distributed-systems/backend   -> @distributed-systems/database
                               -> @distributed-systems/rabbitmq
                               -> @distributed-systems/shared
@distributed-systems/worker    -> @distributed-systems/database
                               -> @distributed-systems/otel
                               -> @distributed-systems/rabbitmq
                               -> @distributed-systems/shared
@distributed-systems/frontend  -> @distributed-systems/shared
@distributed-systems/integration-tests -> @distributed-systems/database
                                       -> @distributed-systems/shared
```

---

## Root package.json Scripts

```json
"dev":          "bun run --filter '*' dev"
"build":        "bun run --filter '*' build"
"typecheck":    "bun run --filter '*' typecheck"
"lint":         "eslint ."
"lint:fix":     "eslint . --fix"
"format":       "prettier --write ."
"format:check": "prettier --check ."
"knip":         "knip"
"test":         "bun run --filter '*' test"
"db:generate":  "bun run --filter '@distributed-systems/database' db:generate"
"db:push":      "bun run --filter '@distributed-systems/database' db:push"
"db:migrate":   "bun run --cwd packages/database db:migrate"
"db:setup":     "bun run db:generate && bun run db:push"
"prepare":      "husky"
```

---

## Subpath Imports (`"imports"` in package.json)

**CRITICAL:** Wildcard values in `"imports"` include the `.ts` extension. This is required because Bun's test runner resolves TypeScript source files directly. Omitting `.ts` causes Bun to fail to resolve the module.

### apps/backend

```json
"imports": {
  "#invoicing/*": "./src/modules/invoicing/*.ts",
  "#shared/*":    "./src/shared/*.ts",
  "#test/*":      "./src/test/*.ts"
}
```

### apps/worker

```json
"imports": {
  "#invoicing/*": "./src/modules/invoicing/*.ts",
  "#shared/*":    "./src/modules/shared/*.ts",
  "#test/*":      "./src/test/*.ts"
}
```

Note: Worker's `#shared/*` maps to `./src/modules/shared/*.ts` (inside `modules/`), whereas backend's maps to `./src/shared/*.ts` (top-level `shared/`). Do not cross-apply.

### apps/frontend

```json
"imports": {
  "#features/*": "./src/features/*",
  "#pages/*":    "./src/pages/*",
  "#shared/*":   "./src/shared/*.ts",
  "#test/*":     "./src/test/*.ts",
  "#app":        "./src/app.tsx"
}
```

Note: `#features/*` and `#pages/*` do NOT have `.ts` suffix because they contain `.tsx` files.

### packages/database and packages/shared

```json
"imports": { "#*": "./src/*" }
```

---

## Database Package (`@distributed-systems/database`)

- Provider: **MySQL** (was SQLite in earlier versions — never revert)
- Schema: `packages/database/prisma/schema.prisma`
- Generated client output: `packages/database/src/generated/client`
  - Custom output required because **Bun does not create the `@prisma/client` symlink**. Without this, the generated types are unreachable.
- `DATABASE_URL` dev: `mysql://root:root@localhost:3306/invoices`

After any schema change, run: `bun run db:generate`

### Database Package Scripts

```json
"db:generate":          "prisma generate"
"db:push":              "prisma db push"
"db:migrate":           "prisma migrate dev"
"predb:migrate:deploy": "prisma generate"
"db:migrate:deploy":    "prisma migrate deploy"
```

`predb:migrate:deploy` runs `prisma generate` automatically — important for Docker where the generated client may not exist yet.

---

## Environment Variables

### Root `.env`

```
DATABASE_URL="mysql://root:root@localhost:3306/invoices"
```

Bun auto-loads the root `.env`. Must always be MySQL format — if it were SQLite (`file:...`), Prisma client validation fails at runtime.

### Per-Package .env Files

| File                     | Contents                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `packages/database/.env` | `DATABASE_URL="mysql://root:root@localhost:3306/invoices"`                                    |
| `apps/backend/.env`      | `PORT=3000`, `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`, `OTEL_SERVICE_NAME=backend` |
| `apps/worker/.env`       | `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`, `OTEL_SERVICE_NAME=worker`               |
| `packages/rabbitmq/.env` | `RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672`                                               |

---

## Integration Tests (`@distributed-systems/integration-tests`)

### Location

`/Users/fran/Workspace/distributed-systems/tests/integration/`

### Files

```
tests/integration/
  package.json
  setup.ts          # startStack(), waitForStatus() exports
  preload.ts
  tests/
    invoice.integration.test.ts
    user-registration.integration.test.ts
```

### Dependencies

```json
"dependencies": {
  "@distributed-systems/database": "workspace:*",
  "@distributed-systems/shared":   "workspace:*"
},
"devDependencies": {
  "@testcontainers/mysql":    "^10.0.0",
  "@testcontainers/rabbitmq": "^10.0.0",
  "testcontainers":           "^10.0.0",
  "dotenv":                   "^17.3.1"
}
```

### How Integration Tests Work

1. `MySqlContainer("mysql:8.0")` named `integration-mysql` with database `invoices_test`
2. `RabbitMQContainer("rabbitmq:3-management")` named `integration-rabbitmq`
3. `prisma migrate deploy` via `Bun.spawnSync` with `cwd: import.meta.dir` (no `.env` in `tests/integration/`)
4. Backend spawned via `Bun.spawn` on port **3099** (not 3000 — avoids docker-compose conflict)
5. Worker spawned via `Bun.spawn`
6. `PrismaClient` instance pointing at the testcontainer URL for DB assertions
7. Poll `GET /health` until backend ready (15s timeout)

### Port Strategy

Backend uses **3099** during integration tests. Docker Compose uses 3000. Running both simultaneously would cause Docker Compose backend to fail to bind, triggering `restart: on-failure` loop.

### Prisma Migration cwd Gotcha

`cwd: import.meta.dir` (`tests/integration/`) has no `.env`, so Prisma does NOT load `packages/database/.env` and override `DATABASE_URL` back to `mysql:3306` (the Docker hostname). Without this, migrations would target the wrong host.

### Named Containers Gotcha

`withName("integration-mysql")` — if a test run is killed abruptly and Ryuk doesn't clean up, the next run fails with "container name already in use". Fix: `docker rm -f integration-mysql integration-rabbitmq`.

### Builder API

```ts
givenAnInvoice(prisma).withName("...").withAmount(123).withStatus(InvoiceStatus.FAILED).save(); // returns Promise<PersistedInvoice>
```

### Running Integration Tests

```sh
# from tests/integration/ directory (or via root --filter):
bun test --preload ./preload.ts ./tests
```

---

## Docker Compose

Services: `rabbitmq`, `mysql`, `backend` (port 3000), `worker`, `adminer` (port 8081), `frontend` (port 8080), `jaeger` (UI 16686, OTLP HTTP 4318).

Backend and worker have `restart: on-failure`. If MySQL isn't running, they loop-restart — visible in Docker Desktop. Run `docker compose down` to stop cleanly.

---

## OpenTelemetry

Full details: [`otel.md`](.claude/agent-memory/monorepo-manager/otel.md)

### Architecture

- **backend** — uses `@elysiajs/opentelemetry` (auto-instruments HTTP spans); no `@distributed-systems/otel`.
- **worker** — calls `initWorkerOtel()` from `@distributed-systems/otel` at the very top of `src/index.ts`, before any other imports.
- **packages/rabbitmq** — injects/extracts W3C `traceparent` header via `@opentelemetry/api` propagation API (no-op when SDK not initialised).
- **packages/logger** — reads `traceId`/`spanId` from the active span via `@opentelemetry/api` and appends them to every log line (no-op when SDK not initialised).

### packages/otel (`@distributed-systems/otel`)

Exports `initWorkerOtel()`: creates `NodeTracerProvider` + `BatchSpanProcessor` + `OTLPTraceExporter`.

- `OTEL_SERVICE_NAME` — service name (required env var).
- `OTEL_EXPORTER_OTLP_ENDPOINT` — base URL; `/v1/traces` is appended automatically.

### CRITICAL: OTel version compatibility

`@elysiajs/opentelemetry@1.4.x` requires OTel SDK **2.x**. Mixing 1.x/0.57.x causes TypeScript type conflicts (`Resource`/`Span` type mismatch). Always use: `sdk-trace-node@^2.0.0`, `sdk-trace-base@^2.0.0`, `exporter-trace-otlp-proto@^0.200.0`, `api@^1.9.0`.

---

## Common Gotchas

1. **Docker build uses `COPY . .`** — All Dockerfiles copy the full monorepo tree and then run `bun install --frozen-lockfile`. Workspace symlinks are resolved correctly this way. Manual `ln -sfn` steps are no longer needed. All images also require `apk add python3 make g++ git` before `bun install` for native modules (ssh2). Set `ENV HUSKY=0` to prevent the prepare hook from running inside the image.

2. **Prisma client location** — generated at `packages/database/src/generated/client`. If imports fail, run `bun run db:generate`.

3. **MySQL format in root .env** — Bun auto-loads it. SQLite format (`file:...`) causes Prisma validation failure.

4. **Integration test port 3099** — hardcoded in `tests/integration/setup.ts` to avoid docker-compose conflict on 3000.

5. **`.ts` extension in subpath import wildcards** — required for Bun test runner. Without it, module resolution fails.

6. **Worker `#shared/*` path differs from backend** — backend: `./src/shared/*.ts`, worker: `./src/modules/shared/*.ts`.

7. **`PRISMA_GENERATE_SKIP_AUTOINSTALL=true`** — required in Docker (oven/bun image has no npm).

8. **`bun run --filter` does not forward stdin** — use `--cwd` for interactive commands like `prisma migrate dev`.

---

## Backend HTTP API

Full endpoint reference (routes, auth, module layout): see [`backend-api.md`](.claude/agent-memory/monorepo-manager/backend-api.md)

Key facts:

- Auth cookie: `session` (HttpOnly, SameSite=lax, 7d). JWT payload: `{ userId, email }`.
- `GET /me` reads JWT context only — no DB hit.
- `invoicing` module: 3 RabbitMQ consumers (inprogress, completed, failed) + REST + WS (`/ws`).
- `users` module: no RabbitMQ. Two route files: `auth.routes.ts` + `user.routes.ts`.

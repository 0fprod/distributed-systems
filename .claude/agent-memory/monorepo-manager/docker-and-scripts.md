# Docker and Scripts — Learned Patterns

Project: `/Users/fran/Workspace/distributed-systems`
Package manager: bun@1.3.6, workspaces: `apps/*`, `packages/*`
Scope prefix: `@distributed-systems`

---

## Docker

### Workspace packages

| Package             | npm name                        | Notes                                                                                                                      |
| ------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `packages/database` | `@distributed-systems/database` | Prisma client, migrations                                                                                                  |
| `packages/shared`   | `@distributed-systems/shared`   | Shared domain types / constants                                                                                            |
| `packages/rabbitmq` | `@distributed-systems/rabbitmq` | `publish()`, `subscribe()` (broadcast), `subscribeWork()` (durable+DLQ), `ConsumerChannels`, `QueueNames`, `ExchangeNames` |

`amqplib` and `@types/amqplib` are dependencies of `packages/rabbitmq` — NOT of individual apps.

### Adding a new `packages/*` workspace — required Dockerfile changes

Whenever a new workspace package is added, ALL Dockerfiles must be updated **before** `bun install --frozen-lockfile`. The lockfile already references the new manifest so `bun install` fails if the manifest is missing.

**Every Dockerfile** (backend, worker, frontend):

```dockerfile
COPY packages/<name>/package.json ./packages/<name>/
```

**Backend and worker only** — also add symlink and source copy:

```dockerfile
ln -sfn /app/packages/<name> /app/node_modules/@distributed-systems/<name>
COPY packages/<name>/ ./packages/<name>/
```

Frontend only needs the manifest copy (bun.lock references it but frontend doesn't import it directly).

### Workspace symlinks must be created manually

`bun install --frozen-lockfile` inside Docker does NOT create workspace symlinks reliably.
Local packages (`@distributed-systems/shared`, `@distributed-systems/database`, `@distributed-systems/rabbitmq`) are not resolved at runtime without explicit symlinks.

Always add this step after `bun install`:

```dockerfile
RUN mkdir -p /app/node_modules/@distributed-systems && \
    ln -sfn /app/packages/shared /app/node_modules/@distributed-systems/shared && \
    ln -sfn /app/packages/database /app/node_modules/@distributed-systems/database && \
    ln -sfn /app/packages/rabbitmq /app/node_modules/@distributed-systems/rabbitmq
```

### Single-stage for apps that run TypeScript directly

Backend and worker run `bun run src/index.ts` (no compilation step). Multi-stage builds break workspace symlinks when copying `node_modules/` between stages.

Rule: use single-stage for any app that runs TypeScript source directly with bun.

Frontend uses multi-stage (bun build → nginx) because it produces a static `dist/`.

### Never mount a Docker volume over a workspace package directory

Mounting a data volume at `/app/packages/database` overwrites the package source at runtime.

Always mount data volumes at a separate path:

```yaml
volumes:
  - db-data:/data
environment:
  DATABASE_URL: file:/data/dev.db
```

### Prisma in bun image (no npm)

`prisma generate` tries to run `npm i @prisma/client` post-generation. The `oven/bun` image has no npm.

Fix:

```dockerfile
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
RUN bun run --filter '@distributed-systems/database' db:generate
```

Also ensure `@prisma/client` is in `dependencies` of `packages/database/package.json`.

### Root tsconfig must be copied in Dockerfile

Every app tsconfig extends `../../tsconfig.json`. Omitting it from the COPY step causes build failure.

```dockerfile
COPY package.json bun.lock bunfig.toml tsconfig.json ./
```

### Backend / Worker Dockerfile template (single-stage)

```dockerfile
FROM oven/bun:1.3.6-alpine
WORKDIR /app

COPY package.json bun.lock bunfig.toml tsconfig.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/worker/package.json ./apps/worker/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/rabbitmq/package.json ./packages/rabbitmq/

RUN bun install --frozen-lockfile

RUN mkdir -p /app/node_modules/@distributed-systems && \
    ln -sfn /app/packages/shared /app/node_modules/@distributed-systems/shared && \
    ln -sfn /app/packages/database /app/node_modules/@distributed-systems/database && \
    ln -sfn /app/packages/rabbitmq /app/node_modules/@distributed-systems/rabbitmq

COPY packages/shared/ ./packages/shared/
COPY packages/database/ ./packages/database/
COPY packages/rabbitmq/ ./packages/rabbitmq/

ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
RUN bun run --filter '@distributed-systems/database' db:generate

COPY apps/backend/ ./apps/backend/
WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["sh", "-c", "bun run --filter '@distributed-systems/database' db:migrate:deploy && bun run src/index.ts"]
```

### Frontend Dockerfile template (multi-stage)

```dockerfile
FROM oven/bun:1.3.6-alpine AS builder
WORKDIR /app
# ... copy and bun install ...
# ... bun run build ...

FROM nginx:alpine
COPY --from=builder /app/apps/frontend/dist/ /usr/share/nginx/html/
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
```

---

## RabbitMQ — Race condition on startup

`rabbitmq-diagnostics ping` passes when the management API is ready, but the AMQP port (5672) may still be unavailable.

Mitigation:

- Implement retry with exponential backoff in amqplib connection code
- Set `restart: on-failure` in docker-compose for backend and worker services

---

## Scripts

### `bun run --filter` does not forward stdin

Interactive commands (e.g. `prisma migrate dev` which prompts for a migration name) hang when launched via `--filter`.

Use `--cwd` for interactive commands:

```json
"db:migrate": "bun run --cwd packages/database db:migrate"
```

Use `--filter` only for non-interactive commands.

### Recommended root-level db scripts

```json
"db:generate":        "bun run --filter '@distributed-systems/database' db:generate",
"db:push":            "bun run --filter '@distributed-systems/database' db:push",
"db:migrate":         "bun run --cwd packages/database db:migrate",
"db:migrate:deploy":  "bun run --filter '@distributed-systems/database' db:migrate:deploy",
"db:setup":           "bun run db:generate && bun run db:push"
```

---

## Prisma

### SQLite path resolution

Prisma resolves `file:` paths relative to the directory containing `schema.prisma`, not the process cwd.

With schema at `packages/database/prisma/schema.prisma`:

- `file:./dev.db` → `packages/database/prisma/dev.db` (wrong, inside prisma dir)
- `file:../dev.db` → `packages/database/dev.db` (correct)
- `file:/data/dev.db` → absolute path used in Docker (correct for containers)

### migrate dev vs push vs migrate deploy

| Command          | Use case                                          | Side effects                   |
| ---------------- | ------------------------------------------------- | ------------------------------ |
| `db push`        | Fast dev iteration, no migration history          | Can be destructive             |
| `migrate dev`    | Dev with versioned SQL history in git             | Generates `prisma/migrations/` |
| `migrate deploy` | Production / Docker — applies existing migrations | Safe, no generation            |

Always run `prisma generate` before `migrate deploy` (use a `predb:migrate:deploy` script).

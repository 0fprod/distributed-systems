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

### Simplified build approach: `COPY . .` + `bun install`

All three Dockerfiles now use `COPY . .` to copy the entire monorepo into the image, then run `bun install --frozen-lockfile`. Manual symlink creation is no longer needed — Bun resolves workspace symlinks correctly when the full monorepo tree is present.

Do NOT revert to the old pattern of copying individual `package.json` files one by one followed by manual `ln -sfn` symlink steps. That approach is obsolete.

Adding a new `packages/*` workspace no longer requires Dockerfile changes — `COPY . .` includes every new directory automatically.

### Python toolchain required for native modules (ssh2)

All Dockerfiles must install build toolchain before `bun install` because `ssh2` (and other modules with native addons) require node-gyp:

```dockerfile
RUN apk add --no-cache python3 make g++ git
ENV PYTHON=/usr/bin/python3
ENV HUSKY=0
```

`ENV HUSKY=0` prevents Husky from running the `prepare` hook during `bun install` inside the image.

### Single-stage for apps that run TypeScript directly

Backend and worker run `bun run src/index.ts` (no compilation step). Use a single-stage image for these.

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

### Backend Dockerfile (single-stage)

```dockerfile
FROM oven/bun:1.3.6-alpine

WORKDIR /app
RUN apk add --no-cache python3 make g++ git
ENV PYTHON=/usr/bin/python3
ENV HUSKY=0

COPY . .

RUN bun install --frozen-lockfile --verbose

WORKDIR /app/apps/backend
EXPOSE 3000
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true

CMD ["sh", "-c", "bun run --filter '@distributed-systems/database' db:migrate:deploy && bun run src/index.ts"]
```

### Worker Dockerfile (single-stage)

```dockerfile
FROM oven/bun:1.3.6-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ git
ENV PYTHON=/usr/bin/python3
ENV HUSKY=0

COPY . .

RUN bun install --frozen-lockfile

ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
RUN bun run --filter '@distributed-systems/database' db:generate

WORKDIR /app/apps/worker
CMD ["bun", "run", "src/index.ts"]
```

### Frontend Dockerfile (multi-stage)

```dockerfile
# Stage 1: build
FROM oven/bun:1.3.6-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ git
ENV PYTHON=/usr/bin/python3
ENV HUSKY=0

COPY . .

RUN bun install --frozen-lockfile

WORKDIR /app/apps/frontend
RUN bun run build

# Stage 2: serve via nginx
FROM nginx:alpine AS runtime

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/apps/frontend/dist/ /usr/share/nginx/html/
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
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

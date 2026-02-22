FROM oven/bun:1.3.6-alpine

WORKDIR /app

# Copy workspace manifests and lockfile first to leverage Docker layer cache.
COPY package.json bun.lock bunfig.toml tsconfig.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/worker/package.json ./apps/worker/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

# Install all workspace dependencies from the root lockfile.
RUN bun install --frozen-lockfile

# Explicitly create workspace symlinks with absolute paths.
# bun install --frozen-lockfile does not reliably create workspace symlinks in Docker.
RUN mkdir -p /app/node_modules/@distributed-systems && \
    ln -sfn /app/packages/shared /app/node_modules/@distributed-systems/shared && \
    ln -sfn /app/packages/database /app/node_modules/@distributed-systems/database

# Copy package sources (symlinks above now resolve to these directories).
COPY packages/shared/ ./packages/shared/
COPY packages/database/ ./packages/database/

COPY apps/backend/ ./apps/backend/

WORKDIR /app/apps/backend

EXPOSE 3000

# Run db:push to create/migrate the SQLite schema on the mounted volume, then start.
CMD ["sh", "-c", "bun run --filter '@distributed-systems/database' db:migrate:deploy && bun run src/index.ts"]

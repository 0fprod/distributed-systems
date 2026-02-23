FROM oven/bun:1.3.6-alpine

WORKDIR /app

# Copy workspace manifests and lockfile first to leverage Docker layer cache.
COPY package.json bun.lock bunfig.toml tsconfig.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/worker/package.json ./apps/worker/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/rabbitmq/package.json ./packages/rabbitmq/

# Install all workspace dependencies from the root lockfile.
RUN bun install --frozen-lockfile

# Explicitly create workspace symlinks with absolute paths.
# bun install --frozen-lockfile does not reliably create workspace symlinks in Docker.
RUN mkdir -p /app/node_modules/@distributed-systems && \
    ln -sfn /app/packages/shared /app/node_modules/@distributed-systems/shared && \
    ln -sfn /app/packages/database /app/node_modules/@distributed-systems/database && \
    ln -sfn /app/packages/rabbitmq /app/node_modules/@distributed-systems/rabbitmq

# Copy package sources (symlinks above now resolve to these directories).
COPY packages/shared/ ./packages/shared/
COPY packages/database/ ./packages/database/
COPY packages/rabbitmq/ ./packages/rabbitmq/

# Generate the Prisma client for the worker (no migrate:deploy here — backend owns migrations).
# PRISMA_GENERATE_SKIP_AUTOINSTALL: @prisma/client is already installed via bun, skip npm fallback.
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
RUN bun run --filter '@distributed-systems/database' db:generate

COPY apps/worker/ ./apps/worker/

WORKDIR /app/apps/worker

# No port exposed — worker is a background consumer only.
CMD ["bun", "run", "src/index.ts"]

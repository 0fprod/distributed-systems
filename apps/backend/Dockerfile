# ─── Stage 1: dependencies + build ──────────────────────────────────────────
FROM oven/bun:1.3.6-alpine AS builder

WORKDIR /app

# Copy workspace manifests and lockfile first to leverage Docker layer cache.
COPY package.json bun.lock bunfig.toml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/worker/package.json ./apps/worker/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
# packages/packages is an odd dir that appeared in ls; handle shared subdir
COPY packages/packages/ ./packages/packages/ 2>/dev/null || true

# Install all workspace dependencies from the root lockfile.
RUN bun install --frozen-lockfile

# Copy source code for the packages the backend depends on.
COPY packages/shared/ ./packages/shared/
COPY packages/database/ ./packages/database/

# Generate the Prisma client (TypeScript types only — no DB connection needed).
RUN bun run --filter '@distributed-systems/database' db:generate

# Copy backend source and build.
COPY apps/backend/ ./apps/backend/
RUN bun run --filter '@distributed-systems/backend' build

# ─── Stage 2: production runtime ─────────────────────────────────────────────
FROM oven/bun:1.3.6-alpine AS runtime

WORKDIR /app

# Copy the full monorepo structure so workspace symlinks resolve correctly.
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
COPY --from=builder /app/bunfig.toml ./
COPY --from=builder /app/node_modules/ ./node_modules/

COPY --from=builder /app/packages/shared/ ./packages/shared/
COPY --from=builder /app/packages/database/ ./packages/database/

COPY --from=builder /app/apps/backend/ ./apps/backend/

WORKDIR /app/apps/backend

EXPOSE 3000

# Run from source with Bun (no transpilation needed at runtime).
CMD ["bun", "run", "src/index.ts"]

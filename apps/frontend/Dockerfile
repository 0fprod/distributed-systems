# ─── Stage 1: build ──────────────────────────────────────────────────────────
FROM oven/bun:1.3.6-alpine AS builder

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

# Copy the shared package source (frontend imports @distributed-systems/shared
# via the vite alias that resolves workspace packages to their source).
COPY packages/shared/ ./packages/shared/
COPY packages/database/ ./packages/database/

# Copy frontend source and build.
COPY apps/frontend/ ./apps/frontend/

WORKDIR /app/apps/frontend
RUN bun run build

# ─── Stage 2: serve via nginx ─────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Remove default nginx static assets.
RUN rm -rf /usr/share/nginx/html/*

# Copy the Vite build output.
COPY --from=builder /app/apps/frontend/dist/ /usr/share/nginx/html/

# Copy the SPA nginx config (try_files fallback to index.html).
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

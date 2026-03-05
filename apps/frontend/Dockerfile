# ─── Stage 1: build ──────────────────────────────────────────────────────────
# Builder runs on the native build platform (arm64 on M2) — no QEMU needed.
# The output is static HTML/JS/CSS which is architecture-independent.
FROM --platform=$BUILDPLATFORM oven/bun:1.3.6-alpine AS builder

WORKDIR /app

# Toolchain para node-gyp (ssh2 y otros nativos)
RUN apk add --no-cache python3 make g++ git
ENV PYTHON=/usr/bin/python3
ENV HUSKY=0

# Copia solo los manifiestos del workspace — esta capa se cachea mientras
# no cambien package.json ni bun.lock, independientemente del código fuente.
COPY package.json bun.lock ./
COPY apps/frontend/package.json   apps/frontend/
COPY apps/backend/package.json    apps/backend/
COPY apps/worker/package.json     apps/worker/
COPY packages/shared/package.json     packages/shared/
COPY packages/database/package.json   packages/database/
COPY packages/logger/package.json     packages/logger/
COPY packages/otel/package.json       packages/otel/
COPY packages/rabbitmq/package.json   packages/rabbitmq/
COPY tests/integration/package.json  tests/integration/

# Instala dependencias — solo se re-ejecuta si cambian los manifiestos
RUN bun install --frozen-lockfile

# Copia el código fuente — los cambios aquí no invalidan la capa de instalación
COPY . .

# Build frontend
WORKDIR /app/apps/frontend
RUN bun run build

# ─── Stage 2: serve via nginx ─────────────────────────────────────────────────
# nginx-unprivileged runs as uid 101 (non-root), enabling runAsNonRoot in k8s.
FROM nginxinc/nginx-unprivileged:alpine AS runtime

COPY --from=builder /app/apps/frontend/dist/ /usr/share/nginx/html/
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

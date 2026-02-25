# ─── Stage 1: build ──────────────────────────────────────────────────────────
FROM oven/bun:1.3.6-alpine AS builder

WORKDIR /app

# Toolchain para node-gyp (ssh2 y otros nativos)
RUN apk add --no-cache python3 make g++ git
ENV PYTHON=/usr/bin/python3
ENV HUSKY=0

# Copia todo el monorepo (usa .dockerignore para excluir node_modules, .git, dist, etc.)
COPY . .

# Instala deps del workspace (reproducible)
RUN bun install --frozen-lockfile

# Build frontend
WORKDIR /app/apps/frontend
RUN bun run build

# ─── Stage 2: serve via nginx ─────────────────────────────────────────────────
FROM nginx:alpine AS runtime

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/apps/frontend/dist/ /usr/share/nginx/html/
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
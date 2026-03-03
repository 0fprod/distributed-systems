FROM oven/bun:1.3.6-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ git
ENV PYTHON=/usr/bin/python3
ENV HUSKY=0

# Copia solo los manifiestos del workspace — cacheado mientras no cambien deps
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

# Copia solo el schema de Prisma y genera el cliente — cacheado mientras no cambie el schema
COPY packages/database/prisma packages/database/prisma
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
RUN bun run --filter '@distributed-systems/database' db:generate

# Copia el resto del código fuente
COPY . .

WORKDIR /app/apps/worker
CMD ["bun", "run", "src/index.ts"]

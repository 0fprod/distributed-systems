FROM oven/bun:1.3.6-alpine

WORKDIR /app

# Toolchain para node-gyp (ssh2)
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
RUN bun install --frozen-lockfile --verbose && \
    find /app/node_modules/.bun -name "index.js" -path "*/prisma/build/index.js" -exec chmod a+x {} \; && \
    find /app/node_modules/.bun -name "schema-engine*" -o -name "query-engine*" -o -name "libquery_engine*" | xargs chmod +x 2>/dev/null || true

# Copia el código fuente — no invalida la capa de instalación
COPY . .

WORKDIR /app/apps/backend
EXPOSE 3000
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true

CMD ["sh", "-c", "bun run --filter '@distributed-systems/database' db:migrate:deploy && bun run src/index.ts"]

FROM oven/bun:1.3.6-alpine

WORKDIR /app
# Toolchain para node-gyp (ssh2)
RUN apk add --no-cache python3 make g++ git
ENV PYTHON=/usr/bin/python3
ENV HUSKY=0

# Copia TODO el repo (usa .dockerignore para no llevarte node_modules, etc.)
COPY . .

RUN bun install --frozen-lockfile --verbose

# (si quieres mantener tus symlinks, puedes dejarlos, pero probablemente ya no hagan falta)
# ...

WORKDIR /app/apps/backend
EXPOSE 3000
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true

CMD ["sh", "-c", "bun run --filter '@distributed-systems/database' db:migrate:deploy && bun run src/index.ts"]
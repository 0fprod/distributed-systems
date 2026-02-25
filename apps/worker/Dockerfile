FROM oven/bun:1.3.6-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ git
ENV PYTHON=/usr/bin/python3
ENV HUSKY=0

COPY . .

RUN bun install --frozen-lockfile

# Prisma client (worker no migra)
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
RUN bun run --filter '@distributed-systems/database' db:generate

WORKDIR /app/apps/worker
CMD ["bun", "run", "src/index.ts"]
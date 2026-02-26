import { MySqlContainer, type StartedMySqlContainer } from "@testcontainers/mysql";
import { RabbitMQContainer, type StartedRabbitMQContainer } from "@testcontainers/rabbitmq";
import { config } from "dotenv";
import path from "node:path";
import { Wait } from "testcontainers";

import { PrismaClient } from "@distributed-systems/database";
import { ApiRoutes } from "@distributed-systems/shared";

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(import.meta.dir, "../..");
const SCHEMA = path.join(ROOT, "packages/database/prisma/schema.prisma");
const BACKEND = path.join(ROOT, "apps/backend");
const WORKER = path.join(ROOT, "apps/worker");

// ── Base env (non-sensitive defaults: ports, local URLs) ──────────────────────
// Each .env only sets what belongs to that package.
// Container URLs will override DATABASE_URL and RABBITMQ_URL at runtime.
config({
  path: [
    path.join(ROOT, "packages/database/.env"), // DATABASE_URL
    path.join(ROOT, "apps/backend/.env"), // PORT
    path.join(ROOT, "packages/rabbitmq/.env"), // RABBITMQ_URL
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Infrastructure
// ─────────────────────────────────────────────────────────────────────────────

async function startMySQL(): Promise<StartedMySqlContainer> {
  return new MySqlContainer("mysql:8.0")
    .withName("integration-mysql")
    .withDatabase("invoices_test")
    .withRootPassword("root")
    .withWaitStrategy(Wait.forLogMessage("ready for connections"))
    .start();
}

async function startRabbitMQ(): Promise<StartedRabbitMQContainer> {
  return new RabbitMQContainer("rabbitmq:3-management").withName("integration-rabbitmq").start();
}

function applyMigrations(databaseUrl: string): void {
  const result = Bun.spawnSync(
    [
      "bun",
      "run",
      "--cwd",
      path.join(ROOT, "packages/database"),
      "prisma",
      "migrate",
      "deploy",
      "--schema",
      SCHEMA,
    ],
    {
      cwd: import.meta.dir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.exitCode !== 0) {
    throw new Error(`Migrations failed:\n${new TextDecoder().decode(result.stderr)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Services
// ─────────────────────────────────────────────────────────────────────────────

async function startBackend(
  databaseUrl: string,
  rabbitmqUrl: string,
  port: string,
): Promise<{ url: string; process: ReturnType<typeof Bun.spawn> }> {
  const proc = Bun.spawn(["bun", "run", "src/index.ts"], {
    cwd: BACKEND,
    env: { ...process.env, DATABASE_URL: databaseUrl, RABBITMQ_URL: rabbitmqUrl, PORT: port },
    stdout: "pipe",
    stderr: "pipe",
  });

  // Forward backend output inline so logs appear synchronously in test output
  // proc.stdout.pipeTo(
  //   new WritableStream({
  //     write: (chunk) => void process.stdout.write(`[backend] ${new TextDecoder().decode(chunk)}`),
  //   }),
  // );
  // proc.stderr.pipeTo(
  //   new WritableStream({
  //     write: (chunk) =>
  //       void process.stderr.write(`[backend:err] ${new TextDecoder().decode(chunk)}`),
  //   }),
  // );

  return { url: `http://localhost:${port}`, process: proc };
}

function startWorker(databaseUrl: string, rabbitmqUrl: string): ReturnType<typeof Bun.spawn> {
  const proc = Bun.spawn(["bun", "run", "src/index.ts"], {
    cwd: WORKER,
    env: { ...process.env, DATABASE_URL: databaseUrl, RABBITMQ_URL: rabbitmqUrl },
    stdout: "pipe",
    stderr: "pipe",
  });

  // proc.stdout.pipeTo(
  //   new WritableStream({
  //     write: (chunk) => void process.stdout.write(`[worker] ${new TextDecoder().decode(chunk)}`),
  //   }),
  // );
  // proc.stderr.pipeTo(
  //   new WritableStream({
  //     write: (chunk) =>
  //       void process.stderr.write(`[worker:err] ${new TextDecoder().decode(chunk)}`),
  //   }),
  // );

  return proc;
}

async function waitUntilBackendReady(url: string, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}${ApiRoutes.HEALTH}`);
      if (res.ok) return;
    } catch {
      /* not ready yet */
    }
    await Bun.sleep(300);
  }
  throw new Error(`Backend at ${url} was not ready within ${timeoutMs} ms`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface Stack {
  baseUrl: string;
  prisma: PrismaClient;
  teardown: () => Promise<void>;
}

export async function startStack(): Promise<Stack> {
  console.log("  [1/5] Starting MySQL...");
  const mysql = await startMySQL();

  console.log("  [2/5] Starting RabbitMQ...");
  const rabbit = await startRabbitMQ();

  console.log("  [3/5] Applying migrations...");
  applyMigrations(mysql.getConnectionUri());

  console.log("  [4/5] Starting backend...");
  const backend = await startBackend(mysql.getConnectionUri(), rabbit.getAmqpUrl(), "3099");

  console.log("  [5/5] Starting worker...");
  const worker = startWorker(mysql.getConnectionUri(), rabbit.getAmqpUrl());

  const prisma = new PrismaClient({
    datasources: { db: { url: mysql.getConnectionUri() } },
  });

  await waitUntilBackendReady(backend.url);
  console.log(`  ✓ Stack ready — backend at ${backend.url}`);

  return {
    baseUrl: backend.url,
    prisma,
    teardown: async () => {
      backend.process.kill();
      worker.kill();
      await prisma.$disconnect();
      await mysql.stop();
      await rabbit.stop();
    },
  };
}

export async function waitForStatus(
  baseUrl: string,
  invoiceId: number,
  expectedStatus: string,
  timeoutMs = 20_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${baseUrl}${ApiRoutes.INVOICES}`);
    const invoices = (await res.json()) as Array<{ id: number; status: string }>;
    if (invoices.find((i) => i.id === invoiceId)?.status === expectedStatus) return;
    await Bun.sleep(300);
  }
  throw new Error(`Invoice ${invoiceId} did not reach "${expectedStatus}" within ${timeoutMs} ms`);
}

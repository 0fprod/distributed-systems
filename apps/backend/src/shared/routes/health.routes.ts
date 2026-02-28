import { Elysia } from "elysia";

import { prisma } from "@distributed-systems/database";
import { isRabbitMQHealthy } from "@distributed-systems/rabbitmq";
import { ApiRoutes } from "@distributed-systems/shared";

export function healthRoutes() {
  return new Elysia().get(ApiRoutes.HEALTH, async ({ status }) => {
    const [dbStatus, rabbitmqStatus] = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => "ok" as const).catch(() => "error" as const),
      Promise.resolve(isRabbitMQHealthy() ? ("ok" as const) : ("error" as const)),
    ]);

    const overall = dbStatus === "ok" && rabbitmqStatus === "ok" ? "ok" : "degraded";

    if (overall !== "ok") {
      return status(503, { status: overall, db: dbStatus, rabbitmq: rabbitmqStatus });
    }

    return { status: overall, db: dbStatus, rabbitmq: rabbitmqStatus };
  });
}

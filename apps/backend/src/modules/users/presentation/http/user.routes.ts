import { Elysia, t } from "elysia";

import { createLogger, runWithContext } from "@distributed-systems/logger";
import { ApiRoutes } from "@distributed-systems/shared";

import { authPlugin } from "#shared/plugins/auth.plugin";
import { requestIdPlugin } from "#shared/plugins/request-id.plugin";
import { registerUserHandler } from "#users/application/commands/register-user/register-user.handler";
import { prismaUserRepository } from "#users/infrastructure/repositories/prisma-user.repository";

const logger = createLogger("user-routes");

interface UserRoutesOptions {
  jwtSecret: string;
}

export function userRoutes({ jwtSecret }: UserRoutesOptions) {
  return (
    new Elysia({ name: "user-routes" })
      .use(requestIdPlugin)
      // Public: POST /register
      .post(
        ApiRoutes.REGISTER,
        async ({ body, status, requestId }) => {
          return runWithContext(requestId, async () => {
            const result = await registerUserHandler(
              { name: body.name, email: body.email, password: body.password },
              { userRepository: prismaUserRepository },
            );

            if (!result.ok) {
              const error = result.error;
              switch (error.type) {
                case "weak_password":
                case "duplicate_email":
                  return status(400, { message: error.message });
                case "persistence_error":
                  logger.error({ err: error.cause }, error.message);
                  return status(500, { message: error.message });
              }
            }

            return status(201, { id: result.value.id });
          });
        },
        {
          body: t.Object({
            name: t.String({ minLength: 1 }),
            email: t.String({ format: "email" }),
            password: t.String({ minLength: 6 }),
          }),
        },
      )

      // Protected: GET /me
      .use(authPlugin({ jwtSecret }))
      .get(ApiRoutes.ME, ({ currentUser }) => {
        return { id: currentUser.userId, email: currentUser.email };
      })
  );
}

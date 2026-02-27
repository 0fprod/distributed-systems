import { Elysia, t } from "elysia";

import { ApiRoutes } from "@distributed-systems/shared";

import { authPlugin } from "#shared/plugins/auth.plugin";
import { registerUserHandler } from "#users/application/commands/register-user/register-user.handler";
import { prismaUserRepository } from "#users/infrastructure/repositories/prisma-user.repository";

interface UserRoutesOptions {
  jwtSecret: string;
}

export function userRoutes({ jwtSecret }: UserRoutesOptions) {
  return (
    new Elysia({ name: "user-routes" })
      // Public: POST /register
      .post(
        ApiRoutes.REGISTER,
        async ({ body, status }) => {
          const result = await registerUserHandler(
            { name: body.name, email: body.email, password: body.password },
            { userRepository: prismaUserRepository },
          );

          if (!result.ok) {
            return status(400, { message: result.error.message });
          }

          return status(201, { id: result.value.id });
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

import { jwt } from "@elysiajs/jwt";
import { Elysia, t } from "elysia";

import { createLogger, runWithContext } from "@distributed-systems/logger";
import { ApiRoutes } from "@distributed-systems/shared";

import { requestIdPlugin } from "#shared/plugins/request-id.plugin";
import { loginUserHandler } from "#users/application/commands/login-user/login-user.handler";
import { prismaUserRepository } from "#users/infrastructure/repositories/prisma-user.repository";

const logger = createLogger("auth-routes");

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
const JWT_EXP = "7d";

interface AuthRoutesOptions {
  jwtSecret: string;
}

/**
 * Public authentication routes: /login and /logout.
 */
export function authRoutes({ jwtSecret }: AuthRoutesOptions) {
  return (
    new Elysia({ name: "auth-routes" })
      .use(requestIdPlugin)
      .use(jwt({ name: "jwt", secret: jwtSecret, exp: JWT_EXP }))

      // POST /login — verify credentials, issue a signed JWT in an HttpOnly cookie.
      .post(
        ApiRoutes.LOGIN,
        async ({ jwt, body, cookie, status, requestId }) => {
          return runWithContext(requestId, async () => {
            const result = await loginUserHandler(
              { email: body.email, password: body.password },
              { userRepository: prismaUserRepository },
            );

            if (!result.ok) {
              const error = result.error;
              switch (error.type) {
                case "invalid_credentials":
                  return status(401, { message: error.message });
                case "persistence_error":
                  logger.error({ err: error.cause }, error.message);
                  return status(500, { message: error.message });
              }
            }

            const token = await jwt.sign({
              userId: result.value.id,
              email: result.value.email,
            });

            cookie["session"]!.set({
              value: token,
              httpOnly: true,
              sameSite: "lax",
              path: "/",
              maxAge: SESSION_MAX_AGE,
            });

            return { message: "Logged in" };
          });
        },
        {
          body: t.Object({
            email: t.String({ format: "email" }),
            password: t.String({ minLength: 1 }),
          }),
        },
      )

      // POST /logout — remove the session cookie.
      .post(ApiRoutes.LOGOUT, ({ cookie }) => {
        cookie["session"]!.remove();
        return { message: "Logged out" };
      })
  );
}

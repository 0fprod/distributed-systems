import { jwt } from "@elysiajs/jwt";
import { Elysia, t } from "elysia";

import { ApiRoutes } from "@distributed-systems/shared";

import { loginUserHandler } from "#users/application/commands/login-user/login-user.handler";
import { prismaUserRepository } from "#users/infrastructure/repositories/prisma-user.repository";

// 7 days expressed in seconds (cookie maxAge) and as a JWT expiration string.
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 604_800 s
const JWT_EXP = "7d";

interface AuthRoutesOptions {
  jwtSecret: string;
}

export function authRoutes({ jwtSecret }: AuthRoutesOptions) {
  return (
    new Elysia()
      .use(jwt({ name: "jwt", secret: jwtSecret, exp: JWT_EXP }))

      // POST /login — verify credentials, issue a signed JWT in an HttpOnly cookie.
      .post(
        ApiRoutes.LOGIN,
        async ({ jwt, body, cookie, status }) => {
          const result = await loginUserHandler(
            { email: body.email, password: body.password },
            { userRepository: prismaUserRepository },
          );

          if (!result.ok) {
            return status(401, { message: result.error.message });
          }

          const token = await jwt.sign({
            userId: result.value.id,
            email: result.value.email,
          });

          // Set the cookie — HttpOnly prevents JS access; sameSite "lax" is
          // safe for same-origin forms and top-level navigations while blocking
          // cross-site POST forgery.
          // The cookie jar always returns a Cookie proxy even for new keys, so
          // the non-null assertion is safe here (Elysia guarantees this).
          cookie["session"]!.set({
            value: token,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_MAX_AGE,
          });

          return { message: "Logged in" };
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

      // GET /me — verify the session cookie and return the current user identity.
      .get(ApiRoutes.ME, async ({ jwt, cookie, status }) => {
        const sessionToken = cookie["session"]?.value;

        if (!sessionToken || typeof sessionToken !== "string") {
          return status(401, { message: "Unauthorized" });
        }

        const payload = await jwt.verify(sessionToken);

        if (!payload || typeof payload.userId !== "number" || typeof payload.email !== "string") {
          return status(401, { message: "Unauthorized" });
        }

        return { id: payload.userId, email: payload.email };
      })
  );
}

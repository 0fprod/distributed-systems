import { jwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";

// The auth plugin is a reusable Elysia guard that:
//   1. Reads the "session" HttpOnly cookie on every inbound request.
//   2. Verifies the JWT inside it against the configured secret.
//   3. Injects `currentUser: { userId, email }` into the Elysia context via decorate.
//   4. Returns 401 if the cookie is absent or the JWT is invalid/expired.
//
// Scope is "scoped" so that a parent Elysia instance that calls `.use(authPlugin(...))`
// also benefits from the guard (the invoice routes case).
//
// Usage:
//   new Elysia().use(authPlugin({ jwtSecret: "..." }))
//
// After use(), handlers receive `currentUser: { userId: string; email: string }`.
// userId is a UUID string (previously a number — changed when IDs migrated to UUID).

interface AuthPluginOptions {
  jwtSecret: string;
}

export function authPlugin({ jwtSecret }: AuthPluginOptions) {
  return (
    new Elysia({ name: "auth-plugin" })
      // Seed the currentUser placeholder — derive will overwrite it per-request.
      // This keeps the TypeScript context typed correctly for downstream handlers.
      .decorate("currentUser", { userId: "", email: "" })
      .use(jwt({ name: "jwt", secret: jwtSecret }))
      .resolve({ as: "scoped" }, async ({ jwt, cookie, status }) => {
        // cookie is Record<string, Cookie<unknown>> — access by key.
        const sessionToken = cookie["session"]?.value;

        // An absent or non-string value means the request is unauthenticated.
        if (!sessionToken || typeof sessionToken !== "string") {
          return status(401, { message: "Unauthorized" });
        }

        const payload = await jwt.verify(sessionToken);

        if (!payload || typeof payload.userId !== "string" || typeof payload.email !== "string") {
          return status(401, { message: "Unauthorized" });
        }

        // Inject the verified identity so downstream handlers can read it.
        return {
          currentUser: { userId: payload.userId, email: payload.email },
        };
      })
  );
}

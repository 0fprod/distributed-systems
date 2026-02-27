import type { User as PrismaUser } from "../generated/client";

// Returns all Prisma user fields including the hashed password.
// Only the backend's own auth layer should consume this — never expose
// passwordHash across HTTP or to external consumers.
export function toPrismaUserFields(raw: PrismaUser): {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
} {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    passwordHash: raw.password,
  };
}

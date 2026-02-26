import type { User } from "@distributed-systems/shared";

import type { User as PrismaUser } from "../generated/client";

export function toDomainUser(raw: PrismaUser): User {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    passwordHash: raw.password,
  };
}

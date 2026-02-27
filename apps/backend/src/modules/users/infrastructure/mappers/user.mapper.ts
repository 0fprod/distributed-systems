import type { User as PrismaUser } from "@distributed-systems/database";
import { Guid } from "@distributed-systems/shared";

import { BackendUser } from "#users/domain/user";

export function toBackendUser(raw: PrismaUser): BackendUser {
  return BackendUser.create({
    id: Guid.fromString(raw.id),
    name: raw.name,
    email: raw.email,
    passwordHash: raw.password,
  });
}

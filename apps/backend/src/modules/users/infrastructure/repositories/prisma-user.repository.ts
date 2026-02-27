import { prisma } from "@distributed-systems/database";

import { type Result, err, ok } from "#shared/core/result";
import {
  DuplicateEmailError,
  UserNotFoundError,
  UserPersistenceError,
} from "#users/domain/errors/user.errors";
import type { IUserRepository } from "#users/domain/repositories/user.repository.interface";
import type { BackendUser } from "#users/domain/user";
import { toBackendUser } from "#users/infrastructure/mappers/user.mapper";

export const prismaUserRepository: IUserRepository = {
  async save(user: BackendUser) {
    try {
      await prisma.user.create({
        data: {
          id: user.id.value,
          name: user.name,
          email: user.email,
          password: user.passwordHash,
        },
      });

      return ok(undefined);
    } catch (cause) {
      if (isDuplicateEmailError(cause)) {
        return err(new DuplicateEmailError(user.email));
      }
      return err(new UserPersistenceError("Failed to persist user", cause));
    }
  },

  async findByEmail(
    email: string,
  ): Promise<Result<BackendUser, UserPersistenceError | UserNotFoundError>> {
    try {
      const raw = await prisma.user.findUnique({ where: { email } });

      if (!raw) return err(new UserNotFoundError(email));

      return ok(toBackendUser(raw));
    } catch (cause) {
      return err(new UserPersistenceError("Failed to retrieve user", cause));
    }
  },
};

function isDuplicateEmailError(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code: string }).code === "P2002"
  );
}

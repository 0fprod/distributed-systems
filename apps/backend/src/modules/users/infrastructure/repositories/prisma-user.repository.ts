import { prisma } from "@distributed-systems/database";
import { createLogger } from "@distributed-systems/logger";

import { type Result, err, ok } from "#shared/core/result";
import {
  DuplicateEmailError,
  UserNotFoundError,
  UserPersistenceError,
} from "#users/domain/errors/user.errors";
import type { IUserRepository } from "#users/domain/repositories/user.repository.interface";
import type { BackendUser } from "#users/domain/user";
import { toBackendUser } from "#users/infrastructure/mappers/user.mapper";

const logger = createLogger("prisma-user-repository");

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
        return err(new DuplicateEmailError(`A user with email "${user.email}" already exists`));
      }
      logger.error({ err: cause }, "failed to persist user");
      return err(new UserPersistenceError("Failed to persist user", cause));
    }
  },

  async findByEmail(
    email: string,
  ): Promise<Result<BackendUser, UserPersistenceError | UserNotFoundError>> {
    try {
      const raw = await prisma.user.findUnique({ where: { email } });

      if (!raw) return err(new UserNotFoundError(`No user found with email "${email}"`));

      return ok(toBackendUser(raw));
    } catch (cause) {
      logger.error({ err: cause }, "failed to retrieve user");
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

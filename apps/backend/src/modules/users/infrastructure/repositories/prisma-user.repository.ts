import { prisma, toDomainUser } from "@distributed-systems/database";
import type { User } from "@distributed-systems/shared";

import { err, ok } from "#shared/core/result";
import { DuplicateEmailError, UserPersistenceError } from "#users/domain/errors/user.errors";
import type { IUserRepository } from "#users/domain/repositories/user.repository.interface";

export const prismaUserRepository: IUserRepository = {
  async save(user) {
    try {
      const created = await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: user.passwordHash,
        },
      });
      return ok({ id: created.id });
    } catch (cause) {
      if (isDuplicateEmailError(cause)) {
        return err(new DuplicateEmailError(user.email));
      }
      return err(new UserPersistenceError("Failed to persist user", cause));
    }
  },

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    return toDomainUser(user);
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

import { prisma } from "@distributed-systems/database";

import { err, ok } from "#shared/core/result";
import { DuplicateEmailError, UserPersistenceError } from "#users/domain/errors/user.errors";
import type {
  IUserRepository,
  UserCredentials,
  UserData,
} from "#users/domain/repositories/user.repository.interface";

export const prismaUserRepository: IUserRepository = {
  async save(user: UserData) {
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

  async findByEmail(email: string): Promise<UserCredentials | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      // Select only the fields the login use-case needs — no excess data.
      select: { id: true, email: true, password: true },
    });

    if (!user) return null;

    return { id: user.id, email: user.email, passwordHash: user.password };
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

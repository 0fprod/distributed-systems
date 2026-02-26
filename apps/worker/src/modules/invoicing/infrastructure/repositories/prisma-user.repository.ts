import { prisma, toDomainUser } from "@distributed-systems/database";
import type { User } from "@distributed-systems/shared";

import { UserWorkerPersistenceError } from "#invoicing/domain/errors/user.errors";
import type { IUserRepository } from "#invoicing/domain/repositories/user.repository.interface";
import { type Result, err, ok } from "#shared/core/result";

export const prismaUserRepository: IUserRepository = {
  async findById(id: number): Promise<Result<User, UserWorkerPersistenceError>> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return err(new UserWorkerPersistenceError(`User with id ${id} not found`));

    return ok(toDomainUser(user));
  },
};

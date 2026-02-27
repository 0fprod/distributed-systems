import { prisma } from "@distributed-systems/database";

import { UserWorkerPersistenceError } from "#invoicing/domain/errors/user.errors";
import type { IUserRepository } from "#invoicing/domain/repositories/user.repository.interface";
import type { WorkerUser } from "#invoicing/domain/worker-user";
import { type Result, err, ok } from "#shared/core/result";

export const prismaUserRepository: IUserRepository = {
  async findById(id: string): Promise<Result<WorkerUser, UserWorkerPersistenceError>> {
    // Select only the fields WorkerUser needs — never fetches the password column.
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!user) return err(new UserWorkerPersistenceError(`User with id ${id} not found`));

    // The selected shape matches WorkerUser exactly — no mapper needed.
    return ok(user);
  },
};

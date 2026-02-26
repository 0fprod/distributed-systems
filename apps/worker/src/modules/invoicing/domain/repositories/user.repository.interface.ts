import type { User } from "@distributed-systems/shared";

import type { Result } from "#shared/core/result";

import type { UserWorkerPersistenceError } from "../errors/user.errors";

export interface IUserRepository {
  findById(id: number): Promise<Result<User, UserWorkerPersistenceError>>;
}

import type { UserData } from "@distributed-systems/shared";

import type { Result } from "#shared/core/result";
import type { DuplicateEmailError, UserPersistenceError } from "#users/domain/errors/user.errors";

export type { UserData };

export interface IUserRepository {
  save(user: UserData): Promise<Result<{ id: number }, DuplicateEmailError | UserPersistenceError>>;
}

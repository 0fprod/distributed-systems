import type { User } from "@distributed-systems/shared";

import type { Result } from "#shared/core/result";
import type { DuplicateEmailError, UserPersistenceError } from "#users/domain/errors/user.errors";

export interface IUserRepository {
  save(user: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<Result<{ id: number }, DuplicateEmailError | UserPersistenceError>>;
  findByEmail(email: string): Promise<User | null>;
}

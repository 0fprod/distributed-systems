import type { Result } from "#shared/core/result";
import type {
  DuplicateEmailError,
  UserNotFoundError,
  UserPersistenceError,
} from "#users/domain/errors/user.errors";
import type { BackendUser } from "#users/domain/user";

export interface IUserRepository {
  save(user: BackendUser): Promise<Result<void, DuplicateEmailError | UserPersistenceError>>;
  findByEmail(
    email: string,
  ): Promise<Result<BackendUser, UserNotFoundError | UserPersistenceError>>;
}

import type { UserData } from "@distributed-systems/shared";

import type { Result } from "#shared/core/result";
import type { DuplicateEmailError, UserPersistenceError } from "#users/domain/errors/user.errors";

export type { UserData };

// Minimal projection returned by findByEmail — only the fields the login
// use-case needs. Keeping this narrow avoids leaking full user state into
// the application layer.
export interface UserCredentials {
  id: number;
  email: string;
  passwordHash: string;
}

export interface IUserRepository {
  save(user: UserData): Promise<Result<{ id: number }, DuplicateEmailError | UserPersistenceError>>;
  findByEmail(email: string): Promise<UserCredentials | null>;
}

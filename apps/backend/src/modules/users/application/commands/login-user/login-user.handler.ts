import bcrypt from "bcryptjs";

import { type Result, err, ok } from "#shared/core/result";
import {
  InvalidCredentialsError,
  type UserPersistenceError,
} from "#users/domain/errors/user.errors";
import type { IUserRepository } from "#users/domain/repositories/user.repository.interface";

import type { LoginUserCommand } from "./login-user.command";

interface Deps {
  userRepository: IUserRepository;
}

export async function loginUserHandler(
  command: LoginUserCommand,
  deps: Deps,
): Promise<Result<{ id: string; email: string }, InvalidCredentialsError | UserPersistenceError>> {
  const findResult = await deps.userRepository.findByEmail(command.email);

  if (!findResult.ok) {
    // UserNotFoundError → map to InvalidCredentialsError so we don't leak user existence.
    // UserPersistenceError → propagate as-is.
    if (findResult.error.type === "not_found") {
      return err(new InvalidCredentialsError());
    }
    return err(findResult.error);
  }

  const user = findResult.value;
  const isValid = await bcrypt.compare(command.password, user.passwordHash);

  if (!isValid) {
    return err(new InvalidCredentialsError());
  }

  return ok({ id: user.id.value, email: user.email });
}

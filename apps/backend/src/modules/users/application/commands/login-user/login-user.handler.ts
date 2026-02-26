import bcrypt from "bcryptjs";

import { type Result, err, ok } from "#shared/core/result";
import { InvalidCredentialsError } from "#users/domain/errors/user.errors";
import type { IUserRepository } from "#users/domain/repositories/user.repository.interface";

import type { LoginUserCommand } from "./login-user.command";

interface Deps {
  userRepository: IUserRepository;
}

// Returns the same InvalidCredentialsError whether the user does not exist or
// the password is wrong. This is intentional — it prevents user enumeration
// attacks where an attacker could distinguish missing accounts from wrong passwords.
export async function loginUserHandler(
  command: LoginUserCommand,
  deps: Deps,
): Promise<Result<{ id: number; email: string }, InvalidCredentialsError>> {
  const user = await deps.userRepository.findByEmail(command.email);

  if (!user) {
    return err(new InvalidCredentialsError());
  }

  const isValid = await bcrypt.compare(command.password, user.passwordHash);

  if (!isValid) {
    return err(new InvalidCredentialsError());
  }

  return ok({ id: user.id, email: user.email });
}

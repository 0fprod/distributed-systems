import { Guid } from "@distributed-systems/shared";

import { type Result, err, ok } from "#shared/core/result";
import type {
  DuplicateEmailError,
  UserPersistenceError,
  WeakPasswordError,
} from "#users/domain/errors/user.errors";
import type { IUserRepository } from "#users/domain/repositories/user.repository.interface";
import { BackendUser } from "#users/domain/user";
import { Password } from "#users/domain/value-objects/password.vo";

import type { RegisterUserCommand } from "./register-user.command";

type RegisterUserError = WeakPasswordError | DuplicateEmailError | UserPersistenceError;

interface Deps {
  userRepository: IUserRepository;
}

export async function registerUserHandler(
  command: RegisterUserCommand,
  deps: Deps,
): Promise<Result<{ id: string }, RegisterUserError>> {
  const passwordResult = await Password.create(command.password);
  if (!passwordResult.ok) {
    return err(passwordResult.error);
  }

  const user = BackendUser.create({
    id: Guid.create(),
    name: command.name,
    email: command.email,
    passwordHash: passwordResult.value.value,
  });

  const saveResult = await deps.userRepository.save(user);
  if (!saveResult.ok) {
    return err(saveResult.error);
  }

  return ok({ id: user.id.value }); // Guid → string for HTTP response
}

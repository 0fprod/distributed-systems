export class WeakPasswordError {
  readonly type = "weak_password" as const;
  readonly message = "Password must be at least 6 characters long";
}

export class DuplicateEmailError {
  readonly type = "duplicate_email" as const;
  constructor(readonly message: string) {}
}

export class UserPersistenceError {
  readonly type = "persistence_error" as const;
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

export class UserNotFoundError {
  readonly type = "not_found" as const;
  constructor(readonly message: string) {}
}

export class InvalidCredentialsError {
  readonly type = "invalid_credentials" as const;
  readonly message = "Invalid email or password";
}

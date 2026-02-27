export class WeakPasswordError extends Error {
  constructor() {
    super("Password must be at least 6 characters long");
    this.name = "WeakPasswordError";
  }
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`A user with email "${email}" already exists`);
    this.name = "DuplicateEmailError";
  }
}

export class UserPersistenceError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "UserPersistenceError";
    this.cause = cause;
  }
}

export class UserNotFoundError extends Error {
  constructor(email: string) {
    super(`No user found with email "${email}"`);
    this.name = "UserNotFoundError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

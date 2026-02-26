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

// Used when login credentials are invalid. The same error is returned whether
// the email does not exist or the password is wrong — this prevents user
// enumeration attacks (callers cannot distinguish between the two cases).
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

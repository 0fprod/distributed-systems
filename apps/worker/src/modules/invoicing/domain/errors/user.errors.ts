export class UserWorkerPersistenceError {
  readonly type = "persistence_error" as const;
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

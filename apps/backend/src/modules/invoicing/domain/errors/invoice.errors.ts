export class InvoicePersistenceError {
  readonly type = "persistence_error" as const;
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

export class InvoiceNotFoundError {
  readonly type = "not_found" as const;
  constructor(readonly message: string) {}
}

export class InvoiceInvalidStatusError {
  readonly type = "invalid_status" as const;
  constructor(readonly message: string) {}
}

export class InvoiceForbiddenError {
  readonly type = "forbidden" as const;
  constructor(readonly message: string) {}
}

export class InvoicePersistenceError extends Error {
  readonly kind = "InvoicePersistenceError" as const;

  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "InvoicePersistenceError";
  }
}

export class InvoiceNotFoundError extends Error {
  readonly kind = "InvoiceNotFoundError" as const;

  constructor(message: string) {
    super(message);
    this.name = "InvoiceNotFoundError";
  }
}

export class InvoiceInvalidStatusError extends Error {
  readonly kind = "InvoiceInvalidStatusError" as const;

  constructor(message: string) {
    super(message);
    this.name = "InvoiceInvalidStatusError";
  }
}

export class InvoiceForbiddenError extends Error {
  readonly kind = "InvoiceForbiddenError" as const;

  constructor(message: string) {
    super(message);
    this.name = "InvoiceForbiddenError";
  }
}

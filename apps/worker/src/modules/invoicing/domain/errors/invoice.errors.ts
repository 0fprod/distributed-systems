// Domain-layer errors for the Invoicing bounded context.
// These are value objects — no business logic, just typed error carriers.
// Infrastructure layers (Prisma, RabbitMQ) translate their own errors into these
// before crossing into the domain/application layer, preserving persistence ignorance.

export class InvoiceWorkerPersistenceError extends Error {
  readonly kind = "InvoiceWorkerPersistenceError" as const;

  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "InvoiceWorkerPersistenceError";
  }
}

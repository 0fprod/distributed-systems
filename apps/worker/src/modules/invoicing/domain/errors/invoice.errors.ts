// Domain-layer errors for the Invoicing bounded context.
// These are value objects — no business logic, just typed error carriers.
// Infrastructure layers (Prisma, RabbitMQ) translate their own errors into these
// before crossing into the domain/application layer, preserving persistence ignorance.

export class InvoiceWorkerPersistenceError {
  readonly type = "persistence_error" as const;
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

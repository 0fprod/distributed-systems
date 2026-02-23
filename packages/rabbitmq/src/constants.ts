// Channel IDs — keys for the internal Map<string, Channel> in connection.ts.
// Using constants prevents typos when calling getConsumerChannel(id).
export const ConsumerChannels = {
  INVOICES_CREATED: "consumer:invoices.created",
  INVOICES_INPROGRESS: "consumer:invoices.inprogress",
  INVOICES_COMPLETED: "consumer:invoices.completed",
} as const;

// RabbitMQ queue names — durable named queues used by work-queue consumers.
export const QueueNames = {
  WORKER_INVOICES_CREATED: "worker.invoices.created",
  DEAD_LETTER: "invoices.dead-letter",
} as const;

// RabbitMQ exchange names for infrastructure exchanges (DLX etc.)
export const ExchangeNames = {
  DEAD_LETTER: "invoices.dlx",
} as const;

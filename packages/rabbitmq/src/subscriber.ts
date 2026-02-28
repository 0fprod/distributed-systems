import { createLogger } from "@distributed-systems/logger";

import { getConsumerChannel } from "./connection";
import { ExchangeNames, QueueNames } from "./constants";

const logger = createLogger("rabbitmq");

export interface SubscribeOptions {
  // prefetch limits how many unacknowledged messages the broker delivers to
  // this channel at once. Set to 1 for worker processes that must process
  // one message at a time (work-queue semantics). Leave undefined for
  // broadcast consumers where every message should arrive immediately.
  prefetch?: number;
}

// subscribe binds an exclusive, auto-delete queue to a fanout exchange and
// calls `handler` for every message received.
// Using an exclusive queue means each process instance gets its own copy
// of every message — correct for WS broadcast scenarios.
// Each subscription gets its own isolated channel (keyed by exchange name)
// so a channel error in one consumer does not disrupt others.
export async function subscribe(
  exchange: string,
  handler: (message: unknown) => Promise<void>,
  options: SubscribeOptions = {},
): Promise<void> {
  // The exchange name is a natural unique key per subscription.
  const channel = await getConsumerChannel(exchange);

  if (options.prefetch !== undefined) {
    await channel.prefetch(options.prefetch);
  }

  await channel.assertExchange(exchange, "fanout", { durable: true });

  // Name: "<exchange>.consumer.<8-char uuid>" — readable in the RabbitMQ UI while
  // still unique per connection. exclusive + autoDelete ensures it disappears
  // when the connection closes (correct for broadcast/WS scenarios).
  const queueName = `${exchange}.consumer.${crypto.randomUUID().slice(0, 8)}`;
  const { queue } = await channel.assertQueue(queueName, { exclusive: true, autoDelete: true });

  await channel.bindQueue(queue, exchange, "");

  // The callback is intentionally non-async. Returning undefined immediately
  // allows amqplib to deliver the next message without waiting for the handler.
  // ack/nack are managed asynchronously when the handler promise settles.
  await channel.consume(queue, (msg) => {
    if (!msg) return;
    const payload = JSON.parse(msg.content.toString()) as unknown;
    handler(payload)
      .then(() => channel.ack(msg))
      .catch((err) => {
        logger.error({ err, exchange }, "fanout handler error");
        // Reject without requeue to avoid poison-pill loops.
        channel.nack(msg, false, false);
      });
  });

  logger.info({ exchange, queue }, "subscribed to fanout exchange");
}

export interface SubscribeWorkOptions {
  prefetch?: number; // default: 10 — allows up to 10 concurrent in-flight messages per channel
}

// subscribeWork binds a named durable queue to a fanout exchange and sets up
// a dead-letter queue for failed messages.
// Multiple instances calling subscribeWork() with the same queueName bind to
// the SAME queue — RabbitMQ round-robins messages across them (competing
// consumers). Messages persist in the durable queue even when all workers are
// offline. Failed messages (nack without requeue) are routed to the DLQ for
// manual inspection and replay via the RabbitMQ management UI (port 15672).
// Contrast with subscribe() which uses exclusive + autoDelete queues — correct
// for broadcast scenarios where every consumer must receive every message.
export async function subscribeWork(
  exchange: string,
  queueName: string,
  handler: (message: unknown) => Promise<void>,
  options: SubscribeWorkOptions = {},
): Promise<void> {
  const channel = await getConsumerChannel(exchange);
  const prefetch = options.prefetch ?? 10;
  await channel.prefetch(prefetch);

  // Fanout exchange — same type as publish() uses, so assertExchange is idempotent.
  await channel.assertExchange(exchange, "fanout", { durable: true });

  // Dead-letter infrastructure: assert DLX exchange + DLQ queue.
  await channel.assertExchange(ExchangeNames.DEAD_LETTER, "direct", { durable: true });
  await channel.assertQueue(QueueNames.DEAD_LETTER, { durable: true });
  await channel.bindQueue(QueueNames.DEAD_LETTER, ExchangeNames.DEAD_LETTER, "");

  // Named durable queue: survives broker restarts, shared across worker instances.
  await channel.assertQueue(queueName, {
    durable: true,
    arguments: { "x-dead-letter-exchange": ExchangeNames.DEAD_LETTER },
  });

  await channel.bindQueue(queueName, exchange, "");

  // The callback is intentionally non-async. Returning undefined immediately
  // allows amqplib to deliver the next message without waiting for the previous
  // one to complete. With prefetch=10, up to 10 messages are processed in
  // parallel — each settles its own ack/nack independently.
  await channel.consume(queueName, (msg) => {
    if (!msg) return;
    const payload = JSON.parse(msg.content.toString()) as unknown;
    handler(payload)
      .then(() => channel.ack(msg))
      .catch((err) => {
        logger.error({ err, queue: queueName }, "work handler error");
        // nack without requeue — message goes to DLQ instead of being lost or looping.
        channel.nack(msg, false, false);
      });
  });

  logger.info({ queue: queueName, exchange, prefetch }, "work-queue consumer started");
}

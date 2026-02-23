import { getConsumerChannel } from "./connection";
import { ExchangeNames, QueueNames } from "./constants";

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

  // exclusive + autoDelete: queue lives only for the lifetime of this connection.
  const { queue } = await channel.assertQueue("", { exclusive: true, autoDelete: true });

  await channel.bindQueue(queue, exchange, "");

  await channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString()) as unknown;
      await handler(payload);
      channel.ack(msg);
    } catch (err) {
      console.error(`[rabbitmq] handler error on exchange "${exchange}"`, err);
      // Reject without requeue to avoid poison-pill loops.
      channel.nack(msg, false, false);
    }
  });

  console.log(`[rabbitmq] subscribed to "${exchange}" via queue "${queue}"`);
}

export interface SubscribeWorkOptions {
  prefetch?: number; // default: 1
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
  const prefetch = options.prefetch ?? 1;
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

  await channel.consume(queueName, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString()) as unknown;
      await handler(payload);
      channel.ack(msg);
    } catch (err) {
      console.error(`[rabbitmq] work handler error on queue "${queueName}"`, err);
      // nack without requeue — message goes to DLQ instead of being lost or looping.
      channel.nack(msg, false, false);
    }
  });

  console.log(`[rabbitmq] work-queue consumer on "${queueName}" bound to "${exchange}"`);
}

import { getConsumerChannel } from "./connection";

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

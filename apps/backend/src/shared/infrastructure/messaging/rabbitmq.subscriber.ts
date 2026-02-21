import { getRabbitMQChannel } from "./rabbitmq.connection";

// subscribe binds an exclusive, auto-delete queue to a fanout exchange and
// calls `handler` for every message received.
// Using an exclusive queue means each backend instance gets its own copy
// of every message — correct for WS broadcast scenarios.
export async function subscribe(
  exchange: string,
  handler: (message: unknown) => Promise<void>,
): Promise<void> {
  const channel = await getRabbitMQChannel();

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

  console.log(`[rabbitmq] subscribed to exchange "${exchange}" via queue "${queue}"`);
}

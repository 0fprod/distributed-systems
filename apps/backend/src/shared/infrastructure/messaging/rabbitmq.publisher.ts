import type { IMessagePublisher } from "#modules/invoicing/application/ports/message-publisher.port";

import { getRabbitMQChannel } from "./rabbitmq.connection";

// Concrete implementation of IMessagePublisher using amqplib fanout exchanges.
// Fanout exchange: every bound queue receives the message — perfect for
// decoupled pub/sub where the publisher does not know consumer topology.
export const rabbitMQPublisher: IMessagePublisher = {
  async publish(exchange: string, message: unknown): Promise<void> {
    const channel = await getRabbitMQChannel();

    // Declare idempotently: safe to call even if exchange already exists.
    await channel.assertExchange(exchange, "fanout", { durable: true });

    const payload = Buffer.from(JSON.stringify(message));
    // routingKey is empty for fanout — exchange ignores it.
    channel.publish(exchange, "", payload, { persistent: true });
  },
};

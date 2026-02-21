import { getRabbitMQChannel } from "#shared/infrastructure/messaging/rabbitmq.connection";

import type { IMessagePublisher } from "../../application/ports/message-publisher.port";

// Concrete adapter: publishes messages to a RabbitMQ fanout exchange.
// Fanout semantics: all bound queues receive every message, regardless of routing key.
export const invoicePublisher: IMessagePublisher = {
  async publish(exchange: string, message: unknown): Promise<void> {
    const channel = await getRabbitMQChannel();

    await channel.assertExchange(exchange, "fanout", { durable: true });

    const payload = Buffer.from(JSON.stringify(message));
    channel.publish(exchange, "", payload, { persistent: true });
  },
};

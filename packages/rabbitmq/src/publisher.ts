import { context, propagation } from "@opentelemetry/api";

import { getPublisherChannel } from "./connection";

// Publishes a message to a fanout exchange.
// Fanout exchange: every bound queue receives the message — correct for
// decoupled pub/sub where the publisher does not know consumer topology.
// IMessagePublisher is intentionally NOT imported here: that interface lives
// in each app's application/ports layer. This file is a pure infrastructure primitive.
export async function publish(exchange: string, message: unknown): Promise<void> {
  const channel = await getPublisherChannel();

  // Declare idempotently: safe to call even if exchange already exists.
  await channel.assertExchange(exchange, "fanout", { durable: true });

  // Inject the active W3C trace context (traceparent / tracestate) into the
  // message headers so the consumer can extract it and link its span to this
  // one. When no OTel SDK is initialised (tests, local dev without Jaeger)
  // propagation.inject is a no-op and headers stays empty.
  const headers: Record<string, string> = {};
  propagation.inject(context.active(), headers);

  const payload = Buffer.from(JSON.stringify(message));
  // routingKey is empty for fanout — the exchange ignores it.
  channel.publish(exchange, "", payload, { persistent: true, headers });
}

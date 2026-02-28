import amqplib from "amqplib";

// Retry with exponential backoff — RabbitMQ may not accept AMQP connections
// immediately after its healthcheck passes (management API starts before AMQP listener).
async function connectWithRetry(
  url: string,
  label: string,
  attempts = 8,
  delayMs = 1000,
): Promise<amqplib.ChannelModel> {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await amqplib.connect(url);
    } catch (err) {
      if (i === attempts) throw err;
      console.warn(
        `[rabbitmq:${label}] attempt ${i}/${attempts} failed, retrying in ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 10000);
    }
  }
  throw new Error(`[rabbitmq:${label}] unreachable`);
}

// --- Publisher connection ---
// A dedicated connection for all outgoing messages.
// Isolation from the consumer connection is a RabbitMQ best practice:
// a consumer channel error cannot stall the publisher and vice versa.
let publisherConn: amqplib.ChannelModel | null = null;
let publisherChannel: amqplib.Channel | null = null;

export async function getPublisherChannel(): Promise<amqplib.Channel> {
  if (publisherChannel) return publisherChannel;

  const url = process.env.RABBITMQ_URL ?? "amqp://localhost";
  publisherConn = await connectWithRetry(url, "publisher");
  const ch = await publisherConn.createChannel();
  publisherChannel = ch;

  publisherConn.on("error", (err) => {
    console.error("[rabbitmq:publisher] connection error", err);
    publisherChannel = null;
    publisherConn = null;
  });
  publisherConn.on("close", () => {
    console.warn("[rabbitmq:publisher] connection closed");
    publisherChannel = null;
    publisherConn = null;
  });

  return ch;
}

// --- Consumer connection ---
// A dedicated connection shared by all consumer channels.
// Each consumer gets its own channel (keyed by a string ID) so that
// a channel error only affects that specific consumer, not the others.
let consumerConn: amqplib.ChannelModel | null = null;
const consumerChannels = new Map<string, amqplib.Channel>();

async function getConsumerConnection(): Promise<amqplib.ChannelModel> {
  if (consumerConn) return consumerConn;

  const url = process.env.RABBITMQ_URL ?? "amqp://localhost";
  consumerConn = await connectWithRetry(url, "consumer");

  consumerConn.on("error", (err) => {
    console.error("[rabbitmq:consumer] connection error", err);
    consumerConn = null;
    consumerChannels.clear();
  });
  consumerConn.on("close", () => {
    console.warn("[rabbitmq:consumer] connection closed");
    consumerConn = null;
    consumerChannels.clear();
  });

  return consumerConn;
}

// Returns true when both the publisher and consumer connections are open.
// Used by health check endpoints to report RabbitMQ connectivity status.
export function isRabbitMQHealthy(): boolean {
  return publisherConn !== null && consumerConn !== null;
}

export async function getConsumerChannel(id: string): Promise<amqplib.Channel> {
  if (consumerChannels.has(id)) return consumerChannels.get(id)!;

  const conn = await getConsumerConnection();
  const ch = await conn.createChannel();

  // Remove only this channel from the map on error; the connection stays open
  // so the remaining consumers continue unaffected.
  ch.on("error", (err) => {
    console.error(`[rabbitmq:consumer:${id}] channel error`, err);
    consumerChannels.delete(id);
  });

  consumerChannels.set(id, ch);
  return ch;
}

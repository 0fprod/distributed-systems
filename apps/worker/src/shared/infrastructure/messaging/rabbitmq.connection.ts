import amqplib from "amqplib";

// Singleton pattern — same rationale as the backend: connections are expensive,
// channels are cheap. The worker reuses the same channel for all operations.
let channel: amqplib.Channel | null = null;

// Retry with exponential backoff — RabbitMQ may not accept AMQP connections
// immediately after its healthcheck passes (management API starts before AMQP listener).
async function connectWithRetry(
  url: string,
  attempts = 8,
  delayMs = 1000,
): Promise<amqplib.ChannelModel> {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await amqplib.connect(url);
    } catch (err) {
      if (i === attempts) throw err;
      console.warn(
        `[rabbitmq] connection attempt ${i}/${attempts} failed, retrying in ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 10000);
    }
  }
  throw new Error("[rabbitmq] unreachable");
}

export async function getRabbitMQChannel(): Promise<amqplib.Channel> {
  if (channel) return channel;

  const url = process.env.RABBITMQ_URL ?? "amqp://localhost";
  const connection = await connectWithRetry(url);
  const ch = await connection.createChannel();
  channel = ch;

  connection.on("error", (err) => {
    console.error("[rabbitmq] connection error", err);
    channel = null;
  });
  connection.on("close", () => {
    console.warn("[rabbitmq] connection closed");
    channel = null;
  });

  return ch;
}

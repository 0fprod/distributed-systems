import amqplib from "amqplib";

// Singleton pattern — same rationale as the backend: connections are expensive,
// channels are cheap. The worker reuses the same channel for all operations.
let channel: amqplib.Channel | null = null;

export async function getRabbitMQChannel(): Promise<amqplib.Channel> {
  if (channel) return channel;

  const url = process.env.RABBITMQ_URL ?? "amqp://localhost";
  const connection = await amqplib.connect(url);
  channel = await connection.createChannel();

  connection.on("error", (err) => {
    console.error("[rabbitmq] connection error", err);
    channel = null;
  });
  connection.on("close", () => {
    console.warn("[rabbitmq] connection closed");
    channel = null;
  });

  return channel;
}

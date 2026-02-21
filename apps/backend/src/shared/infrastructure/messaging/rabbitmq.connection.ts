import amqplib from "amqplib";

// Singleton channel: one connection + one channel reused across the whole process.
// RabbitMQ connections are expensive (TCP + TLS handshake); channels are cheap.
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

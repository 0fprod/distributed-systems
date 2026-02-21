// Application-layer port: defines how the application publishes messages
// to the outside world without knowing the concrete transport (RabbitMQ, SNS, etc.).
// The infrastructure layer provides the adapter that implements this interface.
export interface IMessagePublisher {
  publish(exchange: string, message: unknown): Promise<void>;
}

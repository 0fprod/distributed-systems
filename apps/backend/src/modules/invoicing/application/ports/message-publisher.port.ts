export interface IMessagePublisher {
  publish(exchange: string, payload: unknown): Promise<void>;
}

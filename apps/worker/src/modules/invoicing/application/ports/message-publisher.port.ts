// Application-layer port for outbound messaging — mirrors the backend's port.
// Keeping this local to the worker (rather than sharing it from a common package)
// respects bounded context autonomy: each app owns its own interfaces.
export interface IMessagePublisher {
  publish(exchange: string, message: unknown): Promise<void>;
}

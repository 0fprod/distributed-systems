import { publish } from "@distributed-systems/rabbitmq";

import type { IMessagePublisher } from "../../application/ports/message-publisher.port";

// Thin local adapter: satisfies the IMessagePublisher port defined in the
// worker's application layer while delegating the actual transport to the
// shared @distributed-systems/rabbitmq package.
// The port (interface) remains local to the worker — bounded context autonomy.
export const invoicePublisher: IMessagePublisher = { publish };

// UserDTO is the public transport shape for User data (HTTP responses, frontend).
// It deliberately excludes passwordHash — that field is an infrastructure detail
// used only by the backend's own domain layer (BackendUser).
export interface UserDTO {
  id: string;
  name: string;
  email: string;
}

export const InvoiceStatus = {
  PENDING: "pending",
  INPROGRESS: "inprogress",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

// InvoiceDTO is the public transport shape for Invoice data.
// IDs are UUIDs (string) to match the Prisma schema and avoid leaking
// auto-increment sequences. Both id and userId are strings.
export interface InvoiceDTO {
  id: string;
  // userId links every invoice to its owner; required for ownership enforcement.
  userId: string;
  name: string;
  amount: number;
  status: InvoiceStatus;
}

export const ApiRoutes = {
  HEALTH: "/health",
  INVOICES: "/invoices",
  REGISTER: "/register",
  LOGIN: "/login",
  LOGOUT: "/logout",
  ME: "/me",
  WS: "/ws",
} as const;

export const InvoiceExchanges = {
  CREATED: "invoices.created",
  INPROGRESS: "invoices.inprogress",
  COMPLETED: "invoices.completed",
  FAILED: "invoices.failed",
} as const;

// Payload shape for all RabbitMQ invoice messages.
// requestId is optional to remain compatible with legacy messages that
// were published before correlation IDs were introduced.
export interface InvoiceMessagePayload {
  invoiceId: string;
  userId: string;
  requestId?: string;
}

export const InvoiceEvents = {
  INPROGRESS: "invoice:inprogress",
  COMPLETED: "invoice:completed",
  FAILED: "invoice:failed",
} as const;

export { Guid } from "./value-objects/guid";
export { processFakeInvoice, sleep } from "./utils";

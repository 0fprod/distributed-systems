export interface UserData {
  name: string;
  email: string;
  passwordHash: string;
}

export const InvoiceStatus = {
  PENDING: "pending",
  INPROGRESS: "inprogress",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export interface Invoice {
  id: number;
  name: string;
  amount: number;
  status: InvoiceStatus;
}

export const ApiRoutes = {
  HEALTH: "/health",
  INVOICES: "/invoices",
  REGISTER: "/register",
  WS: "/ws",
} as const;

export const InvoiceExchanges = {
  CREATED: "invoices.created",
  INPROGRESS: "invoices.inprogress",
  COMPLETED: "invoices.completed",
  FAILED: "invoices.failed",
} as const;

export const InvoiceEvents = {
  INPROGRESS: "invoice:inprogress",
  COMPLETED: "invoice:completed",
  FAILED: "invoice:failed",
} as const;

export { processFakeInvoice, sleep } from "./utils";

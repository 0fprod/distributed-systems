export function greet(name: string): string {
  return `Hello from ${name}!`;
}

export type AppName = "frontend" | "backend" | "worker";

export const InvoiceStatus = {
  PENDING: "pending",
  INPROGRESS: "inprogress",
  COMPLETED: "completed",
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export interface Invoice {
  id: number;
  name: string;
  amount: number;
  status: InvoiceStatus;
}

export const ApiRoutes = {
  INVOICES: "/invoices",
  WS: "/ws",
} as const;

export const InvoiceExchanges = {
  CREATED: "invoices.created",
  COMPLETED: "invoices.completed",
} as const;

export const InvoiceEvents = {
  COMPLETED: "invoice:completed",
} as const;

export { processFakeInvoice, sleep } from "./utils";

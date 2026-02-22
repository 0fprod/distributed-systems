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
  INPROGRESS: "invoices.inprogress",
  COMPLETED: "invoices.completed",
} as const;

export const InvoiceEvents = {
  INPROGRESS: "invoice:inprogress",
  COMPLETED: "invoice:completed",
} as const;

export { processFakeInvoice, sleep } from "./utils";

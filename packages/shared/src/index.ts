export function greet(name: string): string {
  return `Hello from ${name}!`;
}

export type AppName = "frontend" | "backend" | "worker";

export type InvoiceStatus = "inprogress" | "completed";

export interface Invoice {
  id: number;
  name: string;
  amount: number;
  status: InvoiceStatus;
}

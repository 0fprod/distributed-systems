import type { InvoiceStatus } from "@distributed-systems/shared";

export interface WorkerInvoice {
  id: string;
  userId: string;
  name: string;
  amount: number;
  status: InvoiceStatus;
}

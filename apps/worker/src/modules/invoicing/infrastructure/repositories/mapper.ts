import type { WorkerInvoice } from "#invoicing/domain/worker-invoice";

export function toWorkerInvoice(raw: {
  id: string;
  userId: string;
  name: string;
  amount: number;
  status: string;
}): WorkerInvoice {
  return {
    id: raw.id,
    userId: raw.userId,
    name: raw.name,
    amount: raw.amount,
    status: raw.status as WorkerInvoice["status"],
  };
}

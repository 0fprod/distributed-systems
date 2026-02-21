import { useSuspenseQuery } from "@tanstack/react-query";

import { InvoiceStatus } from "@distributed-systems/shared";
import type { Invoice } from "@distributed-systems/shared";

const MOCK_INVOICES: Invoice[] = [
  { id: 1, name: "Acme Corp", amount: 1200, status: InvoiceStatus.COMPLETED },
  { id: 2, name: "Globex Inc", amount: 450, status: InvoiceStatus.INPROGRESS },
  { id: 3, name: "Initech Ltd", amount: 3000, status: InvoiceStatus.COMPLETED },
  { id: 4, name: "Umbrella Co", amount: 750, status: InvoiceStatus.INPROGRESS },
  { id: 5, name: "Stark Industries", amount: 9800, status: InvoiceStatus.PENDING },
];

export async function fetchInvoices(): Promise<Invoice[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return MOCK_INVOICES;
}

export function useInvoices() {
  return useSuspenseQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: fetchInvoices,
  });
}

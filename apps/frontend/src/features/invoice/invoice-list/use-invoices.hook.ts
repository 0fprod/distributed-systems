import { useSuspenseQuery } from "@tanstack/react-query";

import type { Invoice } from "@distributed-systems/shared";

const MOCK_INVOICES: Invoice[] = [
  { id: 1, name: "Acme Corp", amount: 1200, status: "completed" },
  { id: 2, name: "Globex Inc", amount: 450, status: "inprogress" },
  { id: 3, name: "Initech Ltd", amount: 3000, status: "completed" },
  { id: 4, name: "Umbrella Co", amount: 750, status: "inprogress" },
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

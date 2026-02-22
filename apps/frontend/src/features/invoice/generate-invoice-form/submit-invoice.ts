import { ApiRoutes } from "@distributed-systems/shared";

interface InvoiceFormData {
  name: string;
  amount: string;
}

export async function submitInvoice(data: InvoiceFormData): Promise<void> {
  const response = await fetch(ApiRoutes.INVOICES, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: data.name, amount: Number(data.amount) }),
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
}

import { request } from "#shared/request";

export async function deleteInvoice(id: string): Promise<void> {
  const response = await request(`/invoices/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete invoice");
}

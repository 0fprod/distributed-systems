interface InvoiceFormData {
  name: string;
  amount: string;
}

export async function submitInvoice(data: InvoiceFormData): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log("Invoice submitted:", data);
}

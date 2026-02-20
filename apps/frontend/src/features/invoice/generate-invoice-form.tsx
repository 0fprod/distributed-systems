import { useState } from "react";

interface InvoiceFormData {
  name: string;
  amount: string;
}

async function submitInvoice(data: InvoiceFormData): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log("Invoice submitted:", data);
}

export function GenerateInvoiceForm() {
  const [form, setForm] = useState<InvoiceFormData>({ name: "", amount: "" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitInvoice(form);
    setForm({ name: "", amount: "" });
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Generate Invoice</h2>
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>
      <div>
        <label htmlFor="amount">Amount</label>
        <input
          id="amount"
          type="number"
          value={form.amount}
          onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
          required
        />
      </div>
      <button type="submit">Generate Invoice</button>
    </form>
  );
}

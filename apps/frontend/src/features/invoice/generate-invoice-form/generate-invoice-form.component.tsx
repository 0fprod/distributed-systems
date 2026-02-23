import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { QueryKeys } from "#shared/query-keys";

import { submitInvoice } from "./submit-invoice";

interface InvoiceFormData {
  name: string;
  amount: string;
}

const INVALID_INVOICE_PAYLOAD = { name: "", amount: -1 };

export function GenerateInvoiceForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<InvoiceFormData>({ name: "", amount: "" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitInvoice(form);
    await queryClient.invalidateQueries({ queryKey: QueryKeys.invoices });
    setForm({ name: "", amount: "" });
  }

  async function handleGenerateInvalidInvoice() {
    await fetch("/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(INVALID_INVOICE_PAYLOAD),
    });
    await queryClient.invalidateQueries({ queryKey: QueryKeys.invoices });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-semibold text-gray-800">Generate Invoice</h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className="text-sm font-medium text-gray-700">
            Amount
          </label>
          <input
            id="amount"
            type="number"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Generate Invoice
        </button>
      </form>
      <button
        type="button"
        onClick={handleGenerateInvalidInvoice}
        className="w-full rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        Generate Invalid Invoice (DLQ Test)
      </button>
    </div>
  );
}

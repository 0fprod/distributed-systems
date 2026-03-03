import { useState } from "react";

import type { InvoiceDTO } from "@distributed-systems/shared";

import { useInvoiceMutations } from "#features/invoice/invoice.repository";

interface Props {
  invoice: InvoiceDTO;
  onClose: () => void;
}

export function EditInvoiceModal({ invoice, onClose }: Props) {
  const { update } = useInvoiceMutations();
  const [name, setName] = useState(invoice.name);
  const [amount, setAmount] = useState(String(invoice.amount));

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    await update.mutateAsync({ id: invoice.id, name, amount: Number(amount) });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[400px] rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">Edit &amp; Retry Invoice</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="edit-name" className="text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="edit-amount" className="text-sm font-medium text-gray-700">
              Amount
            </label>
            <input
              id="edit-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min={0}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={update.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {update.isPending ? "Retrying..." : "Retry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

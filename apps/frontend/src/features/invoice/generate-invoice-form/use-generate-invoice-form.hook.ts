import { useState } from "react";

import { useInvoiceMutations } from "#features/invoice/invoice.repository";

interface InvoiceFormData {
  name: string;
  amount: string;
}

export function useGenerateInvoiceForm() {
  const { create, createInvalid } = useInvoiceMutations();
  const [form, setForm] = useState<InvoiceFormData>({ name: "", amount: "" });

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    await create.mutateAsync({ name: form.name, amount: Number(form.amount) });
    setForm({ name: "", amount: "" });
  }

  async function handleGenerateInvalidInvoice() {
    await createInvalid.mutateAsync();
  }

  return { form, setForm, handleSubmit, handleGenerateInvalidInvoice };
}

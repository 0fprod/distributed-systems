import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ApiRoutes } from "@distributed-systems/shared";

import { request } from "#shared/request";

interface InvoiceFormData {
  name: string;
  amount: string;
}

export function useGenerateInvoiceForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<InvoiceFormData>({ name: "", amount: "" });

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const response = await request(ApiRoutes.INVOICES, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, amount: Number(form.amount) }),
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    await queryClient.invalidateQueries({ queryKey: ["invoices"] });
    setForm({ name: "", amount: "" });
  }

  async function handleGenerateInvalidInvoice() {
    await request(ApiRoutes.CREATE_INVALID_INVOICE, {
      method: "POST",
    });
    await queryClient.invalidateQueries({ queryKey: ["invoices"] });
  }

  return { form, setForm, handleSubmit, handleGenerateInvalidInvoice };
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { InvoicesPage } from "#pages/invoices/invoices.page";
import { RegisterPage } from "#pages/register/register.page";

const queryClient = new QueryClient();

type Page = "register" | "invoices";

export function App() {
  const [page, setPage] = useState<Page>("register");

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mx-auto max-w-3xl space-y-8 p-8">
        <h1 className="text-3xl font-bold text-gray-900">Distributed Systems Demo</h1>
        {page === "register" ? (
          <RegisterPage onRegistered={() => setPage("invoices")} />
        ) : (
          <InvoicesPage />
        )}
      </div>
    </QueryClientProvider>
  );
}

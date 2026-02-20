import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, mock, test } from "bun:test";

import type { Invoice } from "@distributed-systems/shared";

import { InvoiceListFeature } from "./invoice-list.feature";

mock.module("./use-invoices.hook", () => ({
  fetchInvoices: mock(() => Promise.resolve([])),
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

test("renders skeleton while data loads", async () => {
  const { fetchInvoices } = await import("./use-invoices.hook");
  (fetchInvoices as ReturnType<typeof mock>).mockImplementation(() => new Promise(() => {}));

  const client = makeClient();
  render(<InvoiceListFeature />, { wrapper: wrapper(client) });

  expect(screen.getByTestId("invoice-list-skeleton")).toBeDefined();
});

test("renders invoice rows when data resolves", async () => {
  const invoices: Invoice[] = [
    { id: 1, name: "Acme Corp", amount: 1200, status: "completed" },
    { id: 2, name: "Globex Inc", amount: 450, status: "inprogress" },
  ];

  const { fetchInvoices } = await import("./use-invoices.hook");
  (fetchInvoices as ReturnType<typeof mock>).mockImplementation(() => Promise.resolve(invoices));

  const client = makeClient();
  render(<InvoiceListFeature />, { wrapper: wrapper(client) });

  await waitFor(() => {
    expect(screen.getByText("Acme Corp")).toBeDefined();
    expect(screen.getByText("Globex Inc")).toBeDefined();
    expect(screen.getByText("completed")).toBeDefined();
    expect(screen.getByText("inprogress")).toBeDefined();
  });
});

test("renders empty state when list is empty", async () => {
  const { fetchInvoices } = await import("./use-invoices.hook");
  (fetchInvoices as ReturnType<typeof mock>).mockImplementation(() => Promise.resolve([]));

  const client = makeClient();
  render(<InvoiceListFeature />, { wrapper: wrapper(client) });

  await waitFor(() => {
    expect(screen.getByTestId("invoice-list-empty")).toBeDefined();
  });
});

test("renders error state with retry button when fetch fails", async () => {
  const { fetchInvoices } = await import("./use-invoices.hook");
  (fetchInvoices as ReturnType<typeof mock>).mockImplementation(() =>
    Promise.reject(new Error("Network error")),
  );

  const client = makeClient();
  render(<InvoiceListFeature />, { wrapper: wrapper(client) });

  await waitFor(() => {
    expect(screen.getByTestId("invoice-list-error")).toBeDefined();
    expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
  });

  const user = userEvent.setup();
  (fetchInvoices as ReturnType<typeof mock>).mockImplementation(() => Promise.resolve([]));
  await user.click(screen.getByRole("button", { name: /retry/i }));

  await waitFor(() => {
    expect(screen.getByTestId("invoice-list-empty")).toBeDefined();
  });
});

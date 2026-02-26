import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, mock, spyOn, test } from "bun:test";

import type { Invoice } from "@distributed-systems/shared";

import { httpError, httpOk } from "#test/http-helpers";
import { makeClient, makeWrapper } from "#test/query-helpers";
import { makeFakeWebSocket } from "#test/websocket-helpers";

import { InvoiceListFeature } from "./invoice-list.feature";

mock.module("#shared/websocket", () => ({
  createWebSocket: mock(() => makeFakeWebSocket()),
}));
const requestMock = mock();

mock.module("#shared/request", () => ({
  request: requestMock,
}));

beforeEach(() => {
  requestMock.mockReset();
});

test("renders skeleton while data loads", async () => {
  requestMock.mockImplementation(() => new Promise(() => {}));

  const client = makeClient();
  await act(async () => {
    render(<InvoiceListFeature />, { wrapper: makeWrapper(client) });
  });

  expect(screen.getByTestId("invoice-list-skeleton")).toBeDefined();
});

test("renders invoice rows when data resolves", async () => {
  const invoices: Invoice[] = [
    { id: 1, userId: 1, name: "Acme Corp", amount: 1200, status: "completed" },
    { id: 2, userId: 1, name: "Globex Inc", amount: 450, status: "inprogress" },
    { id: 3, userId: 1, name: "Stark Industries", amount: 9800, status: "pending" },
  ];

  requestMock.mockImplementation(() => httpOk(invoices));

  const client = makeClient();
  await act(async () => {
    render(<InvoiceListFeature />, { wrapper: makeWrapper(client) });
  });

  await waitFor(() => {
    expect(screen.getByText("Acme Corp")).toBeDefined();
    expect(screen.getByText("Globex Inc")).toBeDefined();
    expect(screen.getByText("Stark Industries")).toBeDefined();
    expect(screen.getByTestId("status-badge-completed")).toBeDefined();
    expect(screen.getByTestId("status-badge-inprogress")).toBeDefined();
    expect(screen.getByTestId("status-badge-pending")).toBeDefined();
  });
});

test("renders empty state when list is empty", async () => {
  requestMock.mockImplementation(() => httpOk([]));

  const client = makeClient();
  await act(async () => {
    render(<InvoiceListFeature />, { wrapper: makeWrapper(client) });
  });

  await waitFor(() => {
    expect(screen.getByTestId("invoice-list-empty")).toBeDefined();
  });
});

test("renders error state with retry button when fetch fails", async () => {
  spyOn(console, "error").mockImplementation(() => {});
  requestMock.mockImplementationOnce(() => httpError(500, "Network error"));

  const client = makeClient();
  await act(async () => {
    render(<InvoiceListFeature />, { wrapper: makeWrapper(client) });
  });

  await waitFor(() => {
    expect(screen.getByTestId("invoice-list-error")).toBeDefined();
    expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
  });

  const user = userEvent.setup();
  requestMock.mockImplementationOnce(() => httpOk([]));
  await user.click(screen.getByRole("button", { name: /retry/i }));

  await waitFor(() => {
    expect(screen.getByTestId("invoice-list-empty")).toBeDefined();
  });
});

test("shows Edit & Retry button for failed invoices", async () => {
  const invoices: Invoice[] = [
    { id: 1, userId: 1, name: "Acme Corp", amount: 1200, status: "completed" },
    { id: 2, userId: 1, name: "Wayne Enterprises", amount: 500, status: "failed" },
  ];

  requestMock.mockImplementation(() => httpOk(invoices));

  const client = makeClient();
  await act(async () => {
    render(<InvoiceListFeature />, { wrapper: makeWrapper(client) });
  });

  await waitFor(() => {
    expect(screen.getByText("Wayne Enterprises")).toBeDefined();
  });

  const editButtons = screen.getAllByRole("button", { name: /edit & retry/i });
  expect(editButtons.length).toBe(1);
});

test("clicking Edit & Retry opens the modal", async () => {
  const invoices: Invoice[] = [
    { id: 2, userId: 1, name: "Wayne Enterprises", amount: 500, status: "failed" },
  ];

  requestMock.mockImplementation(() => httpOk(invoices));

  const client = makeClient();
  await act(async () => {
    render(<InvoiceListFeature />, { wrapper: makeWrapper(client) });
  });

  await waitFor(() => {
    expect(screen.getByText("Wayne Enterprises")).toBeDefined();
  });

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /edit & retry/i }));

  await waitFor(() => {
    expect(screen.getByText("Edit & Retry Invoice")).toBeDefined();
  });
});

test("each invoice row renders a Delete button", async () => {
  const invoices: Invoice[] = [
    { id: 1, userId: 1, name: "Acme Corp", amount: 1200, status: "completed" },
    { id: 2, userId: 1, name: "Globex Inc", amount: 450, status: "inprogress" },
  ];

  requestMock.mockImplementation(() => httpOk(invoices));

  const client = makeClient();
  await act(async () => {
    render(<InvoiceListFeature />, { wrapper: makeWrapper(client) });
  });

  await waitFor(() => {
    expect(screen.getByText("Acme Corp")).toBeDefined();
  });

  const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
  expect(deleteButtons.length).toBe(2);
});

test("clicking Delete calls DELETE /invoices/:id", async () => {
  const invoices: Invoice[] = [
    { id: 5, userId: 1, name: "Umbrella Corp", amount: 800, status: "completed" },
  ];

  requestMock.mockImplementationOnce(() => httpOk(invoices));
  requestMock.mockImplementationOnce(() => httpOk(null));
  requestMock.mockImplementationOnce(() => httpOk([]));

  const client = makeClient();
  await act(async () => {
    render(<InvoiceListFeature />, { wrapper: makeWrapper(client) });
  });

  await waitFor(() => {
    expect(screen.getByText("Umbrella Corp")).toBeDefined();
  });

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /delete/i }));

  await waitFor(() => {
    const calls = requestMock.mock.calls;
    const deleteCall = calls.find(
      (call) => (call[1] as RequestInit | undefined)?.method === "DELETE",
    );
    expect(deleteCall).toBeDefined();
    expect(deleteCall![0]).toBe("/invoices/5");
  });
});

test("after Delete succeeds the invoices query is refetched and updated list is shown", async () => {
  const invoices: Invoice[] = [
    { id: 1, userId: 1, name: "Acme Corp", amount: 1200, status: "completed" },
    { id: 2, userId: 1, name: "Globex Inc", amount: 450, status: "inprogress" },
  ];
  const invoicesAfterDelete: Invoice[] = [
    { id: 2, userId: 1, name: "Globex Inc", amount: 450, status: "inprogress" },
  ];

  requestMock.mockImplementationOnce(() => httpOk(invoices));
  requestMock.mockImplementationOnce(() => httpOk(null));
  requestMock.mockImplementationOnce(() => httpOk(invoicesAfterDelete));

  const client = makeClient();
  await act(async () => {
    render(<InvoiceListFeature />, { wrapper: makeWrapper(client) });
  });

  await waitFor(() => {
    expect(screen.getByText("Acme Corp")).toBeDefined();
    expect(screen.getByText("Globex Inc")).toBeDefined();
  });

  const user = userEvent.setup();
  const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
  await user.click(deleteButtons[0]!);

  await waitFor(() => {
    expect(screen.queryByText("Acme Corp")).toBeNull();
    expect(screen.getByText("Globex Inc")).toBeDefined();
  });
});

test("submitting the edit modal calls PATCH and closes on success", async () => {
  const invoices: Invoice[] = [
    { id: 2, userId: 1, name: "Wayne Enterprises", amount: 500, status: "failed" },
  ];

  requestMock.mockImplementationOnce(() => httpOk(invoices));
  requestMock.mockImplementationOnce(() => httpOk({ id: 2 }));
  requestMock.mockImplementationOnce(() => httpOk(invoices));

  const client = makeClient();
  await act(async () => {
    render(<InvoiceListFeature />, { wrapper: makeWrapper(client) });
  });

  await waitFor(() => {
    expect(screen.getByText("Wayne Enterprises")).toBeDefined();
  });

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /edit & retry/i }));

  await waitFor(() => {
    expect(screen.getByText("Edit & Retry Invoice")).toBeDefined();
  });

  await user.click(screen.getByRole("button", { name: /^retry$/i }));

  await waitFor(() => {
    expect(screen.queryByText("Edit & Retry Invoice")).toBeNull();
  });

  const calls = requestMock.mock.calls;
  const patchCall = calls.find((call) => (call[1] as RequestInit | undefined)?.method === "PATCH");
  expect(patchCall).toBeDefined();
  expect(patchCall![0]).toBe("/invoices/2");
  const body = JSON.parse((patchCall![1] as RequestInit).body as string);
  expect(body).toEqual({ name: "Wayne Enterprises", amount: 500 });
});

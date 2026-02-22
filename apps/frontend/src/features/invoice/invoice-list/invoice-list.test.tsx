import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, mock, spyOn, test } from "bun:test";

import type { Invoice } from "@distributed-systems/shared";

import { httpError, httpOk } from "#test/http-helpers.js";
import { makeClient, makeWrapper } from "#test/query-helpers.js";
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
    { id: 1, name: "Acme Corp", amount: 1200, status: "completed" },
    { id: 2, name: "Globex Inc", amount: 450, status: "inprogress" },
    { id: 3, name: "Stark Industries", amount: 9800, status: "pending" },
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

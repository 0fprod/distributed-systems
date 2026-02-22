import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, mock, test } from "bun:test";

import { QueryKeys } from "#shared/query-keys";
import { makeClient, makeWrapper } from "#test/query-helpers";
import { makeFakeWebSocket } from "#test/websocket-helpers";

import { useInvoiceWebSocket } from "./use-invoice-websocket.hook";

let fakeWs = makeFakeWebSocket();

mock.module("#shared/websocket", () => ({
  createWebSocket: mock((url: string) => {
    fakeWs = makeFakeWebSocket(url);
    return fakeWs;
  }),
}));

beforeEach(() => {
  fakeWs = makeFakeWebSocket();
});

test("connects to the correct WebSocket URL", () => {
  const client = makeClient();

  renderHook(() => useInvoiceWebSocket(), { wrapper: makeWrapper(client) });

  // window.location.host is "" in HappyDOM, protocol is "http:"
  expect(fakeWs.url).toBe("ws:///ws");
});

test("invalidates invoices query on invoice:completed message", async () => {
  const client = makeClient();
  const invalidateSpy = mock(() => Promise.resolve());
  client.invalidateQueries = invalidateSpy;

  renderHook(() => useInvoiceWebSocket(), { wrapper: makeWrapper(client) });

  await act(async () => {
    fakeWs.emit({ type: "invoice:completed", invoiceId: 42 });
  });

  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.invoices });
});

test("does not invalidate on unknown message type", async () => {
  const client = makeClient();
  const invalidateSpy = mock(() => Promise.resolve());
  client.invalidateQueries = invalidateSpy;

  renderHook(() => useInvoiceWebSocket(), { wrapper: makeWrapper(client) });

  await act(async () => {
    fakeWs.emit({ type: "invoice:other", invoiceId: 1 });
  });

  expect(invalidateSpy).not.toHaveBeenCalled();
});

test("closes the WebSocket on unmount", () => {
  const client = makeClient();

  const { unmount } = renderHook(() => useInvoiceWebSocket(), { wrapper: makeWrapper(client) });

  unmount();

  expect(fakeWs.close).toHaveBeenCalledTimes(1);
});

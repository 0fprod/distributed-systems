import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, mock, test } from "bun:test";

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

  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["invoices"] });
});

test("invalidates invoices query on invoice:inprogress message", async () => {
  const client = makeClient();
  const invalidateSpy = mock(() => Promise.resolve());
  client.invalidateQueries = invalidateSpy;

  renderHook(() => useInvoiceWebSocket(), { wrapper: makeWrapper(client) });

  await act(async () => {
    fakeWs.emit({ type: "invoice:inprogress", invoiceId: 1 });
  });

  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["invoices"] });
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

test("reconnects after the server closes the connection", async () => {
  const client = makeClient();

  renderHook(() => useInvoiceWebSocket(), { wrapper: makeWrapper(client) });

  const firstWs = fakeWs;

  // Capture the setTimeout call so we can trigger it synchronously.
  let scheduledReconnect: (() => void) | undefined;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: () => void, _delay: number) => {
    scheduledReconnect = fn;
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;

  try {
    act(() => {
      firstWs.simulateClose();
    });

    // The onclose handler should have scheduled a reconnect.
    expect(scheduledReconnect).toBeDefined();

    // Trigger the reconnect.
    act(() => {
      scheduledReconnect!();
    });

    // A new WebSocket instance should have been created.
    expect(fakeWs).not.toBe(firstWs);
    expect(fakeWs.url).toBe("ws:///ws");
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test("does not reconnect after the hook is unmounted", () => {
  const client = makeClient();

  const { unmount } = renderHook(() => useInvoiceWebSocket(), { wrapper: makeWrapper(client) });

  const firstWs = fakeWs;

  let scheduledReconnect: (() => void) | undefined;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: () => void, _delay: number) => {
    scheduledReconnect = fn;
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;

  try {
    // Unmount sets destroyed=true and calls ws.close().
    act(() => {
      unmount();
    });

    // The close triggered by cleanup should NOT schedule a reconnect.
    expect(scheduledReconnect).toBeUndefined();

    // Confirm the original socket was closed.
    expect(firstWs.close).toHaveBeenCalledTimes(1);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

import { mock } from "bun:test";

export interface FakeWebSocket {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null;
  onclose: (() => void) | null;
  close: ReturnType<typeof mock>;
  /** Helper: simulate a server message in tests */
  emit(data: unknown): void;
  /** Helper: simulate the server closing the connection */
  simulateClose(): void;
}

export function makeFakeWebSocket(url: string = ""): FakeWebSocket {
  const ws: FakeWebSocket = {
    url,
    onmessage: null,
    onclose: null,
    close: mock(() => undefined),
    emit(data: unknown) {
      this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }));
    },
    simulateClose() {
      this.onclose?.();
    },
  };
  return ws;
}

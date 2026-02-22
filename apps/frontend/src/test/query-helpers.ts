import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

export function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

export function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

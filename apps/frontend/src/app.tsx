import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { HomePage } from "#pages/home/home.page";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="mx-auto max-w-3xl space-y-8 p-8">
        <h1 className="text-3xl font-bold text-gray-900">Distributed Systems Demo</h1>
        <HomePage />
      </div>
    </QueryClientProvider>
  );
}

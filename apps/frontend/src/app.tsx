import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";

import { AuthPage } from "#pages/auth/auth.page";
import { InvoicesPage } from "#pages/invoices/invoices.page";
import { ProtectedRoute } from "#shared/protected-route";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="mx-auto max-w-3xl p-8">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/invoices" element={<InvoicesPage />} />
            </Route>
            <Route path="/" element={<Navigate to="/invoices" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

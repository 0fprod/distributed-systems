import { useState } from "react";

import { useUserMutations } from "#features/auth/auth.repository";
import type { LoginPayload } from "#features/auth/auth.repository";

interface LoginUserComponentProps {
  onLoggedIn: () => void;
}

export function LoginUserComponent({ onLoggedIn }: LoginUserComponentProps) {
  const [form, setForm] = useState<LoginPayload>({ email: "", password: "" });
  const { login } = useUserMutations({ onLogin: onLoggedIn });

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate(form);
  }

  return (
    <div className="space-y-4 rounded-lg bg-white p-6 shadow">
      <h2 className="text-xl font-semibold text-gray-800">Sign in to your account</h2>

      {login.isError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {login.error instanceof Error ? login.error.message : "Login failed. Please try again."}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="login-email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {login.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

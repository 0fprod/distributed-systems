import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import type { RegisterUserPayload } from "./register-user.mutation";
import { registerUser } from "./register-user.mutation";

interface RegisterUserComponentProps {
  onSuccess: () => void;
}

export function RegisterUserComponent({ onSuccess }: RegisterUserComponentProps) {
  const [form, setForm] = useState<RegisterUserPayload>({ name: "", email: "", password: "" });

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess,
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate(form);
  }

  return (
    <div className="space-y-4 rounded-lg bg-white p-6 shadow">
      <h2 className="text-xl font-semibold text-gray-800">Create an account</h2>

      {mutation.isError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Registration failed. Please try again."}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? "Registering..." : "Register"}
        </button>

        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400 opacity-50"
        >
          Login (coming soon)
        </button>
      </form>
    </div>
  );
}

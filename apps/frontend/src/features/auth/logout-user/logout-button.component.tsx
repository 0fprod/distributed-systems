import * as Sentry from "@sentry/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { QueryKeys } from "#shared/query-keys";

import { logoutUser } from "./logout-user.mutation";

export function LogoutButton() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: async () => {
      Sentry.setUser(null);
      await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
      navigate("/auth");
    },
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {mutation.isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}

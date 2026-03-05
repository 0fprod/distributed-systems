import * as Sentry from "@sentry/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { ApiRoutes } from "@distributed-systems/shared";

import { QueryKeys } from "#shared/query-keys";
import { request } from "#shared/request";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface CurrentUser {
  id: number;
  email: string;
}

// ─── HTTP functions ───────────────────────────────────────────────────────────

async function loginUser(payload: LoginPayload): Promise<void> {
  const response = await request(ApiRoutes.LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Login failed. Please try again.");
  }
}

async function logoutUser(): Promise<void> {
  const response = await request(ApiRoutes.LOGOUT, { method: "POST" });

  if (!response.ok) {
    throw new Error("Logout failed. Please try again.");
  }
}

async function registerUser(payload: RegisterPayload): Promise<void> {
  const response = await request(ApiRoutes.REGISTER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Registration failed. Please try again.");
  }
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const response = await request(ApiRoutes.ME);
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Failed to fetch current user");
  return response.json() as Promise<CurrentUser>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

interface UserMutationCallbacks {
  onLogin?: () => void;
  onRegister?: () => void;
}

export function useUserMutations({ onLogin, onRegister }: UserMutationCallbacks = {}) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const login = useMutation({
    mutationFn: loginUser,
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: QueryKeys.me });
      const user = qc.getQueryData<CurrentUser>(QueryKeys.me);
      if (user) Sentry.setUser({ id: String(user.id), email: user.email });
      onLogin?.();
    },
  });

  const logout = useMutation({
    mutationFn: logoutUser,
    onSuccess: async () => {
      Sentry.setUser(null);
      await qc.invalidateQueries({ queryKey: QueryKeys.me });
      navigate("/auth");
    },
  });

  const register = useMutation({
    mutationFn: registerUser,
    ...(onRegister !== undefined && { onSuccess: onRegister }),
  });

  return { login, logout, register };
}

export function useCurrentUser(): { data: CurrentUser | null; isLoading: boolean } {
  const { data = null, isLoading } = useQuery({
    queryKey: QueryKeys.me,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });
  return { data, isLoading };
}

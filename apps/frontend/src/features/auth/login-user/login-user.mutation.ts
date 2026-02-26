import { ApiRoutes } from "@distributed-systems/shared";

import { request } from "#shared/request";

export interface LoginUserPayload {
  email: string;
  password: string;
}

export async function loginUser(payload: LoginUserPayload): Promise<void> {
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

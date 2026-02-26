import { ApiRoutes } from "@distributed-systems/shared";

import { request } from "#shared/request";

export interface RegisterUserPayload {
  name: string;
  email: string;
  password: string;
}

export async function registerUser(payload: RegisterUserPayload): Promise<void> {
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

import { ApiRoutes } from "@distributed-systems/shared";

import { request } from "#shared/request";

export async function logoutUser(): Promise<void> {
  const response = await request(ApiRoutes.LOGOUT, { method: "POST" });

  if (!response.ok) {
    throw new Error("Logout failed. Please try again.");
  }
}

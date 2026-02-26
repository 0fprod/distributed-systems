import { useQuery } from "@tanstack/react-query";

import { ApiRoutes } from "@distributed-systems/shared";

import { QueryKeys } from "#shared/query-keys";
import { request } from "#shared/request";

interface CurrentUser {
  id: number;
  email: string;
}

export function useCurrentUser(): { data: CurrentUser | null; isLoading: boolean } {
  const { data = null, isLoading } = useQuery({
    queryKey: QueryKeys.me,
    queryFn: async () => {
      const response = await request(ApiRoutes.ME);
      if (response.status === 401) return null;
      if (!response.ok) throw new Error("Failed to fetch current user");
      return response.json() as Promise<CurrentUser>;
    },
  });

  return { data, isLoading };
}

import { getUser as apiGetUser } from "@repo/api";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

export const userQueries = {
  getUserQueryOptions: queryOptions({
    queryKey: ["user"],
    queryFn: async () =>
      await apiGetUser({ baseURL: import.meta.env.PUBLIC_API_URL! }),
  }),
  ensureUserQueryOptions: queryOptions({
    queryKey: ["user"],
    queryFn: async () =>
      (await apiGetUser({ baseURL: import.meta.env.PUBLIC_API_URL! }))!,
  }),
  getUser: {
    useSuspenseQuery: () =>
      useSuspenseQuery(userQueries.ensureUserQueryOptions),
  },
};

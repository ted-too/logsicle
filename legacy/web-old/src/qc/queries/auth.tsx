/* eslint-disable react-hooks/rules-of-hooks */
import {
  getUser as apiGetUser,
  updateUser,
  UpdateUserRequest,
  User,
} from "@repo/api";
import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { getQueryClient } from "../query-client";

const queryClient = getQueryClient();

const queryFn = async () =>
  await apiGetUser({ baseURL: import.meta.env.PUBLIC_API_URL! }).catch(
    () => null
  );

export const userQueries = {
  getUserQueryOptions: queryOptions({
    queryKey: ["user"],
    queryFn,
  }),
  ensureUserQueryOptions: queryOptions({
    queryKey: ["user"],
    queryFn: async () => (await queryFn())!,
  }),
  getUser: {
    useSuspenseQuery: () =>
      useSuspenseQuery(userQueries.ensureUserQueryOptions),
  },
  update: () =>
    useMutation({
      mutationFn: async (input: Partial<UpdateUserRequest>) => {
        const { data, error } = await updateUser(input, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
        });
        if (error) return Promise.reject(error);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: userQueries.getUserQueryOptions,
        });
      },
    }),
};

export const ensureUser = (user: User | null, currentLocation?: string) => {
  if (!user)
    throw redirect({
      to: "/auth/sign-in",
      search: {
        // Use the current location to power a redirect after login
        // (Do not use `router.state.resolvedLocation` as it can
        // potentially lag behind the actual current location)
        redirect: currentLocation ?? window.location.href,
      },
    });
    
  return user!;
};

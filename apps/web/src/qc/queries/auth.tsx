/* eslint-disable react-hooks/rules-of-hooks */
import {
  getUser as apiGetUser,
  updateUser,
  UpdateUserRequest
} from "@repo/api";
import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { getQueryClient } from "../query-client";

export interface FetchOptions {
  headers?: HeadersInit;
}

const queryClient = getQueryClient();

const queryFn = async () =>
  await apiGetUser({ baseURL: import.meta.env.VITE_API_URL! }).catch(
    () => null
  );

export const userQueries = {
  getUserQueryOptions: (options?: FetchOptions) =>
    queryOptions({
      queryKey: ["user"],
      queryFn,
      ...options,
    }),
  ensureUserQueryOptions: (options?: FetchOptions) =>
    queryOptions({
      queryKey: ["user"],
      queryFn: async () => (await queryFn())!,
      ...options,
    }),
  getUser: {
    useSuspenseQuery: (options?: FetchOptions) =>
      useSuspenseQuery(userQueries.ensureUserQueryOptions(options)),
  },
  update: (options?: FetchOptions) =>
    useMutation({
      mutationFn: async (input: Partial<UpdateUserRequest>) => {
        const { data, error } = await updateUser(input, {
          baseURL: import.meta.env.VITE_API_URL!,
        });
        if (error) return Promise.reject(error);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: userQueries.getUserQueryOptions(options).queryKey,
        });
      },
    }),
};

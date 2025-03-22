import { getUser } from "@/server/auth";
import { BetterFetchError } from "@better-fetch/fetch";
import {
  User
} from "@repo/api";
import {
  queryOptions
} from "@tanstack/react-query";

export const getUserQueryKey = ["user"];

export const getUserQueryOptions = () =>
  queryOptions<User, BetterFetchError>({
    queryKey: getUserQueryKey,
    queryFn: async () => {
      const { data, error } = await getUser();
      if (error) return Promise.reject(error);
      return data;
    },
  });

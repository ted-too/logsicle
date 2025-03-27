import { getUser } from "@/server/auth/basic";
import { queryOptions } from "@tanstack/react-query";

export const userQueryKey = ["user"];

export const getUserQueryOptions = () =>
	queryOptions({
		queryKey: userQueryKey,
		queryFn: async () => {
			const { data, error } = await getUser();
			if (error) return Promise.reject(error);
			return data;
		},
	});

import { listAPIKeys } from "@/server/auth/api-keys";
import { queryOptions } from "@tanstack/react-query";

export const apiKeysQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"api-keys",
];

export const getApiKeysQueryOptions = (projectId: string) => {
	return queryOptions({
		queryKey: apiKeysQueryKey(projectId),
		queryFn: async () => {
			const { data, error } = await listAPIKeys({
				data: { projectId },
			});

			if (error) return Promise.reject(error);
			return data;
		},
	});
};

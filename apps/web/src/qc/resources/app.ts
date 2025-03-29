import { listAppLogs, getAppTimelineChart } from "@/server/resources/app";
import type {
	AppLog,
	GetAppMetricsRequest,
	ListAppLogsRequest,
	PaginatedResponse,
} from "@repo/api";
import {
	infiniteQueryOptions,
	keepPreviousData,
	queryOptions,
} from "@tanstack/react-query";
import type { InfiniteQueryResponse } from "../utils";

export const appLogsQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"app-logs",
];

export const appTimelineChartQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"app-logs",
	"charts",
	"timeline",
];

export const transformAppLogData = (
	data: PaginatedResponse<AppLog>,
): InfiniteQueryResponse<AppLog[]> => ({
	data: data.data,
	meta: {
		pagination: data.meta,
		facets: data.facets,
	},
});

export const getAppLogsQueryOptions = (
	projectId: string,
	query: ListAppLogsRequest,
) =>
	infiniteQueryOptions({
		queryKey: [...appLogsQueryKey(projectId), query],
		queryFn: async ({ pageParam }) => {
			const { data, error } = await listAppLogs({
				data: {
					projectId,
					query: { ...query, page: pageParam },
				},
			});
			if (error) return Promise.reject(error);
			return transformAppLogData(data);
		},
		initialPageParam: 1,
		getPreviousPageParam: ({ meta }) => {
			if (!meta.pagination.prevPage) return null;
			return meta.pagination.prevPage;
		},
		getNextPageParam: ({ meta }) => {
			if (!meta.pagination.nextPage) return null;
			return meta.pagination.nextPage;
		},
		refetchOnWindowFocus: false,
		placeholderData: keepPreviousData,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

export const getAppTimelineChartQueryOptions = (
	projectId: string,
	query: GetAppMetricsRequest,
) =>
	queryOptions({
		queryKey: [...appTimelineChartQueryKey(projectId), query],
		queryFn: async () => {
			const { data, error } = await getAppTimelineChart({
				data: { projectId, query },
			});
			if (error) return Promise.reject(error);
			return data;
		},
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

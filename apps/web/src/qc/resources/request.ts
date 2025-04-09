import {
	getRequestTimelineChart,
	listRequestLogs,
} from "@/server/resources/request";
import type {
	GetRequestMetricsRequest,
	ListRequestLogsRequest,
	RequestLog,
} from "@repo/api";
import {
	infiniteQueryOptions,
	keepPreviousData,
	queryOptions,
} from "@tanstack/react-query";
import type { InfiniteQueryResponse } from "../utils";

export const requestLogsQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"request-logs",
];

export const requestTimelineChartQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"request-logs",
	"charts",
	"timeline",
];

export const getRequestLogsQueryOptions = (
	projectId: string,
	query: ListRequestLogsRequest,
) =>
	infiniteQueryOptions({
		queryKey: [...requestLogsQueryKey(projectId), query],
		queryFn: async ({ pageParam }) => {
			const { data, error } = await listRequestLogs({
				data: {
					projectId,
					query: { ...query, page: pageParam },
				},
			});
			if (error) return Promise.reject(error);
			return {
				data: data.data,
				meta: {
					pagination: data.meta,
					facets: data.facets || {},
				},
			} as InfiniteQueryResponse<RequestLog[]>;
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
	});

export const getRequestTimelineChartQueryOptions = (
	projectId: string,
	query: GetRequestMetricsRequest,
) =>
	queryOptions({
		queryKey: [...requestTimelineChartQueryKey(projectId), query],
		queryFn: async () => {
			const { data, error } = await getRequestTimelineChart({
				data: { projectId, query },
			});
			if (error) return Promise.reject(error);
			return data;
		},
	});

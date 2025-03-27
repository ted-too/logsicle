import { listAppLogs, getAppMetrics } from "@/server/resources/app";
import type { GetAppMetricsRequest, ListAppLogsRequest } from "@repo/api";
import { queryOptions } from "@tanstack/react-query";

export const appLogsQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"app-logs",
];

export const appMetricsQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"app-logs",
	"metrics",
];

export const getAppLogsQueryOptions = (
	projectId: string,
	query: ListAppLogsRequest,
) =>
	queryOptions({
		queryKey: [...appLogsQueryKey(projectId), query],
		queryFn: async () => {
			const { data, error } = await listAppLogs({ data: { projectId, query } });
			if (error) return Promise.reject(error);
			return data;
		},
	});

export const getAppMetricsQueryOptions = (
	projectId: string,
	query: GetAppMetricsRequest,
) =>
	queryOptions({
		queryKey: [...appMetricsQueryKey(projectId), query],
		queryFn: async () => {
			const { data, error } = await getAppMetrics({
				data: { projectId, query },
			});
			if (error) return Promise.reject(error);
			return data;
		},
	});

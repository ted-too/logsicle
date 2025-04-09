import { getMetricStats, listMetrics } from "@/server/resources/metrics";
import type { GetMetricStatsRequest, ListMetricsRequest } from "@repo/api";
import { queryOptions } from "@tanstack/react-query";

export const metricsQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"metrics",
];

export const metricStatsQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"metrics",
	"stats",
];

export const getMetricsQueryOptions = (
	projectId: string,
	query: ListMetricsRequest,
) =>
	queryOptions({
		queryKey: [...metricsQueryKey(projectId), query],
		queryFn: async () => {
			const { data, error } = await listMetrics({ data: { projectId, query } });
			if (error) return Promise.reject(error);
			return data;
		},
	});

export const getMetricStatsQueryOptions = (
	projectId: string,
	query: GetMetricStatsRequest,
) =>
	queryOptions({
		queryKey: [...metricStatsQueryKey(projectId), query],
		queryFn: async () => {
			const { data, error } = await getMetricStats({
				data: { projectId, query },
			});
			if (error) return Promise.reject(error);
			return data;
		},
	});

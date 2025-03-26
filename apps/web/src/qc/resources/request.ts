import { listRequestLogs, getRequestMetrics } from "@/server/resources/request";
import type { GetRequestMetricsRequest, ListRequestLogsRequest } from "@repo/api";
import { queryOptions } from "@tanstack/react-query";

export const requestLogsQueryKey = (projectId: string) => [
  "projects",
  projectId,
  "request-logs",
];

export const requestMetricsQueryKey = (projectId: string) => [
  "projects",
  projectId,
  "request-logs",
  "metrics",
];

export const getRequestLogsQueryOptions = (
  projectId: string,
  query: ListRequestLogsRequest,
) =>
  queryOptions({
    queryKey: [...requestLogsQueryKey(projectId), query],
    queryFn: async () => {
      const { data, error } = await listRequestLogs({ data: { projectId, query } });
      if (error) return Promise.reject(error);
      return data;
    },
  });

export const getRequestMetricsQueryOptions = (
  projectId: string,
  query: GetRequestMetricsRequest,
) =>
  queryOptions({
    queryKey: [...requestMetricsQueryKey(projectId), query],
    queryFn: async () => {
      const { data, error } = await getRequestMetrics({
        data: { projectId, query },
      });
      if (error) return Promise.reject(error);
      return data;
    },
  }); 
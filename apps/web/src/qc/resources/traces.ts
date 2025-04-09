import {
	getTraceStats,
	getTraceTimeline,
	listTraces,
} from "@/server/resources/traces";
import type { GetTraceStatsRequest, ListTracesRequest } from "@repo/api";
import { queryOptions } from "@tanstack/react-query";

export const tracesQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"traces",
];

export const traceStatsQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"traces",
	"stats",
];

export const traceTimelineQueryKey = (projectId: string, traceId: string) => [
	"projects",
	projectId,
	"traces",
	traceId,
];

export const getTracesQueryOptions = (
	projectId: string,
	query: ListTracesRequest,
) =>
	queryOptions({
		queryKey: [...tracesQueryKey(projectId), query],
		queryFn: async () => {
			const { data, error } = await listTraces({ data: { projectId, query } });
			if (error) return Promise.reject(error);
			return data;
		},
	});

export const getTraceStatsQueryOptions = (
	projectId: string,
	query: GetTraceStatsRequest,
) =>
	queryOptions({
		queryKey: [...traceStatsQueryKey(projectId), query],
		queryFn: async () => {
			const { data, error } = await getTraceStats({
				data: { projectId, query },
			});
			if (error) return Promise.reject(error);
			return data;
		},
	});

export const getTraceTimelineQueryOptions = (
	projectId: string,
	traceId: string,
) =>
	queryOptions({
		queryKey: traceTimelineQueryKey(projectId, traceId),
		queryFn: async () => {
			const { data, error } = await getTraceTimeline({
				data: { projectId, traceId },
			});
			if (error) return Promise.reject(error);
			return data;
		},
	});

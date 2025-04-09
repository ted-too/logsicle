import {
	getChannel,
	getEventMetrics,
	listChannels,
	listEvents,
} from "@/server/resources/events";
import type { GetEventMetricsRequest, ListEventsRequest } from "@repo/api";
import { queryOptions } from "@tanstack/react-query";

export const eventsQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"events",
];

export const eventMetricsQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"events",
	"metrics",
];

export const channelsQueryKey = (projectId: string) => [
	"projects",
	projectId,
	"channels",
];

export const channelQueryKey = (projectId: string, channelId: string) => [
	"projects",
	projectId,
	"channels",
	channelId,
];

export const getEventsQueryOptions = (
	projectId: string,
	query: ListEventsRequest,
) =>
	queryOptions({
		queryKey: [...eventsQueryKey(projectId), query],
		queryFn: async () => {
			const { data, error } = await listEvents({ data: { projectId, query } });
			if (error) return Promise.reject(error);
			return data;
		},
	});

export const getEventMetricsQueryOptions = (
	projectId: string,
	query: GetEventMetricsRequest,
) =>
	queryOptions({
		queryKey: [...eventMetricsQueryKey(projectId), query],
		queryFn: async () => {
			const { data, error } = await getEventMetrics({
				data: { projectId, query },
			});
			if (error) return Promise.reject(error);
			return data;
		},
	});

export const getChannelsQueryOptions = (projectId: string) =>
	queryOptions({
		queryKey: channelsQueryKey(projectId),
		queryFn: async () => {
			const { data, error } = await listChannels({ data: { projectId } });
			if (error) return Promise.reject(error);
			return data;
		},
	});

export const getChannelQueryOptions = (projectId: string, channelId: string) =>
	queryOptions({
		queryKey: channelQueryKey(projectId, channelId),
		queryFn: async () => {
			const { data, error } = await getChannel({
				data: { projectId, channelId },
			});
			if (error) return Promise.reject(error);
			return data;
		},
	});

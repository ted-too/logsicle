import { getEventChannel, listEventChannels } from "@repo/api";
import {
  queryOptions,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";

export const channelsQueries = {
  eventChannels: {
    listQueryOptions: (projectId: string, opts?: RequestInit) =>
      queryOptions({
        queryKey: ["projects", projectId, "channels", "events"],
        queryFn: async () => {
          const { data, error } = await listEventChannels(projectId, {
            baseURL: import.meta.env.VITE_API_URL!,
            ...opts,
          });
          if (error) return Promise.reject(error);
          return data;
        },
      }),
    list: {
      useQuery: (projectId: string) =>
        useQuery(channelsQueries.eventChannels.listQueryOptions(projectId)),
      useSuspenseQuery: (projectId: string) =>
        useSuspenseQuery(
          channelsQueries.eventChannels.listQueryOptions(projectId)
        ),
    },
    getQueryOptions: (
      projectId: string,
      channelId: string,
      opts?: RequestInit
    ) =>
      queryOptions({
        queryKey: ["projects", projectId, "channels", "events", channelId],
        queryFn: async () => {
          const { data, error } = await getEventChannel(projectId, channelId, {
            baseURL: import.meta.env.VITE_API_URL!,
            ...opts,
          });
          if (error) return Promise.reject(error);
          return data;
        },
      }),
    get: {
      useQuery: (projectId: string, channelId: string) =>
        useQuery(
          channelsQueries.eventChannels.getQueryOptions(projectId, channelId)
        ),
      useSuspenseQuery: (projectId: string, channelId: string) =>
        useSuspenseQuery(
          channelsQueries.eventChannels.getQueryOptions(projectId, channelId)
        ),
    },
  },
};

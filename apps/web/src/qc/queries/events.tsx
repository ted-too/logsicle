/* eslint-disable react-hooks/rules-of-hooks */
import {
  deleteEventLog,
  getEventLogs,
  getEventMetrics,
  Opts,
  timeRangeSchema,
} from "@repo/api";
import {
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { z } from "zod";
import { getQueryClient } from "../query-client";
import { optionalStringSchema } from "./app-logs";

const DEFAULT_PAGE_SIZE = 20;

// Reusable array schema
export const optionalArraySchema = z
  .array(z.string())
  .optional()
  .transform((v) => (v?.length ? v : undefined));

// Updated event search schema using reusable components
export const eventSearchSchema = z.object({
  channelId: optionalStringSchema,
  name: optionalStringSchema,
  tags: optionalArraySchema,
  start: timeRangeSchema.start,
  end: timeRangeSchema.end,
});

export type EventSearch = z.infer<typeof eventSearchSchema>;

// Validate and parse search params
export function validateEventSearch(
  search: Record<string, unknown>
): EventSearch {
  // Handle tags special case as it might come as string or array
  const parsedTags = search.tags
    ? Array.isArray(search.tags)
      ? search.tags
      : [search.tags]
    : [];

  return eventSearchSchema.parse({
    ...search,
    tags: parsedTags,
  });
}

export const eventsQueries = {
  list: {
    useInfiniteQuery: (projectId: string, search: EventSearch, opts?: Opts) =>
      useInfiniteQuery({
        queryKey: ["projects", projectId, "events", search],
        initialPageParam: new Date().toISOString(),
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        queryFn: async ({ pageParam }) => {
          const { data, error } = await getEventLogs(
            projectId,
            {
              channelId: search.channelId,
              name: search.name,
              tags: search.tags,
              before: pageParam,
              limit: DEFAULT_PAGE_SIZE,
              start: search.start,
              end: search.end,
            },
            {
              baseURL: import.meta.env.PUBLIC_API_URL!,
              ...opts,
            }
          );
          if (error) return Promise.reject(error);
          return data;
        },
        getNextPageParam: (lastPage) => {
          if (!lastPage.hasNext) return undefined;
          return lastPage.data[lastPage.data.length - 1]?.timestamp;
        },
        getPreviousPageParam: (firstPage) => {
          if (!firstPage.hasPrev) return undefined;
          return firstPage.data[0]?.timestamp;
        },
      }),
  },
  metricsQueryOptions: (
    projectId: string,
    search: EventSearch,
    opts?: RequestInit
  ) =>
    queryOptions({
      queryKey: ["projects", projectId, "events", "metrics", search],
      queryFn: async () => {
        const { data, error } = await getEventMetrics(
          projectId,
          {
            channelId: search.channelId,
            name: search.name,
            start: search.start,
            end: search.end,
          },
          {
            baseURL: import.meta.env.PUBLIC_API_URL!,
            ...opts,
          }
        );
        if (error) return Promise.reject(error);
        return data;
      },
    }),
  metrics: {
    useQuery: (projectId: string, search: EventSearch) =>
      useQuery(eventsQueries.metricsQueryOptions(projectId, search)),
    useSuspenseQuery: (projectId: string, search: EventSearch) =>
      useSuspenseQuery(eventsQueries.metricsQueryOptions(projectId, search)),
  },
};

const queryClient = getQueryClient();

export const eventsMutations = {
  delete: () =>
    useMutation({
      mutationFn: async ({
        projectId,
        logId,
      }: {
        projectId: string;
        logId: string;
      }) => {
        const { error } = await deleteEventLog(projectId, logId, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
        });
        if (error) return Promise.reject(error);
      },
      onSuccess: (_data, { projectId }) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({
          queryKey: ["projects", projectId, "events"],
        });
        // Also invalidate metrics as they might need updating
        queryClient.invalidateQueries({
          queryKey: ["projects", projectId, "events", "metrics"],
        });
      },
    }),
};

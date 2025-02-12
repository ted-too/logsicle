/* eslint-disable react-hooks/rules-of-hooks */
import {
  deleteAppLog,
  getAppLogMetrics,
  getAppLogs,
  LogLevel,
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

const DEFAULT_PAGE_SIZE = 20;

// Individual field schemas
export const optionalStringSchema = z
  .string()
  .optional()
  .transform((v) => v || undefined);

export const logLevelSchema = z
  .enum(["debug", "info", "warning", "error", "fatal"] as const)
  .optional()
  .transform((v) => v || undefined);

// Main schema composition
export const appLogSearchSchema = z.object({
  channelId: optionalStringSchema,
  level: logLevelSchema,
  serviceName: optionalStringSchema,
  environment: optionalStringSchema,
  search: optionalStringSchema,
  start: timeRangeSchema.start,
  end: timeRangeSchema.end,
});

export type AppLogSearch = z.infer<typeof appLogSearchSchema>;

// Validate and parse search params
export function validateAppLogSearch(
  search: Record<string, unknown>
): AppLogSearch {
  // const now = new Date();
  // const defaultSearch = {
  //   ...search,
  //   start: search.start ?? new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
  //   end: search.end ?? now.toISOString(),
  // };

  return appLogSearchSchema.parse(search);
}

export const appLogsQueries = {
  list: {
    useInfiniteQuery: (projectId: string, search: AppLogSearch, opts?: Opts) =>
      useInfiniteQuery({
        queryKey: ["projects", projectId, "app-logs", search],
        initialPageParam: new Date().toISOString(),
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        queryFn: async ({ pageParam }) => {
          const { data, error } = await getAppLogs(
            projectId,
            {
              channelId: search.channelId,
              level: search.level as LogLevel,
              serviceName: search.serviceName,
              environment: search.environment,
              search: search.search,
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
    search: AppLogSearch,
    opts?: RequestInit
  ) =>
    queryOptions({
      queryKey: ["projects", projectId, "app-logs", "metrics", search],
      queryFn: async () => {
        const { data, error } = await getAppLogMetrics(
          projectId,
          {
            channelId: search.channelId,
            level: search.level as LogLevel,
            serviceName: search.serviceName,
            environment: search.environment,
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
    useQuery: (projectId: string, search: AppLogSearch) =>
      useQuery(appLogsQueries.metricsQueryOptions(projectId, search)),
    useSuspenseQuery: (projectId: string, search: AppLogSearch) =>
      useSuspenseQuery(appLogsQueries.metricsQueryOptions(projectId, search)),
  },
};

const queryClient = getQueryClient();

export const appLogsMutations = {
  delete: () =>
    useMutation({
      mutationFn: async ({
        projectId,
        logId,
      }: {
        projectId: string;
        logId: string;
      }) => {
        const { error } = await deleteAppLog(projectId, logId, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
        });
        if (error) return Promise.reject(error);
      },
      onSuccess: (_data, { projectId }) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({
          queryKey: ["projects", projectId, "app-logs"],
        });
        // Also invalidate metrics as they might need updating
        queryClient.invalidateQueries({
          queryKey: ["projects", projectId, "app-logs", "metrics"],
        });
      },
    }),
};

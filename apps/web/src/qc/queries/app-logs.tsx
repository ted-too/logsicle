/* eslint-disable react-hooks/rules-of-hooks */
import {
  deleteAppLog,
  getAppLogMetrics,
  GetAppLogMetricsParams,
  getAppLogs,
  GetAppLogsParams,
  Opts,
} from "@repo/api";
import {
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { getQueryClient } from "../query-client";

const DEFAULT_PAGE_SIZE = 40;

export const appLogsQueries = {
  list: {
    useInfiniteQuery: (
      projectId: string,
      search: GetAppLogsParams,
      opts?: Opts
    ) =>
      useInfiniteQuery({
        queryKey: ["projects", projectId, "app-logs", search],
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        initialPageParam: { page: 1 },
        queryFn: async ({ pageParam }) => {
          const { data, error } = await getAppLogs(
            projectId,
            {
              ...search,
              page: pageParam.page,
              limit: DEFAULT_PAGE_SIZE,
            },
            {
              baseURL: import.meta.env.VITE_API_URL!,
              ...opts,
            }
          );
          if (error) return Promise.reject(error);
          return data;
        },
        getNextPageParam: (lastPage) => {
          if (lastPage.meta.nextPage === null) return undefined;
          return { page: lastPage.meta.nextPage };
        },
        getPreviousPageParam: (firstPage) => {
          if (firstPage.meta.prevPage === null) return undefined;
          return { page: firstPage.meta.prevPage };
        },
        select: (data) => ({
          pageParams: data.pageParams,
          pages: data.pages,
          // Add these for easier access to metadata
          totalRowCount: data.pages[0]?.meta.totalRowCount ?? 0,
          totalFilteredRowCount: data.pages[0]?.meta.totalFilteredRowCount ?? 0,
        }),
      }),
  },
  metrics: {
    queryOptions: (
      projectId: string,
      search: GetAppLogMetricsParams,
      opts?: Opts
    ) =>
      queryOptions({
        queryKey: ["projects", projectId, "app-logs", "metrics", search],
        refetchOnWindowFocus: false,
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        queryFn: async () => {
          const { data, error } = await getAppLogMetrics(
            projectId,
            {
              ...search,
              interval: search.interval || "1 hour",
            },
            {
              baseURL: import.meta.env.VITE_API_URL!,
              ...opts,
            }
          );
          if (error) return Promise.reject(error);
          return data;
        },
      }),
    useQuery: (
      projectId: string,
      search: GetAppLogMetricsParams,
      opts?: Opts
    ) => useQuery(appLogsQueries.metrics.queryOptions(projectId, search, opts)),
    useSuspenseQuery: (
      projectId: string,
      search: GetAppLogMetricsParams,
      opts?: Opts
    ) =>
      useSuspenseQuery(
        appLogsQueries.metrics.queryOptions(projectId, search, opts)
      ),
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
          baseURL: import.meta.env.VITE_API_URL!,
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

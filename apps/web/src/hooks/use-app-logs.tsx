import { appLogsQueryKey } from "@/qc/resources/app";
import { listAppLogs } from "@/server/resources/app";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useRouteContext, useSearch } from "@tanstack/react-router";

export function useAppLogs() {
  const { currentProject } = useRouteContext({
    from: "/_authd/$orgSlug/$projSlug/_dashboard/app-logs",
  });
  const searchParams = useSearch({
    from: "/_authd/$orgSlug/$projSlug/_dashboard/app-logs", 
  });

  const query = useInfiniteQuery({
    queryKey: appLogsQueryKey(currentProject.id),
    initialPageParam: 1,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async ({ pageParam }) => {
      const { data, error } = await listAppLogs({
        data: { projectId: currentProject.id, query: searchParams }
      });
      if (error) return Promise.reject(error);
      return data;
    },
    getNextPageParam: ({meta}) =>
      meta.nextPage !== null ? meta.nextPage : undefined,
    getPreviousPageParam: ({meta}) =>
      meta.prevPage !== null ? meta.prevPage : undefined,
  });

  const totalCount = query.data?.pages[0]?.meta.totalRowCount ?? 0;
  const filteredCount = query.data?.pages[0]?.meta.totalFilteredRowCount ?? 0;
  const isFetching = query.isFetchingNextPage || query.isFetchingPreviousPage;
  const isPending = query.isPending;

  return {
    data: query.data,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    fetchPreviousPage: query.fetchPreviousPage,
    hasNextPage: query.hasNextPage,
    hasPreviousPage: query.hasPreviousPage,
    totalCount,
    filteredCount,
    isFetching,
    isPending,
  };
}

import { eventsQueryKey } from "@/qc/resources/events";
import { listEvents } from "@/server/resources/events";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useRouteContext, useSearch } from "@tanstack/react-router";

export function useEvents() {
	const { currentProject } = useRouteContext({
		from: "/_authd/$orgSlug/$projSlug/_dashboard/events",
	});
	const searchParams = useSearch({
		from: "/_authd/$orgSlug/$projSlug/_dashboard/events",
	});
	const query = useInfiniteQuery({
		queryKey: eventsQueryKey(currentProject.id),
		initialPageParam: new Date().toISOString(),
		refetchOnWindowFocus: false,
		placeholderData: keepPreviousData,
		staleTime: 30 * 1000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
		queryFn: async ({ pageParam }) => {
			const { data, error } = await listEvents({
				data: { projectId: currentProject.id, query: searchParams },
			});
			if (error) return Promise.reject(error);
			return data;
		},
		getNextPageParam: (lastPage) =>
			lastPage.meta.nextPage?.toString() ?? undefined,
		getPreviousPageParam: (firstPage) =>
			firstPage.meta.prevPage?.toString() ?? undefined,
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
		totalCount,
		filteredCount,
		isFetching,
		isPending,
	};
}

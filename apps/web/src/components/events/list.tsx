import { EventCard } from "@/components/events/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/sonner-wrapper";
import { useEvents } from "@/hooks/use-events";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef } from "react";

export function EventList() {
	const parentRef = useRef<HTMLDivElement>(null);
	const { data, error, isFetching, fetchNextPage, totalCount, filteredCount } =
		useEvents();

	const flatData = useMemo(
		() => data?.pages?.flatMap((page) => page.data) ?? [],
		[data],
	);

	// called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
	const fetchMoreOnBottomReached = useCallback(
		(containerRefElement?: HTMLDivElement | null) => {
			if (containerRefElement) {
				const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
				//once the user has scrolled within 500px of the bottom of the table, fetch more data if we can
				if (
					scrollHeight - scrollTop - clientHeight < 500 &&
					!isFetching &&
					filteredCount < totalCount
				) {
					fetchNextPage();
				}
			}
		},
		[fetchNextPage, isFetching, filteredCount, totalCount],
	);

	// a check on mount and after a fetch to see if the table is already scrolled to the bottom and immediately needs to fetch more data
	useEffect(() => {
		fetchMoreOnBottomReached(parentRef.current);
	}, [fetchMoreOnBottomReached]);

	const rowVirtualizer = useVirtualizer({
		count: flatData.length,
		getScrollElement: () => parentRef.current,
		estimateSize: useCallback(() => 116, []),
		measureElement:
			typeof window !== "undefined" &&
			navigator.userAgent.indexOf("Firefox") === -1
				? (element) => element?.getBoundingClientRect().height
				: undefined,
		overscan: 3,
	});

	useEffect(() => {
		if (!error) return;
		toast.APIError(error);
	}, [error]);

	return (
		<ScrollArea
			className="w-full h-[calc(100svh-3rem-0.25rem-70px)] px-3 pb-4"
			onViewportScroll={(e) =>
				fetchMoreOnBottomReached(e.target as HTMLDivElement)
			}
			ref={parentRef}
		>
			<div
				style={{
					height: `${rowVirtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative",
				}}
			>
				{rowVirtualizer.getVirtualItems().map((virtualRow) => (
					<div
						key={virtualRow.key}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: `${virtualRow.size}px`,
							transform: `translateY(${virtualRow.start}px)`,
						}}
					>
						<EventCard
							className="my-2 h-[100px]"
							event={flatData[virtualRow.index]}
						/>
					</div>
				))}
			</div>
		</ScrollArea>
	);
}

import { EventCard } from "@/components/events/card";
import { ChannelSelector } from "@/components/events/channel-selector";
import { DeleteChannel } from "@/components/events/delete-channel";
import { EditChannel } from "@/components/events/edit-channel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { channelsQueries } from "@/qc/queries/channels";
import { eventsQueries, validateEventSearch } from "@/qc/queries/events";
import { projectsQueries } from "@/qc/queries/projects";
import {
  createFileRoute,
  notFound,
  redirect,
  useRouterState,
  useSearch,
} from "@tanstack/react-router";
import { LoaderCircle, Search } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "@/components/ui/sonner-wrapper";

export const Route = createFileRoute("/_authd/_app/dashboard/$projId/events")({
  loader: async ({ params, context }) => {
    const projects = await context.queryClient.ensureQueryData(
      projectsQueries.listQueryOptions()
    );
    if (projects.length === 0) {
      throw redirect({
        to: "/dashboard/onboarding",
      });
    }
    const project = projects.find((p) => p.id === params.projId);
    if (!project) {
      throw notFound();
    }
    return project;
  },
  validateSearch: validateEventSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const { projId } = Route.useParams();
  const navigate = Route.useNavigate();
  const search = useRouterState({
    select: (state) => state.location.search,
  });
  const { channelId } = useSearch({
    from: "/_authd/_app/dashboard/$projId/events",
  });
  const { data: channels } =
    channelsQueries.eventChannels.list.useQuery(projId);

  const selectedChannel = useMemo(
    () => channels?.find((c) => c.id === search.channelId),
    [channels, search.channelId]
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const {
    data,
    error,
    isFetching,
    fetchNextPage,
    // @ts-expect-error range is always default 24hrs
  } = eventsQueries.list.useInfiniteQuery(projId, search);

  const flatData = useMemo(
    () => data?.pages?.flatMap((page) => page.data) ?? [],
    [data]
  );
  const totalDBRowCount = data?.pages?.[0]?.filteredCount ?? 0;
  const totalFetched = flatData.length;

  // called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 500px of the bottom of the table, fetch more data if we can
        if (
          scrollHeight - scrollTop - clientHeight < 500 &&
          !isFetching &&
          totalFetched < totalDBRowCount
        ) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalDBRowCount]
  );

  // a check on mount and after a fetch to see if the table is already scrolled to the bottom and immediately needs to fetch more data
  useEffect(() => {
    fetchMoreOnBottomReached(parentRef.current);
  }, [fetchMoreOnBottomReached]);

  const rowVirtualizer = useVirtualizer({
    count: flatData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 116,
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  });

  useEffect(() => {
    if (!error) return;
    toast.APIError(error);
  }, [error]);

  return (
    <div className="grid h-full grid-cols-[240px_1fr]">
      <aside className="border-r bg-background flex flex-col gap-3.5 p-2 pt-0">
        <ChannelSelector channels={channels ?? []} />
      </aside>
      <main className="flex flex-col px-1">
        <div className="mb-1 flex flex-col px-3 pt-3.5 h-[70px]">
          <div className="flex items-center w-full justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">
                {selectedChannel ? `${selectedChannel.name}` : "All Events"}
              </h1>
              {channelId && selectedChannel && (
                <>
                  <EditChannel channel={selectedChannel} />
                  <DeleteChannel channel={selectedChannel} />
                </>
              )}
            </div>
            <div>
              <Label htmlFor="search-event" className="sr-only">
                Search for an event
              </Label>
              <div className="flex items-center gap-4">
                {search.name && (
                  <span className="text-xs text-muted-foreground">
                    Showing {data?.pages[0].filteredCount} of{" "}
                    {data?.pages[0].totalCount} events
                  </span>
                )}
                <div className="relative">
                  <Input
                    id="search-event"
                    className="peer pe-9 ps-9 rounded-lg bg-background"
                    placeholder="Search..."
                    type="search"
                    value={search.name ?? ""}
                    onChange={(e) =>
                      navigate({
                        // @ts-expect-error range is always default 24hrs
                        search: { ...search, name: e.target.value },
                      })
                    }
                  />
                  <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                    {search.name && isFetching ? (
                      <LoaderCircle
                        className="animate-spin"
                        size={14}
                        strokeWidth={2}
                        role="status"
                        aria-label="Loading..."
                      />
                    ) : (
                      <Search size={14} strokeWidth={2} aria-hidden="true" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedChannel
              ? (selectedChannel.description ?? "")
              : "Showing all events"}
          </p>
        </div>
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
      </main>
    </div>
  );
}

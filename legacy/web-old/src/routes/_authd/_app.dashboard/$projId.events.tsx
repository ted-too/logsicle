import { ChannelSelector } from "@/components/events/channel-selector";
import { EventList } from "@/components/events/list";
import { EventsPageHeader } from "@/components/events/page-header";
import { channelsQueries } from "@/qc/queries/channels";
import { validateEventSearch } from "@/qc/queries/events";
import {
  createFileRoute,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { add, sub } from "date-fns";
import { useMemo } from "react";

export const Route = createFileRoute("/_authd/_app/dashboard/$projId/events")({
  beforeLoad: ({ search, params, context: { project } }) => {
    if (
      new Date(search.start).getTime() === 0 ||
      new Date(search.end).getTime() === 0
    ) {
      const start = sub(
        project.last_activity.app_logs
          ? new Date(project.last_activity.app_logs)
          : new Date(),
        { days: 1 }
      );
      throw redirect({
        to: "/dashboard/$projId/events",
        params,
        search: {
          ...search,
          start,
          end: add(new Date(), { hours: 4 }),
        },
      });
    }

    return { project };
  },
  loader: ({ context: { project } }) => project,
  validateSearch: validateEventSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const { projId } = Route.useParams();
  const search = useRouterState({
    select: (state) => state.location.search,
  });
  const { data: channels } =
    channelsQueries.eventChannels.list.useQuery(projId);

  const selectedChannel = useMemo(
    () => channels?.find((c) => c.id === search.channelId),
    [channels, search.channelId]
  );

  return (
    <div className="grid h-full grid-cols-[240px_1fr]">
      <aside className="border-r bg-background flex flex-col gap-3.5 p-2 pt-0">
        <ChannelSelector channels={channels ?? []} />
      </aside>
      <main className="flex flex-col px-1">
        <EventsPageHeader selectedChannel={selectedChannel} />
        <EventList />
      </main>
    </div>
  );
}

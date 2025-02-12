import { ChannelSelector } from "@/components/events/channel-selector";
import { EventList } from "@/components/events/list";
import { EventsPageHeader } from "@/components/events/page-header";
import { channelsQueries } from "@/qc/queries/channels";
import { validateEventSearch } from "@/qc/queries/events";
import { projectsQueries } from "@/qc/queries/projects";
import {
  createFileRoute,
  notFound,
  redirect,
  useRouterState
} from "@tanstack/react-router";
import { useMemo } from "react";

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

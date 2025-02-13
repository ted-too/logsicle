import { LogVolumeChart } from "@/components/app-logs/chart";
import { AppLogsPageHeader } from "@/components/app-logs/page-header";
import { AppLogTable } from "@/components/app-logs/table";
import { appLogsQueries } from "@/qc/queries/app-logs";
import { projectsQueries } from "@/qc/queries/projects";
import { GetAppLogsParams, getAppLogsSchema } from "@repo/api";
import {
  createFileRoute,
  notFound,
  redirect,
  retainSearchParams,
  stripSearchParams,
  useRouterState,
} from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/_authd/_app/dashboard/$projId/logs")({
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
  validateSearch: getAppLogsSchema.extend({
    tail: z.boolean().catch(false),
  }),
  search: {
    middlewares: [
      retainSearchParams(["start", "end"]),
      stripSearchParams({
        tail: false,
        page: 1,
      }),
    ],
  },
  component: RouteComponent,
});

function RouteComponent() {
  const project = Route.useLoaderData();
  const search = useRouterState({
    select: (state) => state.location.search,
  }) as GetAppLogsParams & { tail: boolean | undefined };
  const { data: metrics } = appLogsQueries.metrics.useQuery(project.id, {
    ...{ ...search, tail: undefined },
    interval: "1hr",
  });

  return (
    <div
      className="h-[var(--content-height)] w-full flex flex-col gap-3.5 py-3.5 px-6"
      style={{ "--chart-height": "8rem" } as React.CSSProperties}
    >
      <AppLogsPageHeader project={project} />
      <LogVolumeChart
        metrics={metrics === null ? [] : (metrics ?? [])}
        start={search.start!}
        end={search.end!}
      />
      <AppLogTable className="w-full h-[calc(var(--content-height)-var(--chart-height)-2.25rem-0.875rem*2)]" />
    </div>
  );
}

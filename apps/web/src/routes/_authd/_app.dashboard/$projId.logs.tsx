import { AppLogsPageHeader } from "@/components/app-logs/page-header";
import { AppLogTable } from "@/components/app-logs/table";
import { appLogSearchSchema } from "@/qc/queries/app-logs";
import { projectsQueries } from "@/qc/queries/projects";
import {
  createFileRoute,
  notFound,
  redirect,
  retainSearchParams,
  stripSearchParams,
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
  validateSearch: appLogSearchSchema.extend({
    tail: z.boolean().catch(false),
  }),
  search: {
    middlewares: [
      retainSearchParams(["start", "end"]),
      stripSearchParams({
        tail: false,
      }),
    ],
  },
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const project = Route.useLoaderData();

  return (
    <div className="h-[var(--content-height)] w-full flex flex-col gap-3.5 py-3.5 px-6">
      <AppLogsPageHeader project={project} />
      <div className="w-full h-32 bg-red-50"></div>
      {/* <EventsPageHeader selectedChannel={selectedChannel} /> */}
      <main className="w-full h-[calc(var(--content-height)-8rem-2.25rem-0.875rem*2)] h- grow">
        <AppLogTable />
      </main>
    </div>
  );
}

import { LogVolumeChart } from "@/components/app-logs/chart";
import { AppLogsPageHeader } from "@/components/app-logs/page-header";
import { AppLogTable } from "@/components/app-logs/table";
import { appLogsQueries } from "@/qc/queries/app-logs";
import { projectsQueries } from "@/qc/queries/projects";
import {
  GetAppLogsParams,
  getAppLogsSchema,
  suggestInterval,
  ValidInterval,
  validIntervalSchema,
} from "@repo/api";
import {
  createFileRoute,
  notFound,
  redirect,
  retainSearchParams,
  stripSearchParams,
  useRouterState,
} from "@tanstack/react-router";
import { add, sub } from "date-fns";
import { z } from "zod";

export const Route = createFileRoute("/_authd/_app/dashboard/$projId/logs")({
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
        to: "/dashboard/$projId/logs",
        params,
        search: {
          ...search,
          start,
          end: add(new Date(), { hours: 6 }),
        },
      });
    }
    // @ts-expect-error do this so we can catch it properly on the beforeLoad
    if (search.interval === "") {
      console.log("Catch interval on route");
      const interval = suggestInterval(search.start, search.end);
      throw redirect({
        to: "/dashboard/$projId/logs",
        params,
        search: {
          ...search,
          interval,
        },
      });
    }

    return { project };
  },
  loader: ({ context: { project } }) => project,
  validateSearch: getAppLogsSchema.extend({
    tail: z.boolean().catch(false),
    // @ts-expect-error do this so we can catch it properly on the beforeLoad
    interval: validIntervalSchema.catch(""),
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
  return (
    <div
      className="h-[var(--content-height)] w-full flex flex-col gap-3.5 py-3.5 px-6"
      style={
        {
          "--chart-height": "8rem",
          "--table-height":
            "var(--content-height)-var(--chart-height)-2.25rem-0.875rem*2",
        } as React.CSSProperties
      }
    >
      <AppLogsPageHeader />
      <LogVolumeChart />
      <AppLogTable className="w-full min-h-[var(--table-height)] max-h--[var(--table-height)]" />
    </div>
  );
}

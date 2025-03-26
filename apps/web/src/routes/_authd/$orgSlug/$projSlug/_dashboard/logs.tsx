import { LogVolumeChart } from "@/components/app-logs/chart";
import { AppLogsPageHeader } from "@/components/app-logs/page-header";
import { AppLogTable } from "@/components/app-logs/table";
import { getAppMetricsSchema, listAppLogsSchema } from "@repo/api";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute(
  "/_authd/$orgSlug/$projSlug/_dashboard/logs"
)({
  validateSearch: listAppLogsSchema.merge(getAppMetricsSchema).extend({
    tail: z.boolean().catch(false),
  }),
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

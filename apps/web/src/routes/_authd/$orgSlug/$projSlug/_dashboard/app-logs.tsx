import { AppLogsTable } from "@/components/logs-table/app";
import { getAppLogsQueryOptions, getAppTimelineChartQueryOptions } from "@/qc/resources/app";
import { getAppMetricsSchema, listAppLogsSchema } from "@repo/api";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { z } from "zod";

const defaultValues = {
  tail: false,
};

const validateSearch = listAppLogsSchema.merge(getAppMetricsSchema).extend({
  tail: z.coerce.boolean().catch(false),
});

export type SearchParams = z.infer<typeof validateSearch>;

export const Route = createFileRoute(
  "/_authd/$orgSlug/$projSlug/_dashboard/app-logs"
)({
  validateSearch,
  loader: async ({ context, location }) => {
    const { tail: _, ...search } = location.search as SearchParams;
    await context.queryClient.prefetchInfiniteQuery(
      getAppLogsQueryOptions(
        context.currentProject.id,
        search
      )
    );
    await context.queryClient.prefetchQuery(
      getAppTimelineChartQueryOptions(
        context.currentProject.id,
        search
      )
    );

    return {
      dehydrated: dehydrate(context.queryClient),
    };
  },
  component: RouteComponent,
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
});

function RouteComponent() {
  const { dehydrated } = Route.useLoaderData();
  return (
    <HydrationBoundary state={dehydrated}>
      <AppLogsTable />
    </HydrationBoundary>
  );
}

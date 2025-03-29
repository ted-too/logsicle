import { RequestLogsTable } from "@/components/logs-table/request";
import { getRequestLogsQueryOptions, getRequestTimelineChartQueryOptions } from "@/qc/resources/request";
import { getRequestMetricsSchema, listRequestLogsSchema } from "@repo/api";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { z } from "zod";

const defaultValues = {
  tail: false,
};

const validateSearch = listRequestLogsSchema.merge(getRequestMetricsSchema).extend({
  tail: z.coerce.boolean().catch(false),
});

export type SearchParams = z.infer<typeof validateSearch>;

export const Route = createFileRoute(
  "/_authd/$orgSlug/$projSlug/_dashboard/request-logs"
)({
  validateSearch,
  loader: async ({ context, location }) => {
    const { tail: _, ...search } = location.search as SearchParams;
    await context.queryClient.prefetchInfiniteQuery(
      getRequestLogsQueryOptions(
        context.currentProject.id,
        search
      )
    );
    await context.queryClient.prefetchQuery(
      getRequestTimelineChartQueryOptions(
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
      <RequestLogsTable />
    </HydrationBoundary>
  );
}

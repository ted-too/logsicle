import { AppLogsTable } from "@/components/logs-table/app";
import { appDataOptions } from "@/components/logs-table/query-options";
import { getAppMetricsSchema, listAppLogsSchema } from "@repo/api";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const validateSearch = listAppLogsSchema.merge(getAppMetricsSchema).extend({
  tail: z.boolean().catch(false),
});

type SearchParams = z.infer<typeof validateSearch>;

export const Route = createFileRoute(
  "/_authd/$orgSlug/$projSlug/_dashboard/app-logs"
)({
  validateSearch,
  loader: async ({ context, location }) => {
    await context.queryClient.prefetchInfiniteQuery(
      appDataOptions(context.currentProject.id, location.search as SearchParams)
    );
  },
  component: AppLogsTable,
});

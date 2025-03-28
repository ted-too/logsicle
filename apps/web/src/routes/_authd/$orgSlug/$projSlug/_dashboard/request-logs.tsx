import { getRequestMetricsSchema, listRequestLogsSchema } from '@repo/api'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const validateSearch = listRequestLogsSchema.merge(getRequestMetricsSchema).extend({
  tail: z.coerce.boolean().catch(false),
});

export type SearchParams = z.infer<typeof validateSearch>;

export const Route = createFileRoute(
  '/_authd/$orgSlug/$projSlug/_dashboard/request-logs',
)({
  validateSearch,
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authd/$orgSlug/$projSlug/_dashboard/request-logs"!</div>
}

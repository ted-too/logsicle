import { getRequestMetricsSchema, listRequestLogsSchema } from '@repo/api'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute(
  '/_authd/$orgSlug/$projSlug/_dashboard/request-logs',
)({
  validateSearch: listRequestLogsSchema.merge(getRequestMetricsSchema).extend({
    tail: z.boolean().catch(false),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authd/$orgSlug/$projSlug/_dashboard/request-logs"!</div>
}

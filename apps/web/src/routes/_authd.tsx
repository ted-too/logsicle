import { userQueries } from '@/qc/queries/auth'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authd')({
  beforeLoad: async ({ location, context }) => {
    const user = await context.queryClient.ensureQueryData(
      userQueries.getUserQueryOptions,
    )
    console.log('user', user)
    if (!user) {
      throw redirect({
        to: '/auth/sign-in',
        search: {
          // Use the current location to power a redirect after login
          // (Do not use `router.state.resolvedLocation` as it can
          // potentially lag behind the actual current location)
          redirect: location.href,
        },
      })
    }
  },
})

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/sign-out')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/auth/sign-out"!</div>
}

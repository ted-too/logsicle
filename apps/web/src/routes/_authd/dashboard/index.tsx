import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authd/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/"!</div>
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authd/$orgSlug/$projSlug/_dashboard/metrics",
)({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_authd/$orgSlug/$projSlug/_dashboard/metrics"!</div>;
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authd/$orgSlug/$projSlug/_dashboard/test",
)({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_authd/$orgSlug/$projSlug/_dashboard/test"!</div>;
}

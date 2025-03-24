import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd/$orgSlug/$projSlug/_dashboard/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_authd/_dashboard/$orgSlug/$projSlug/"!</div>;
}

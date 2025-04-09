import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd/$orgSlug/$projSlug/_dashboard/")({
	beforeLoad: ({ context: { currentProject, currentUserOrg } }) => {
		throw redirect({
			to: "/$orgSlug/$projSlug/app-logs",
			params: {
				orgSlug: currentUserOrg.organization.slug,
				projSlug: currentProject.slug,
			},
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_authd/_dashboard/$orgSlug/$projSlug/"!</div>;
}

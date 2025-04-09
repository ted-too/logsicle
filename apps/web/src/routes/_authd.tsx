import { getUserQueryOptions } from "@/qc/auth/basic";
import { listInvitationsQueryOptions } from "@/qc/teams/invitations";
import { listUserOrganizationMembershipsQueryOptions } from "@/qc/teams/organizations";
import type { TeamMembershipWithOrganization, UserSession } from "@repo/api";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd")({
	beforeLoad: async ({ location, context }) => {
		let data: UserSession | null = null;
		let userOrgs: TeamMembershipWithOrganization[] | null = null;
		try {
			data = await context.queryClient.ensureQueryData(getUserQueryOptions());
			if (!data) throw new Error("User not found");
			userOrgs = await context.queryClient.ensureQueryData(
				listUserOrganizationMembershipsQueryOptions(),
			);
		} catch (error) {
			if (
				(error instanceof Error && error.message === "User not found") ||
				(error as any)?.error === "Not authenticated"
			) {
				throw redirect({
					to: "/",
				});
			}
			throw error;
		}

		const { user, session } = data;

		if (!user.has_onboarded && !location.pathname.includes("/onboarding")) {
			throw redirect({
				to: "/$orgSlug/onboarding",
				params: {
					orgSlug: userOrgs?.[0].organization.slug || "initial-setup",
				},
			});
		}

		await context.queryClient.prefetchQuery(listInvitationsQueryOptions());

		return {
			...context,
			user,
			userOrgs,
			session,
		};
	},
	component: AuthedLayout,
});

function AuthedLayout() {
	return <Outlet />;
}

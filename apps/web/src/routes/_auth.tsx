import { getUserQueryOptions } from "@/qc/auth/basic";
import { listUserOrganizationMembershipsQueryOptions } from "@/qc/teams/organizations";
import type { TeamMembershipWithOrganization, UserSession } from "@repo/api";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
	beforeLoad: async ({ location, context }) => {
		let data: UserSession | null = null;
		let userOrgs: TeamMembershipWithOrganization[] | null = null;
		try {
			data = await context.queryClient.ensureQueryData(getUserQueryOptions());
			if (!data) return { user: null, userOrgs: [] };
			userOrgs = await context.queryClient.ensureQueryData(
				listUserOrganizationMembershipsQueryOptions(),
			);
		} catch (error) {
			return { user: null, userOrgs: [] };
		}

		const { user } = data;

		const defaultOrg = userOrgs?.[0].organization;

		if (
			(!user.has_onboarded || !defaultOrg.projects?.[0]) &&
			!location.pathname.includes("/onboarding")
		) {
			throw redirect({
				to: "/$orgSlug/onboarding",
				params: {
					orgSlug: defaultOrg.slug,
				},
			});
		}

		throw redirect({
			to: "/$orgSlug/$projSlug",
			params: {
				orgSlug: defaultOrg.slug,
				projSlug: defaultOrg.projects?.[0].slug,
			},
		});
	},
	component: AuthLayout,
});

function AuthLayout() {
	// No need to dehydrate here, because the _authd route will do that
	return <Outlet />;
}

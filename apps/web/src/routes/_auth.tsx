import { userQueryKey } from "@/qc/auth/basic";
import { userOrganizationsQueryKey } from "@/qc/teams/organizations";
import { getUser } from "@/server/auth/basic";
import { listUserOrganizationMemberships } from "@/server/teams/organizations";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
	beforeLoad: async ({ location, context }) => {
		const { data: user, error } = await getUser();

		if (error || !user) return { user: null, userOrgs: [] };

		void context.queryClient.setQueryData(userQueryKey, user);

		const { data: userOrgs, error: userOrgsError } =
			await listUserOrganizationMemberships();

		if (userOrgsError) return Promise.reject(userOrgsError);

		void context.queryClient.setQueryData(userOrganizationsQueryKey, userOrgs);

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
  return <Outlet />;
}

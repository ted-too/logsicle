import { userQueryKey } from "@/qc/auth/basic";
import { userOrganizationsQueryKey } from "@/qc/teams/organizations";
import { getUser } from "@/server/auth/basic";
import { listUserOrganizationMemberships } from "@/server/teams/organizations";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd")({
  beforeLoad: async ({ location, context }) => {
    const { data: user, error } = await getUser();

    if (error) {
      throw redirect({
        to: "/",
      });
    }

    void context.queryClient.setQueryData(userQueryKey, user);

    const { data: userOrgs, error: userOrgsError } =
      await listUserOrganizationMemberships();

    if (userOrgsError) return Promise.reject(userOrgsError);

    void context.queryClient.setQueryData(userOrganizationsQueryKey, userOrgs);

    if (!user.has_onboarded && !location.pathname.includes("/onboarding")) {
      throw redirect({
        to: "/$orgSlug/onboarding",
        params: {
          orgSlug: userOrgs?.[0].organization.slug || "initial-setup",
        },
      });
    }

    return {
      user,
      userOrgs,
    };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return <Outlet />;
}

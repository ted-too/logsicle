import { getUserQueryKey } from "@/qc/queries/auth";
import { userOrganizationsQueryKey } from "@/qc/queries/organizations";
import { getUser } from "@/server/auth";
import { listUserOrganizations } from "@/server/organizations";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ location, context }) => {
    const { data: user, error } = await getUser();

    // This is a redundant check, but it's here to be safe
    if (error) {
      throw redirect({
        href: `${import.meta.env.VITE_API_URL}/v1/auth/sign-in${location.pathname === "/" ? "" : `?redirect=${encodeURIComponent(location.pathname)}`}`,
      });
    }

    void context.queryClient.setQueryData(getUserQueryKey, user);

    const { data: userOrgs, error: userOrgsError } =
      await listUserOrganizations();

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
  component: BaseLayout,
});

function BaseLayout() {
  return <Outlet />;
}

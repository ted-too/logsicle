import { getUserQueryOptions } from "@/qc/auth/basic";
import { listInvitationsQueryOptions } from "@/qc/teams/invitations";
import { listUserOrganizationMembershipsQueryOptions } from "@/qc/teams/organizations";
import type { TeamMembershipWithOrganization, UserSession } from "@repo/api";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd")({
  beforeLoad: async ({ location, context }) => {
    let data: UserSession | null = null;
    let userOrgs: TeamMembershipWithOrganization[] | null = null;
    try {
      data = await context.queryClient.ensureQueryData(getUserQueryOptions());
      if (!data) throw new Error("User not found");
      userOrgs = await context.queryClient.ensureQueryData(
        listUserOrganizationMembershipsQueryOptions()
      );
    } catch (error) {
      console.log(error);
      throw redirect({
        to: "/",
      });
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
      dehydrated: dehydrate(context.queryClient),
      user,
      userOrgs,
      session,
    };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { dehydrated } = Route.useRouteContext();
  return (
    <HydrationBoundary state={dehydrated}>
      <Outlet />
    </HydrationBoundary>
  );
}

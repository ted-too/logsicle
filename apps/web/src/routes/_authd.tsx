import { userQueries } from "@/qc/queries/auth";
import { organizationsQueries } from "@/qc/queries/organizations";
import { getUser } from "@repo/api";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { getHeaders } from "@tanstack/react-start/server";

export const Route = createFileRoute("/_authd")({
  beforeLoad: async ({ location, context }) => {
    const headers = getHeaders() as HeadersInit;

    const user = await getUser({
      baseURL: import.meta.env.VITE_API_URL,
      headers,
    });

    if (!user) {
      throw redirect({
        href: `${import.meta.env.VITE_API_URL}/v1/auth/sign-in${location.pathname === "/" ? "" : `?redirect=${encodeURIComponent(location.pathname)}`}`,
      });
    }

    void context.queryClient.setQueryData(
      userQueries.getUserQueryOptions({
        headers,
      }).queryKey,
      user
    );

    const userOrgs = await context.queryClient.ensureQueryData(
      organizationsQueries.listQueryOptions({
        headers,
      })
    );

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

import { ensureUser, userQueries } from "@/qc/queries/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd")({
  beforeLoad: async ({ location, context }) => {
    const user = ensureUser(
      await context.queryClient.ensureQueryData(
        userQueries.getUserQueryOptions
      ),
      location.href
    );

    if (!user.has_onboarded && location.pathname !== "/dashboard/onboarding") {
      throw redirect({
        to: "/dashboard/onboarding",
      });
    }
  },
});

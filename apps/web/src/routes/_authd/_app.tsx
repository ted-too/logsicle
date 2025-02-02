import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ensureUser, userQueries } from "@/qc/queries/auth";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd/_app")({
  loader: async ({ context, location }) => {
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

    return user;
  },
  component: LayoutComponent,
});

function LayoutComponent() {
  const { data } = userQueries.getUser.useSuspenseQuery();
  return (
    <div className="flex w-full h-svh">
      <AppSidebar user={data} />
      <div className="flex flex-col h-full w-full transition-[width] duration-200 ease-linear">
        <AppHeader />
        <Outlet />
      </div>
    </div>
  );
}

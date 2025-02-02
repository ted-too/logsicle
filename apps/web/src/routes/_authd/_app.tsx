import { AppSidebar, ContentWrapper } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ensureUser, userQueries } from "@/qc/queries/auth";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";

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
  const [open, setOpen] = useState(false);

  const handleMouseEnter = () => {
    setOpen(true);
  };

  const handleMouseLeave = () => {
    setOpen(false);
  };

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <div className="flex w-svw h-svh">
        <AppSidebar
          user={data}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
        <ContentWrapper>
          <Outlet />
        </ContentWrapper>
      </div>
    </SidebarProvider>
  );
}

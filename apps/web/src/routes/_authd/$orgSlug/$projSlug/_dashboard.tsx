import { AppSidebar, ContentWrapper } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_authd/$orgSlug/$projSlug/_dashboard")({
  beforeLoad: async ({ context, params }) => {
    const { orgSlug, projSlug } = params;
    const currentUserOrg = context.userOrgs?.find(
      (org) => org.organization.slug === orgSlug
    );

    const currentProject = currentUserOrg?.organization.projects.find(
      (proj) => proj.slug === projSlug
    );

    if (!currentUserOrg || !currentProject) {
      throw notFound();
    }

    return {
      ...context,
      currentUserOrg,
      currentProject,
    };
  },
  component: LayoutComponent,
});

function LayoutComponent() {
  const [open, setOpen] = useState(false);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <div className="flex w-svw h-svh">
        <AppSidebar />
        <ContentWrapper>
          <Outlet />
        </ContentWrapper>
      </div>
    </SidebarProvider>
  );
}

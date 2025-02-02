import { AppHeader } from "@/components/layout/app-header";
import {
  APP_SIDEBAR_WIDTH,
  AppSidebar,
  SECONDARY_SIDEBAR_WIDTH,
} from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ensureAuthenticated } from "@/lib/auth.server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await ensureAuthenticated();

  if (!user.has_onboarded) redirect("/dashboard/onboarding");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset
        style={
          {
            "--app-sidebar-width": APP_SIDEBAR_WIDTH,
            "--secondary-sidebar-width": SECONDARY_SIDEBAR_WIDTH,
          } as React.CSSProperties
        }
      >
        <AppHeader user={user} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

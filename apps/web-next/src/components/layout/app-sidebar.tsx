"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Translation } from "solar-icon-set";

// Menu items.
const getMenuList = (pathname: string) => [
  {
    title: "Events",
    url: "/dashboard/events",
    icon: Translation,
    active: pathname === "/dashboard/events",
  },
];

const getSecondaryMenuList = (pathname: string) => [
  {
    title: "Settings",
    url: "/settings/general",
    icon: Settings,
    active: pathname.startsWith("/settings"),
  },
];

export const APP_SIDEBAR_WIDTH = "4rem";

interface MenuItem {
  title: string;
  url: string;
  icon: typeof Translation;
  active: boolean;
}

interface MenuItemsProps {
  items: MenuItem[];
  pathname: string;
  iconStyle?:
    | "Broken"
    | "LineDuotone"
    | "Linear"
    | "Outline"
    | "Bold"
    | "BoldDuotone";
}

function MenuItems({ items, pathname, iconStyle }: MenuItemsProps) {
  return items.map((item) => (
    <Tooltip key={item.title}>
      <TooltipTrigger asChild>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Button
              variant={item.active ? "secondary" : "ghost"}
              disabled={item.url === "/" ? pathname === "/init" : false}
              className={cn(
                "size-10",
                item.active
                  ? "bg-lime-100 hover:bg-lime-100/80 dark:bg-lime-600"
                  : "hover:bg-lime-100 dark:hover:bg-accent"
              )}
              size="icon"
              asChild
            >
              <Link href={item.url}>
                <item.icon
                  size={18}
                  className="shrink-0 scale-105"
                  iconStyle={iconStyle || "Broken"}
                />
              </Link>
            </Button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs p-1.5">
        <p>{item.title}</p>
      </TooltipContent>
    </Tooltip>
  ));
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <Sidebar
        variant="inset"
        side="left"
        collapsible="none"
        style={
          {
            "--sidebar-width": APP_SIDEBAR_WIDTH,
            // "--sidebar-width-mobile": "20rem",
          } as React.CSSProperties
        }
        className="h-svh border-r border-sidebar-border z-20"
      >
        <SidebarContent className="justify-between pb-6">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <div className="bg-[#F6FFD9] p-3 pb-[calc(0.75rem+1px)]">
                <Image
                  src="/favicon.svg"
                  alt="l"
                  width={44}
                  height={44}
                  className="object-cover"
                />
              </div>
              <SidebarMenu className="items-center gap-3 p-2">
                <MenuItems items={getMenuList(pathname)} pathname={pathname} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="items-center gap-3 p-2">
                <MenuItems
                  items={getSecondaryMenuList(pathname)}
                  pathname={pathname}
                  iconStyle="Bold"
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
}

export const SECONDARY_SIDEBAR_WIDTH = "13rem";

export function SecondarySidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[--content-height]">
      <Sidebar
        variant="sidebar"
        collapsible="offcanvas"
        className="left-[var(--app-sidebar-width)] inset-y-auto bottom-0"
        containerStyle={
          {
            "--sidebar-width": "var(--secondary-sidebar-width)",
            "--sidebar-height": "var(--content-height)",
          } as React.CSSProperties
        }
      >
        <SidebarContent className="gap-0 w-[--sidebar-width] relative">
          <ScrollArea className="w-[var(--sidebar-width)] h-[var(--content-height)]">
            {children}
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
      <SidebarTrigger className="absolute bottom-4 -right-4 z-50" />
    </div>
  );
}

export function SecondarySidebarContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open } = useSidebar();
  return (
    <div
      className={cn(
        `w-[calc(100svw-var(--app-sidebar-width))] relative flex`,
        open
          ? `[--content-width:calc(100vw-var(--app-sidebar-width)-var(--secondary-sidebar-width))]`
          : `[--content-width:calc(100vw-var(--app-sidebar-width))]`,
        className
      )}
    >
      {children}
    </div>
  );
}

"use client";
import {
  Bell,
  BookIcon,
  BuildingIcon,
  ChevronRight,
  ChevronsUpDown,
  LibraryBigIcon,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import type * as React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSubContent,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { DialogAction } from "@/components/shared/dialog-action";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Brodcast,
  Category2,
  Global,
  Warning2,
  type IconProps,
} from "iconsax-react";
import { TestTubesIcon } from "lucide-react";
import { LogsIcon, TracesIcon } from "../icons";
import { AddOrganization } from "../teams/add-org";
import {
  Link,
  useParams,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listUserOrganizationMembershipsQueryOptions } from "@/qc/teams/organizations";
import { Logo } from "../shared/logo";
import { listInvitationsQueryOptions } from "@/qc/teams/invitations";
import { acceptInvitation } from "@/server/teams/invitations";
import { UserNav } from "./user-nav";
import { AddProject } from "../teams/add-project";
import type { TeamMembership } from "@repo/api";

type Icon = LucideIcon | React.ComponentType<IconProps>;

type SingleNavItem = {
  isSingle?: true;
  title: string;
  url: string;
  icon?: Icon;
  isEnabled?: (userMembership: TeamMembership) => boolean;
};

// NavItem type
// Consists of a single item or a group of items
// If `isSingle` is true or undefined, the item is a single item
// If `isSingle` is false, the item is a group of items
type NavItem =
  | SingleNavItem
  | {
      isSingle: false;
      title: string;
      icon: LucideIcon;
      items: SingleNavItem[];
      isEnabled?: (userMembership: TeamMembership) => boolean;
    };

// ExternalLink type
// Represents an external link item (used for the help section)
type ExternalLink = {
  name: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  isEnabled?: (userMembership: TeamMembership) => boolean;
};

// Menu type
// Consists of home, settings, and help items
type Menu = {
  resources: NavItem[];
  settings: NavItem[];
  help: ExternalLink[];
};

// Menu items
// Consists of unfiltered home, settings, and help items
// The items are filtered based on the user's role and permissions
// The `isEnabled` function is called to determine if the item should be displayed
const MENU: Menu = {
  resources: [
    {
      isSingle: true,
      title: "Events",
      url: "/$orgSlug/$projSlug/events",
      icon: Brodcast,
    },
    {
      isSingle: true,
      title: "App Logs",
      url: "/$orgSlug/$projSlug/app-logs",
      icon: LogsIcon,
    },
    {
      isSingle: true,
      title: "Request Logs",
      url: "/$orgSlug/$projSlug/request-logs",
      icon: Global,
    },
    {
      isSingle: true,
      title: "Metrics",
      url: "/$orgSlug/$projSlug/metrics",
      icon: TestTubesIcon,
    },
    {
      isSingle: true,
      title: "Traces",
      url: "/$orgSlug/$projSlug/traces",
      icon: TracesIcon,
    },
  ],

  settings: [
    {
      isSingle: true,
      title: "Alerts",
      url: "/$orgSlug/$projSlug/alerts",
      icon: Warning2,
    },
    {
      isSingle: true,
      title: "Organization Settings",
      url: "/$orgSlug/$projSlug/settings/organization",
      icon: BuildingIcon,
      isEnabled: (userMembership) =>
        ["admin", "owner"].includes(userMembership.role),
    },
    {
      isSingle: true,
      title: "Project Settings",
      url: "/$orgSlug/$projSlug/settings/project",
      icon: LibraryBigIcon,
      isEnabled: (userMembership) =>
        ["admin", "owner"].includes(userMembership.role),
    },
  ],

  help: [
    {
      name: "Documentation",
      url: "https://logsicle.app/docs",
      icon: BookIcon,
    },
  ],
} as const;

/**
 * Creates a menu based on the current user's role and permissions
 * @returns a menu object with the home, settings, and help items
 */
function createMenuForAuthUser(opts: { userMembership: TeamMembership }): Menu {
  return {
    // Filter the home items based on the user's role and permissions
    // Calls the `isEnabled` function if it exists to determine if the item should be displayed
    resources: MENU.resources.filter((item) =>
      !item.isEnabled ? true : item.isEnabled(opts.userMembership)
    ),
    // Filter the settings items based on the user's role and permissions
    // Calls the `isEnabled` function if it exists to determine if the item should be displayed
    settings: MENU.settings.filter((item) =>
      !item.isEnabled ? true : item.isEnabled(opts.userMembership)
    ),
    // Filter the help items based on the user's role and permissions
    // Calls the `isEnabled` function if it exists to determine if the item should be displayed
    help: MENU.help.filter((item) =>
      !item.isEnabled ? true : item.isEnabled(opts.userMembership)
    ),
  };
}

/**
 * Determines if an item url is active based on the current pathname
 * @returns true if the item url is active, false otherwise
 */
function isActiveRoute({
  itemUrl,
  pathname,
}: {
  /** The url of the item. Usually obtained from `item.url` */
  itemUrl: string;
  /** The current pathname. Usually obtained from `usePathname()` */
  pathname: string;
}): boolean {
  if (!pathname) return false;

  // Remove the first two path segments (orgSlug and projSlug)
  const itemUrlParts = itemUrl.split("/").slice(3).join("/");
  const pathnameParts = pathname.split("/").slice(3).join("/");

  if (!pathnameParts) return itemUrlParts === "";
  if (!itemUrlParts) return false;

  if (pathnameParts === itemUrlParts) return true;

  if (pathnameParts.startsWith(itemUrlParts)) {
    const nextChar = pathnameParts.charAt(itemUrlParts.length);
    return nextChar === "/";
  }

  return false;
}

/**
 * Finds the active nav item based on the current pathname
 * @returns the active nav item with `SingleNavItem` type or undefined if none is active
 */
function findActiveNavItem(
  navItems: NavItem[],
  pathname: string
): SingleNavItem | undefined {
  const found = navItems.find((item) =>
    item.isSingle !== false
      ? // The current item is single, so check if the item url is active
        isActiveRoute({ itemUrl: item.url, pathname })
      : // The current item is not single, so check if any of the sub items are active
        item.items.some((item) =>
          isActiveRoute({ itemUrl: item.url, pathname })
        )
  );

  if (found?.isSingle !== false) {
    // The found item is single, so return it
    return found;
  }

  // The found item is not single, so find the active sub item
  return found?.items.find((item) =>
    isActiveRoute({ itemUrl: item.url, pathname })
  );
}

interface Props {
  children: React.ReactNode;
}

function SidebarLogo() {
  const { state, isMobile } = useSidebar();
  const { session } = useRouteContext({
    from: "/_authd/$orgSlug/$projSlug/_dashboard",
  });

  const { orgSlug, projSlug } = useParams({
    from: "/_authd/$orgSlug/$projSlug/_dashboard",
  });

  const { data: userOrgs, isLoading } = useQuery(
    listUserOrganizationMembershipsQueryOptions()
  );

  const activeOrganization = userOrgs?.find(
    (org) => org.organization_id === session.active_organization
  )?.organization;

  return (
    <>
      {isLoading ? (
        <div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[5vh] pt-4">
          <Loader2 className="animate-spin size-4" />
        </div>
      ) : (
        <SidebarMenu
          className={cn(
            "flex gap-2",
            state === "collapsed"
              ? "flex-col"
              : "flex-row justify-between items-center"
          )}
        >
          {/* Organization Logo and Selector */}
          <SidebarMenuItem className={"w-full"}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size={state === "collapsed" ? "sm" : "lg"}
                  className={cn(
                    "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground ",
                    state === "collapsed" && "-translate-x-2 h-10 w-10"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2",
                      state === "collapsed" && "justify-center"
                    )}
                  >
                    <Logo
                      className={cn("transition-all size-8 shrink-0")}
                      logoUrl={activeOrganization?.logo || undefined}
                    />
                    <div
                      className={cn(
                        "flex flex-col items-start whitespace-nowrap",
                        state === "collapsed" && "hidden"
                      )}
                    >
                      <p className="text-sm font-medium leading-none">
                        {activeOrganization?.name ?? "Select Organization"}
                      </p>
                    </div>
                  </div>
                  <ChevronsUpDown
                    className={cn("ml-auto", state === "collapsed" && "hidden")}
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="rounded-lg min-w-[12.5rem]"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Organizations
                </DropdownMenuLabel>
                {userOrgs?.map(({ organization: org }) => (
                  <div className="flex flex-row justify-between" key={org.name}>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="w-full items-center gap-2 p-2">
                        <Logo
                          className="size-4"
                          logoUrl={org.logo ?? undefined}
                        />
                        <span>{org.name}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent
                          className="min-w-[12.5rem]"
                          sideOffset={4}
                        >
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Projects
                          </DropdownMenuLabel>
                          {org.projects.map((project) => (
                            <DropdownMenuItem key={project.id} asChild>
                              <Link
                                to="/$orgSlug/$projSlug"
                                data-active={
                                  project.slug === projSlug &&
                                  org.slug === orgSlug
                                }
                                params={{
                                  orgSlug: org.slug,
                                  projSlug: project.slug,
                                }}
                              >
                                {project.name}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <AddProject />
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </div>
                ))}
                <DropdownMenuSeparator />
                <AddOrganization />
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      )}
    </>
  );
}

export function AppSidebar({ children }: Props) {
  const { sidebarStates, currentUserOrg } = useRouteContext({
    from: "/_authd/$orgSlug/$projSlug/_dashboard",
  });

  const { orgSlug, projSlug } = useParams({
    from: "/_authd/$orgSlug/$projSlug/_dashboard",
  });

  const router = useRouter();
  const pathname = router.latestLocation.pathname;

  const {
    resources: filteredHome,
    settings: filteredSettings,
    help,
  } = createMenuForAuthUser({ userMembership: currentUserOrg });

  const { data: invitations, refetch: refetchInvitations } = useQuery(
    listInvitationsQueryOptions()
  );
  const { refetch } = useQuery(listUserOrganizationMembershipsQueryOptions());

  return (
    <SidebarProvider
      defaultOpen={sidebarStates.sidebarState}
      style={
        {
          "--sidebar-width": "19.5rem",
          "--sidebar-width-mobile": "19.5rem",
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader>
          <SidebarLogo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuButton asChild tooltip="Dashboard">
                <Link
                  to="/$orgSlug/$projSlug"
                  data-active={isActiveRoute({
                    itemUrl: `/${orgSlug}/${projSlug}`,
                    pathname,
                  })}
                  params={{ orgSlug, projSlug }}
                  className="flex w-full items-center gap-2"
                >
                  <Category2 className="text-primary" color="currentColor" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Resources</SidebarGroupLabel>
            <SidebarMenu>
              {filteredHome.map((item) => {
                const isSingle = item.isSingle !== false;
                const isActive = isSingle
                  ? isActiveRoute({ itemUrl: item.url, pathname })
                  : item.items.some((item) =>
                      isActiveRoute({ itemUrl: item.url, pathname })
                    );

                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      {isSingle ? (
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <Link
                            to={item.url}
                            params={{ orgSlug, projSlug }}
                            data-active={isActive}
                            className="flex w-full items-center gap-2"
                          >
                            {item.icon && (
                              <item.icon
                                className={cn(isActive && "text-primary")}
                                color="currentColor"
                              />
                            )}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      ) : (
                        <>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={item.title}
                              isActive={isActive}
                            >
                              {item.icon && <item.icon color="currentColor" />}

                              <span>{item.title}</span>
                              {item.items?.length && (
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              )}
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.items?.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton asChild>
                                    <Link
                                      to={subItem.url}
                                      data-active={isActive}
                                      className="flex w-full items-center"
                                    >
                                      {subItem.icon && (
                                        <span className="mr-2">
                                          <subItem.icon
                                            className={cn(
                                              "h-4 w-4 text-muted-foreground",
                                              isActive && "text-primary"
                                            )}
                                          />
                                        </span>
                                      )}
                                      <span>{subItem.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarMenu className="gap-1">
              {filteredSettings.map((item) => {
                const isSingle = item.isSingle !== false;
                const isActive = isSingle
                  ? isActiveRoute({ itemUrl: item.url, pathname })
                  : item.items.some((item) =>
                      isActiveRoute({ itemUrl: item.url, pathname })
                    );

                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      {isSingle ? (
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <Link
                            to={item.url}
                            params={{ orgSlug, projSlug }}
                            data-active={isActive}
                            className="flex w-full items-center gap-2"
                          >
                            {item.icon && (
                              <item.icon
                                className={cn(isActive && "text-primary")}
                                color="currentColor"
                              />
                            )}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      ) : (
                        <>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={item.title}
                              isActive={isActive}
                            >
                              {item.icon && <item.icon color="currentColor" />}

                              <span>{item.title}</span>
                              {item.items?.length && (
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              )}
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.items?.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton asChild>
                                    <Link
                                      to={subItem.url}
                                      params={{ orgSlug, projSlug }}
                                      data-active={isActive}
                                      className="flex w-full items-center"
                                    >
                                      {subItem.icon && (
                                        <span className="mr-2">
                                          <subItem.icon
                                            className={cn(
                                              "h-4 w-4 text-muted-foreground",
                                              isActive && "text-primary"
                                            )}
                                          />
                                        </span>
                                      )}
                                      <span>{subItem.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Extra</SidebarGroupLabel>
            <SidebarMenu>
              {help.map((item: ExternalLink) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center gap-2"
                    >
                      <span className="mr-2">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span>{item.name}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu className="flex flex-col gap-2">
            <SidebarMenuItem className="group-data-[collapsible=icon]:-translate-x-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8 w-8 p-1.5 mx-auto"
                  >
                    {/*  */}
                    <Bell className="size-4" />
                    {invitations && invitations.length > 0 && (
                      <span className="absolute -top-0 -right-0 flex size-4 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                        {invitations.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side={"right"}
                  className="w-80"
                >
                  <DropdownMenuLabel>Pending Invitations</DropdownMenuLabel>
                  <div className="flex flex-col gap-2">
                    {invitations && invitations.length > 0 ? (
                      invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex flex-col gap-2"
                        >
                          <DropdownMenuItem
                            className="flex flex-col items-start gap-1 p-3"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <div className="font-medium">
                              {invitation?.organization?.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Expires:{" "}
                              {new Date(invitation.expires_at).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Role: {invitation.role}
                            </div>
                          </DropdownMenuItem>
                          <DialogAction
                            title="Accept Invitation"
                            description="Are you sure you want to accept this invitation?"
                            type="default"
                            onClick={async () => {
                              const { error } = await acceptInvitation({
                                data: { token: invitation.token },
                              });

                              if (error) {
                                toast.error(
                                  error.message || "Error accepting invitation"
                                );
                              } else {
                                toast.success(
                                  "Invitation accepted successfully"
                                );
                                await refetchInvitations();
                                await refetch();
                              }
                            }}
                          >
                            <Button size="sm" variant="secondary">
                              Accept Invitation
                            </Button>
                          </DialogAction>
                        </div>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>
                        No pending invitations
                      </DropdownMenuItem>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
            <SidebarTrigger className="group-data-[collapsible=]:translate-x-0.5" />
            <SidebarMenuItem>
              <UserNav />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col w-full grow p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

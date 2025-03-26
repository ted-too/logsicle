import { Logo, LogsIcon, TracesIcon } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
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
import { useQuery } from "@tanstack/react-query";
import {
  Link,
  useLocation,
  useParams,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router";
import { Brodcast, Category2, Setting2, Warning2 } from "iconsax-react";
import { ChevronsUpDown, LogOut, PlusIcon } from "lucide-react";
import { AppHeader } from "./app-header";
import { listUserOrganizationMembershipsQueryOptions } from "@/qc/teams/organizations";
import { logout } from "@/server/auth/basic";

interface MenuItem {
  title: string;
  url: string;
  icon: typeof Category2 | typeof TracesIcon;
  isBase?: boolean;
}

const getMenuList = (params: {
  orgSlug: string;
  projSlug: string;
}): MenuItem[] => [
  {
    title: "Dashboard",
    url: `/${params.orgSlug}/${params.projSlug}`,
    icon: Category2,
    isBase: true,
  },
  {
    title: "Events",
    url: `/${params.orgSlug}/${params.projSlug}/events`,
    icon: Brodcast,
  },
  {
    title: "Logs",
    url: `/${params.orgSlug}/${params.projSlug}/logs`,
    icon: LogsIcon,
  },
  {
    title: "Traces",
    url: `/${params.orgSlug}/${params.projSlug}/traces`,
    icon: TracesIcon,
  },
  {
    title: "Alerts",
    url: `/${params.orgSlug}/${params.projSlug}/alerts`,
    icon: Warning2,
  },
];

export interface MenuItemsProps {
  items: MenuItem[];
}

function MenuItems({ items }: MenuItemsProps) {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  const { open: sidebarOpen } = useSidebar();

  return items.map((item) => (
    <Tooltip key={item.title}>
      <TooltipTrigger asChild>
        <SidebarMenuItem className="w-full">
          <SidebarMenuButton className="rounded-lg" asChild>
            <Link
              data-active={
                item.isBase
                  ? pathname === item.url
                  : pathname.startsWith(item.url)
              }
              to={item.url}
            >
              <item.icon
                className="shrink-0 [&>path]:stroke-2"
                size={18}
                color="currentColor"
              />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </TooltipTrigger>
      <TooltipContent side="right" className={cn(sidebarOpen && "hidden")}>
        <p>{item.title}</p>
      </TooltipContent>
    </Tooltip>
  ));
}

// TODO: Make this suspense properly
export function AppSidebar() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { orgSlug, projSlug } = useParams({
    from: "/_authd/$orgSlug/$projSlug/_dashboard",
  });
  const {
    user,
    userOrgs: initialUserOrgs,
    currentUserOrg,
  } = useRouteContext({
    from: "/_authd/$orgSlug/$projSlug/_dashboard",
  });

  const { data: userOrgs } = useQuery({
    ...listUserOrganizationMembershipsQueryOptions(),
    initialData: initialUserOrgs,
  });

  const displayName = user.name !== "" ? user.name : user.email;
  const avatarFallback = displayName
    .split(" ")
    .map((n) => n[0])
    .join("");

  const menuList = getMenuList({ orgSlug, projSlug });

  return (
    <TooltipProvider>
      <Sidebar collapsible="icon">
        <SidebarContent className="justify-between">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="items-center gap-3 p-2 pb-0">
                <SidebarMenuItem className="w-full">
                  <div className="peer/menu-button h-10 flex w-full items-center gap-4 overflow-hidden rounded-md px-3 pr-0 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-3! [&>span:last-child]:truncate [&>svg]:h-6 [&>svg]:w-auto [&>svg]:shrink-0">
                    <Logo />
                    <svg
                      width="362"
                      height="92"
                      viewBox="0 0 362 92"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5!"
                    >
                      <path
                        d="M14.304 49.408L14.784 71.296C14.784 71.744 14.56 71.968 14.112 71.968H0.672C0.224 71.968 0 71.744 0 71.296L0.48 49.024V22.624L0 1.312C0 0.863998 0.224 0.639999 0.672 0.639999H14.112C14.56 0.639999 14.784 0.863998 14.784 1.312L14.304 22.72V49.408Z"
                        fill="#FF3363"
                        fillOpacity="0.84"
                      />
                      <path
                        d="M52.8548 73.312C49.0788 73.312 45.5267 72.672 42.1987 71.392C38.9347 70.048 36.0868 68.224 33.6548 65.92C31.2868 63.616 29.3988 60.864 27.9907 57.664C26.6467 54.464 25.9748 50.976 25.9748 47.2C25.9748 43.424 26.6467 39.968 27.9907 36.832C29.3988 33.632 31.3188 30.88 33.7508 28.576C36.1828 26.272 39.0308 24.48 42.2948 23.2C45.6227 21.92 49.1748 21.28 52.9508 21.28C56.7268 21.28 60.2467 21.92 63.5107 23.2C66.8388 24.48 69.7188 26.272 72.1508 28.576C74.5828 30.88 76.4708 33.632 77.8148 36.832C79.2228 39.968 79.9268 43.424 79.9268 47.2C79.9268 50.976 79.2228 54.464 77.8148 57.664C76.4708 60.864 74.5828 63.616 72.1508 65.92C69.7188 68.224 66.8388 70.048 63.5107 71.392C60.2467 72.672 56.6948 73.312 52.8548 73.312ZM52.9508 61.216C54.9988 61.216 56.8228 60.864 58.4227 60.16C60.0228 59.392 61.3988 58.368 62.5508 57.088C63.7028 55.808 64.5668 54.336 65.1428 52.672C65.7828 50.944 66.1028 49.12 66.1028 47.2C66.1028 45.28 65.7828 43.488 65.1428 41.824C64.5028 40.16 63.6068 38.688 62.4548 37.408C61.3028 36.128 59.8948 35.136 58.2308 34.432C56.6308 33.664 54.8388 33.28 52.8548 33.28C50.8708 33.28 49.0788 33.664 47.4788 34.432C45.8788 35.136 44.5028 36.128 43.3507 37.408C42.1987 38.688 41.3027 40.16 40.6628 41.824C40.0868 43.488 39.7988 45.28 39.7988 47.2C39.7988 49.12 40.1188 50.944 40.7588 52.672C41.3988 54.336 42.2948 55.808 43.4468 57.088C44.5988 58.368 45.9748 59.392 47.5747 60.16C49.1748 60.864 50.9668 61.216 52.9508 61.216Z"
                        fill="#FF3363"
                        fillOpacity="0.84"
                      />
                      <path
                        d="M112.917 91.36C108.501 91.36 104.469 90.848 100.821 89.824C97.173 88.8 93.813 87.296 90.741 85.312C90.421 85.184 90.261 84.96 90.261 84.64L90.357 72.736C90.357 72.416 90.485 72.192 90.741 72.064C91.061 71.936 91.317 71.968 91.509 72.16C92.853 73.312 94.389 74.368 96.117 75.328C97.845 76.352 99.637 77.216 101.493 77.92C103.413 78.688 105.269 79.264 107.061 79.648C108.917 80.032 110.549 80.224 111.957 80.224C116.693 80.224 120.341 79.04 122.901 76.672C125.525 74.304 126.837 71.008 126.837 66.784V64C126.837 63.68 126.645 63.488 126.261 63.424C125.941 63.36 125.653 63.456 125.397 63.712C123.669 65.504 121.557 67.008 119.061 68.224C116.629 69.376 113.781 69.952 110.517 69.952C107.125 69.952 103.989 69.376 101.109 68.224C98.293 67.008 95.861 65.344 93.813 63.232C91.765 61.056 90.165 58.496 89.013 55.552C87.925 52.544 87.381 49.28 87.381 45.76C87.381 42.304 87.957 39.104 89.109 36.16C90.261 33.152 91.861 30.56 93.909 28.384C95.957 26.208 98.389 24.512 101.205 23.296C104.021 22.016 107.061 21.376 110.325 21.376C113.589 21.376 116.533 21.984 119.157 23.2C121.781 24.352 124.021 25.952 125.877 28C126.069 28.256 126.293 28.32 126.549 28.192C126.869 28.064 127.029 27.84 127.029 27.52L127.125 24.64C127.125 24.32 127.317 24.096 127.701 23.968L140.853 22.528C141.045 22.464 141.205 22.528 141.333 22.72C141.525 22.848 141.621 23.008 141.621 23.2L140.853 40.288V64.768C140.853 73.664 138.421 80.32 133.557 84.736C128.693 89.152 121.813 91.36 112.917 91.36ZM114.069 58.72C115.925 58.72 117.653 58.4 119.253 57.76C120.853 57.056 122.229 56.128 123.381 54.976C124.597 53.824 125.525 52.48 126.165 50.944C126.869 49.344 127.221 47.616 127.221 45.76C127.221 43.904 126.869 42.208 126.165 40.672C125.525 39.136 124.597 37.792 123.381 36.64C122.229 35.488 120.853 34.592 119.253 33.952C117.653 33.312 115.925 32.992 114.069 32.992C112.149 32.992 110.389 33.312 108.789 33.952C107.253 34.592 105.909 35.488 104.757 36.64C103.605 37.792 102.709 39.168 102.069 40.768C101.493 42.304 101.205 44 101.205 45.856C101.205 47.648 101.493 49.344 102.069 50.944C102.709 52.48 103.605 53.824 104.757 54.976C105.909 56.128 107.253 57.056 108.789 57.76C110.389 58.4 112.149 58.72 114.069 58.72Z"
                        fill="#FF3363"
                        fillOpacity="0.84"
                      />
                      <path
                        d="M171.73 73.024C168.658 73.024 165.555 72.672 162.419 71.968C159.346 71.264 156.595 70.08 154.163 68.416C153.907 68.288 153.779 68.064 153.779 67.744V57.472C153.779 57.152 153.907 56.96 154.163 56.896C154.483 56.768 154.771 56.8 155.027 56.992C156.051 57.888 157.235 58.72 158.579 59.488C159.987 60.192 161.426 60.832 162.898 61.408C164.434 61.92 165.971 62.336 167.507 62.656C169.107 62.912 170.61 63.04 172.018 63.04C173.106 63.04 174.163 62.944 175.187 62.752C176.211 62.56 177.139 62.24 177.971 61.792C178.803 61.344 179.443 60.8 179.891 60.16C180.402 59.52 180.659 58.752 180.659 57.856C180.659 56.192 179.859 54.976 178.258 54.208C176.723 53.44 174.419 52.64 171.346 51.808C168.979 51.104 166.706 50.4 164.531 49.696C162.355 48.928 160.435 48 158.771 46.912C157.171 45.824 155.891 44.48 154.93 42.88C153.97 41.216 153.49 39.168 153.49 36.736C153.49 34.176 154.003 31.936 155.027 30.016C156.115 28.096 157.554 26.496 159.346 25.216C161.202 23.872 163.314 22.88 165.682 22.24C168.115 21.536 170.674 21.184 173.363 21.184C174.643 21.184 176.018 21.248 177.49 21.376C178.962 21.504 180.434 21.728 181.906 22.048C183.378 22.304 184.786 22.688 186.13 23.2C187.538 23.648 188.755 24.192 189.779 24.832C189.971 25.024 190.066 25.216 190.066 25.408V36.448C190.066 36.768 189.875 36.96 189.491 37.024C189.171 37.024 188.882 36.928 188.626 36.736C187.474 35.776 186.195 34.944 184.786 34.24C183.378 33.472 181.971 32.864 180.562 32.416C179.154 31.968 177.779 31.648 176.435 31.456C175.091 31.2 173.939 31.072 172.979 31.072C170.93 31.072 169.234 31.488 167.891 32.32C166.611 33.152 165.971 34.304 165.971 35.776C165.971 37.312 166.835 38.528 168.562 39.424C170.29 40.256 172.626 41.024 175.57 41.728C177.874 42.304 180.083 42.976 182.195 43.744C184.307 44.448 186.131 45.376 187.667 46.528C189.267 47.68 190.515 49.088 191.411 50.752C192.371 52.416 192.851 54.432 192.851 56.8C192.851 59.68 192.275 62.176 191.122 64.288C189.97 66.336 188.402 68 186.419 69.28C184.499 70.56 182.258 71.488 179.699 72.064C177.139 72.704 174.482 73.024 171.73 73.024Z"
                        fill="#0D0A0B"
                      />
                      <path
                        d="M204.674 12.928C204.226 12.928 204.002 12.704 204.002 12.256V1.312C204.002 0.863998 204.226 0.639999 204.674 0.639999H218.306C218.754 0.639999 218.978 0.863998 218.978 1.312V12.256C218.978 12.704 218.754 12.928 218.306 12.928H204.674ZM204.866 71.968C204.418 71.968 204.194 71.744 204.194 71.296L204.674 54.976V39.136L204.194 23.296C204.194 22.848 204.418 22.624 204.866 22.624H218.498C218.946 22.624 219.17 22.848 219.17 23.296L218.69 39.232V54.784L219.17 71.296C219.17 71.744 218.946 71.968 218.498 71.968H204.866Z"
                        fill="#0D0A0B"
                      />
                      <path
                        d="M244.363 47.392C244.363 49.248 244.651 51.04 245.227 52.768C245.867 54.432 246.796 55.936 248.012 57.28C249.292 58.56 250.859 59.616 252.715 60.448C254.572 61.216 256.747 61.6 259.243 61.6C260.203 61.6 261.355 61.504 262.699 61.312C264.043 61.12 265.42 60.864 266.828 60.544C268.299 60.16 269.74 59.68 271.147 59.104C272.555 58.528 273.771 57.856 274.796 57.088C275.052 56.896 275.307 56.864 275.564 56.992C275.884 57.12 276.043 57.344 276.043 57.664V69.28C276.043 69.472 275.947 69.664 275.755 69.856C274.667 70.56 273.419 71.136 272.012 71.584C270.668 72.032 269.228 72.384 267.691 72.64C266.219 72.96 264.716 73.184 263.18 73.312C261.643 73.44 260.203 73.504 258.859 73.504C254.507 73.504 250.572 72.864 247.051 71.584C243.596 70.24 240.62 68.416 238.124 66.112C235.691 63.744 233.803 60.96 232.46 57.76C231.116 54.56 230.443 51.072 230.443 47.296C230.443 43.392 231.116 39.84 232.46 36.64C233.868 33.376 235.82 30.592 238.316 28.288C240.812 25.92 243.756 24.096 247.148 22.816C250.604 21.536 254.379 20.896 258.475 20.896C259.883 20.896 261.355 21.024 262.892 21.28C264.492 21.472 266.059 21.76 267.595 22.144C269.132 22.528 270.572 23.008 271.915 23.584C273.259 24.096 274.444 24.704 275.467 25.408C275.659 25.6 275.755 25.792 275.755 25.984V39.04C275.755 39.36 275.596 39.616 275.276 39.808C275.02 40 274.764 39.968 274.508 39.712C273.484 38.56 272.299 37.568 270.956 36.736C269.676 35.904 268.331 35.2 266.923 34.624C265.516 34.048 264.139 33.632 262.796 33.376C261.452 33.12 260.236 32.992 259.147 32.992C256.651 32.992 254.476 33.408 252.62 34.24C250.764 35.008 249.228 36.064 248.012 37.408C246.796 38.752 245.867 40.288 245.227 42.016C244.651 43.744 244.363 45.536 244.363 47.392Z"
                        fill="#0D0A0B"
                      />
                      <path
                        d="M300.335 49.408L300.815 71.296C300.815 71.744 300.591 71.968 300.143 71.968H286.703C286.255 71.968 286.031 71.744 286.031 71.296L286.511 49.024V22.624L286.031 1.312C286.031 0.863998 286.255 0.639999 286.703 0.639999H300.143C300.591 0.639999 300.815 0.863998 300.815 1.312L300.335 22.72V49.408Z"
                        fill="#0D0A0B"
                      />
                      <path
                        d="M361.926 47.776C361.926 48.224 361.926 48.672 361.926 49.12C361.926 49.568 361.894 50.048 361.83 50.56C361.83 51.008 361.638 51.232 361.254 51.232H326.502C325.99 51.232 325.766 51.392 325.83 51.712C326.342 55.04 327.814 57.664 330.246 59.584C332.678 61.44 335.526 62.368 338.79 62.368C339.878 62.368 341.126 62.208 342.534 61.888C343.942 61.504 345.382 61.056 346.854 60.544C348.326 59.968 349.734 59.328 351.078 58.624C352.422 57.92 353.574 57.184 354.534 56.416C354.79 56.224 355.046 56.192 355.302 56.32C355.558 56.448 355.686 56.672 355.686 56.992L355.59 68.608C355.59 68.864 355.462 69.056 355.206 69.184C352.966 70.784 350.278 71.904 347.142 72.544C344.07 73.184 341.126 73.472 338.31 73.408C334.662 73.408 331.238 72.8 328.038 71.584C324.838 70.368 322.054 68.64 319.686 66.4C317.318 64.096 315.43 61.344 314.022 58.144C312.678 54.944 312.006 51.328 312.006 47.296C312.006 43.52 312.646 40.064 313.926 36.928C315.206 33.728 316.966 30.976 319.206 28.672C321.51 26.368 324.198 24.576 327.27 23.296C330.406 21.952 333.798 21.28 337.446 21.28C341.286 21.28 344.71 21.952 347.718 23.296C350.79 24.64 353.382 26.496 355.494 28.864C357.606 31.232 359.206 34.048 360.294 37.312C361.382 40.512 361.926 44 361.926 47.776ZM347.91 42.784C348.486 42.784 348.71 42.464 348.582 41.824C348.198 38.88 347.046 36.416 345.126 34.432C343.27 32.448 340.71 31.456 337.446 31.456C334.374 31.456 331.782 32.448 329.67 34.432C327.558 36.416 326.246 38.88 325.734 41.824C325.734 42.464 325.958 42.784 326.406 42.784H347.91Z"
                        fill="#0D0A0B"
                      />
                    </svg>
                  </div>
                </SidebarMenuItem>
              </SidebarMenu>
              <SidebarMenu className="items-center gap-3 px-2 pt-3">
                <MenuItems items={menuList.slice(0, 1)} />
                <SidebarSeparator className="w-full" />
                <MenuItems items={menuList.slice(1, menuList.length)} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="items-center gap-3 p-2">
                <SidebarMenuItem className="w-full">
                  <SidebarTrigger className="ml-1.5" />
                </SidebarMenuItem>
                <SidebarMenuItem className="w-full">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        size="lg"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground min-h-12 pl-0 rounded-lg cursor-pointer"
                      >
                        <Avatar className="h-8 w-8 rounded-lg shrink-0 ml-1">
                          <AvatarImage
                            src={user.image ?? undefined}
                            alt={user.name}
                          />
                          <AvatarFallback className="rounded-lg">
                            {avatarFallback}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">
                            {user.name}
                          </span>
                          <span className="truncate text-xs">{user.email}</span>
                        </div>
                        <ChevronsUpDown className="ml-auto size-4" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                      side={isMobile ? "bottom" : "right"}
                      align="end"
                      sideOffset={4}
                    >
                      <DropdownMenuLabel className="p-0 font-normal">
                        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                          <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarImage
                              src={user.image ?? undefined}
                              alt={user.name}
                            />
                            <AvatarFallback className="rounded-lg">
                              {avatarFallback}
                            </AvatarFallback>
                          </Avatar>
                          <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">
                              {user.name}
                            </span>
                            <span className="truncate text-xs">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuSub>
                          <DropdownMenuLabel className="font-light text-muted-foreground text-xs">
                            Organization
                          </DropdownMenuLabel>
                          <DropdownMenuSubTrigger>
                            <span className="truncate text-sm">
                              {currentUserOrg.organization.name}
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent
                              sideOffset={10}
                              className="rounded-lg w-52"
                            >
                              <DropdownMenuRadioGroup
                                value={currentUserOrg?.id}
                                onValueChange={(v) =>
                                  router.navigate({ to: `/dashboard/${v}` })
                                }
                              >
                                {userOrgs.map((o) => (
                                  <DropdownMenuRadioItem
                                    key={o.id}
                                    value={o.id}
                                    className="font-base truncate"
                                  >
                                    {o.organization.name}
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="font-base justify-between">
                                Create <PlusIcon />
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          to="/$orgSlug/$projSlug/settings"
                          params={{
                            orgSlug,
                            projSlug,
                          }}
                        >
                          <Setting2
                            className="shrink-0 [&>path]:stroke-2"
                            size={16}
                            color="currentColor"
                          />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* FIXME: Make logout work */}
                      <DropdownMenuItem
                        onSelect={async () => {
                          await logout();
                          router.navigate({ to: "/" });
                        }}
                      >
                        <LogOut />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
}

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  return (
    <div
      className={cn(
        "flex flex-col h-full transition-[width] duration-200 ease-linear",
        open
          ? "w-[calc(100svw-var(--sidebar-width))]"
          : "w-[calc(100svw-var(--sidebar-width-icon))]"
      )}
      style={
        {
          "--content-height": "calc(100vh - 3rem)",
        } as React.CSSProperties
      }
    >
      <AppHeader />
      <div className="flex flex-col grow bg-[hsl(0,0%,98%)]">{children}</div>
    </div>
  );
}

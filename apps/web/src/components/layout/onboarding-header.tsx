import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/server/auth/basic";
import { useRouteContext, useRouter } from "@tanstack/react-router";
import { ChevronDown, LogOut } from "lucide-react";

export function OnboardingHeader() {
  const router = useRouter();
  const { user } = useRouteContext({
    from: "/_authd/$orgSlug/_onboarding",
  });
  const displayName = user.name !== "" ? user.name : user.email;
  const avatarFallback = displayName
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <div className="sticky flex h-12 shrink-0 px-4 w-full items-center border-b border-border">
      <div className="mx-auto flex w-full max-w-[960px] items-center justify-between">
        <span className="text-sm font-semibold">Getting Started</span>
        {/* TODO: Make a component for this */}
        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer" asChild>
            <Button
              variant={"ghost"}
              size={"sm"}
              className="w-[4.375rem] gap-2"
            >
              <Avatar className="size-7">
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback className="uppercase">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuLabel className="flex flex-col gap-1 text-xs">
              <span className="font-light text-muted-foreground">
                Signed in with email
              </span>
              <span className="font-base whitespace-nowrap">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="font-base justify-between text-xs [&>svg]:size-3"
              onSelect={async () => {
                await logout();
                router.navigate({ to: "/" });
              }}
            >
              Logout <LogOut />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

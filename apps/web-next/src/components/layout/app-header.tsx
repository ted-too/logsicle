import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@repo/api";
import Link from "next/link";
import { HeaderBreadcrumbs } from "./header-breadcrumbs";
import { LogOut } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AppHeader({ user }: { user: User }) {
  const displayName = user.name !== "" ? user.name : user.email;
  const avatarFallback = displayName
    .split(" ")
    .map((n) => n[0])
    .join("");
  return (
    <TooltipProvider>
      <div className="w-full border-border border-b p-4 h-16 flex items-center justify-between">
        {user.has_onboarded ?  <HeaderBreadcrumbs /> : <span className="font-semibold text-lg">Setup your first project</span>}
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarFallback className="uppercase">{avatarFallback}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{displayName}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/auth/sign-out" aria-label="sign out">
                <LogOut className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs p-1.5">
              <p>Logout</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

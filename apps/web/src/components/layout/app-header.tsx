import {
  DropdownMenu,
  DropdownMenuContent,
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
import { projectsQueries } from "@/qc/queries/projects";
import { useParams, useRouter } from "@tanstack/react-router";
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { HeaderBreadcrumbs } from "./header-breadcrumbs";
import { organizationsQueries } from "@/qc/queries/organizations";
export function AppHeader() {
  const router = useRouter();
  const { data, isPending } = projectsQueries.list.useQuery();
  const { data: organizations, isPending: isOrganizationsPending } =
    organizationsQueries.list.useQuery();
  const { projId } = useParams({ strict: false });
  const currentProject = data?.find((p) => p.id === projId);

  return (
    <div className="flex h-12 shrink-0 px-4 w-full justify-between items-center border-b border-border">
      <HeaderBreadcrumbs />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex gap-4 items-center justify-between cursor-pointer h-8 px-3 border-none bg-accent/50 hover:bg-accent/75 text-xs rounded-lg shadow-none">
          {currentProject ? currentProject.name : "Select project"}
          <ChevronsUpDownIcon className="h-3 w-3 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="rounded-lg w-52"
        >
          {isOrganizationsPending ? (
            <Skeleton className="h-7 w-[calc(100%-1rem)] mx-2 my-1.5" />
          ) : (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="[&_svg]:size-3">
                <span className="truncate text-xs">
                  {
                    organizations?.find(
                      (o) => o.id === currentProject?.organization_id
                    )?.name
                  }
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent
                  sideOffset={10}
                  className="rounded-lg w-52"
                >
                  <DropdownMenuLabel className="font-light text-muted-foreground text-xs">
                    Organizations
                  </DropdownMenuLabel>
                  {organizations?.map((o) => (
                    <DropdownMenuItem
                      key={o.id}
                      className="font-base text-xs truncate"
                    >
                      {o.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}
          <DropdownMenuLabel className="font-light text-muted-foreground text-xs">
            Projects
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={projId}
            onValueChange={(v) => router.navigate({ to: `/dashboard/${v}` })}
          >
            {isPending || !data ? (
              <>
                <Skeleton className="h-4 w-[calc(100%-1rem)] my-1.5 mx-auto" />
                <Skeleton className="h-4 w-[calc(100%-1rem)] my-1.5 mx-auto" />
              </>
            ) : (
              data.map((p) => (
                <DropdownMenuRadioItem
                  key={p.id}
                  value={p.id}
                  className="font-base text-xs"
                >
                  {p.name}
                </DropdownMenuRadioItem>
              ))
            )}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="font-base justify-between text-xs [&>svg]:size-3">
            Create <PlusIcon />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

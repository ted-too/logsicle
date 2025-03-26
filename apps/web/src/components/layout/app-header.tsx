import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProjectsQueryOptions } from "@/qc/teams/projects";
import { useQuery } from "@tanstack/react-query";
import {
	Link,
	useLocation,
	useParams,
	useRouteContext,
	useRouter,
} from "@tanstack/react-router";
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { Fragment } from "react/jsx-runtime";

export function AppHeader() {
	const router = useRouter();
	const pathname = useLocation({
		select: (location) => location.pathname,
	});

	const { orgSlug, projSlug } = useParams({
		from: "/_authd/$orgSlug/$projSlug/_dashboard",
	});
	const { currentUserOrg, currentProject } = useRouteContext({
		from: "/_authd/$orgSlug/$projSlug/_dashboard",
	});

	const { data: projects } = useQuery({
		...getProjectsQueryOptions(),
		initialData: currentUserOrg.organization.projects,
	});

	const splitPath = pathname
		.split("/")
		.filter((v) => v !== orgSlug && v !== projSlug);

	const BREADCRUMBS = splitPath.map((path) => ({
		href: `/${[orgSlug, projSlug, path].join("/")}`,
		title: path === "" ? "dashboard" : path,
	}));

	return (
		<div className="flex h-12 shrink-0 px-4 w-full justify-between items-center border-b border-border">
			<Breadcrumb>
				<BreadcrumbList>
					{BREADCRUMBS.map((crumb) => (
						<Fragment key={crumb.href}>
							<BreadcrumbItem>
								<BreadcrumbLink className="capitalize" asChild>
									<Link to={crumb.href}>{crumb.title}</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator className="last:hidden" />
						</Fragment>
					))}
				</BreadcrumbList>
			</Breadcrumb>
			<DropdownMenu>
				<DropdownMenuTrigger className="flex gap-4 items-center justify-between cursor-pointer h-8 px-3 border-none bg-accent/50 hover:bg-accent/75 text-xs rounded-lg shadow-none">
					{currentProject ? currentProject.name : "Select project"}
					<ChevronsUpDownIcon className="h-3 w-3 opacity-50" />
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					onCloseAutoFocus={(e) => e.preventDefault()}
					className="rounded-lg"
				>
					<DropdownMenuLabel className="font-light text-muted-foreground text-xs">
						Projects
					</DropdownMenuLabel>
					<DropdownMenuRadioGroup
						value={currentProject.slug}
						onValueChange={(v) =>
							router.navigate({
								to: "/$orgSlug/$projSlug",
								params: { orgSlug, projSlug: v },
							})
						}
					>
						{projects.map((p) => (
							<DropdownMenuRadioItem
								key={p.id}
								value={p.slug}
								className="font-base text-xs"
							>
								{p.name}
							</DropdownMenuRadioItem>
						))}
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

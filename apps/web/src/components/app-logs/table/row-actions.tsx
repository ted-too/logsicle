import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { appLogsMutations } from "@/qc/legacy-queries/app-logs";
import type { AppLog } from "@repo/api";
import { useQueryClient } from "@tanstack/react-query";
import type { CellContext, HeaderContext } from "@tanstack/react-table";
import { Setting3 } from "iconsax-react";
import { Ellipsis, ScanSearchIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppLogSheetContent } from "./app-log-sheet";

export function RowActions({ row }: CellContext<AppLog, unknown>) {
	const log = row.original;
	const [open, setOpen] = useState<boolean>(false);
	const queryClient = useQueryClient();
	const { mutateAsync } = appLogsMutations.delete();

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<DropdownMenu modal={false}>
				<DropdownMenuTrigger asChild>
					<div className="flex justify-center">
						<Button
							size="icon"
							variant="trueGhost"
							className="shadow-none hover:border-none"
							aria-label="Edit item"
						>
							<Ellipsis size={16} strokeWidth={2} aria-hidden="true" />
						</Button>
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<SheetTrigger asChild>
						<DropdownMenuItem>
							<span className="text-xs">View</span>
							<DropdownMenuShortcut>
								<ScanSearchIcon className="size-3.5" />
							</DropdownMenuShortcut>
						</DropdownMenuItem>
					</SheetTrigger>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onSelect={async () => {
							const promise = mutateAsync({
								logId: log.id,
								projectId: log.project_id,
							});
							toast.promise(promise, {
								loading: "Deleting log...",
								success: () => {
									queryClient.refetchQueries({
										queryKey: ["projects", log.project_id, "app-logs"],
									});
									return "Log deleted successfully";
								},
								error: "Failed to delete log",
							});
						}}
						className="text-destructive focus:text-destructive"
					>
						<span className="text-xs">Delete</span>
						<DropdownMenuShortcut>
							<Trash2Icon className="size-3.5" />
						</DropdownMenuShortcut>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<AppLogSheetContent log={log} open={open} setOpen={setOpen} />
		</Sheet>
	);
}

export function ColumnVisibility({ table }: HeaderContext<AppLog, unknown>) {
	const [isOpen, setIsOpen] = useState(false);

	const containerRef = table.options.meta?.containerRef;
	const totalVisibleColumns = table.getVisibleFlatColumns().length;

	const scrollToRight = () => {
		if (!containerRef?.current) return;
		const container = containerRef.current;
		container.scrollLeft = container.scrollWidth - container.clientWidth;
	};
	return (
		<DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="trueGhost"
					className="size-7 shadow-none bg-transparent"
				>
					<Setting3
						size={16}
						color="currentColor"
						strokeWidth={2}
						aria-hidden="true"
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="font-mono">
				<DropdownMenuLabel className="text-xs">
					Toggle columns
				</DropdownMenuLabel>
				{table
					.getAllColumns()
					.filter((column) => column.getCanHide())
					.map((column) => {
						return (
							<DropdownMenuCheckboxItem
								key={column.id}
								className="capitalize text-xs"
								checked={column.getIsVisible()}
								onCheckedChange={(value) => {
									column.toggleVisibility(!!value);
									// Scroll to right after column visibility changes
									setTimeout(() => {
										scrollToRight();
										table.options.meta?.handleResize(
											containerRef?.current?.clientWidth ?? 0,
										);
									}, 0);
								}}
								onSelect={(event) => event.preventDefault()}
							>
								{column.id}
							</DropdownMenuCheckboxItem>
						);
					})}
				<DropdownMenuItem
					disabled={
						totalVisibleColumns - 1 ===
						table.getAllColumns().filter((column) => column.getCanHide()).length
					}
					className="capitalize text-xs hover:underline text-muted-foreground hover:text-primary"
					onSelect={(event) => {
						event.preventDefault();
						table.resetColumnVisibility(true);

						setTimeout(() => {
							scrollToRight();
							table.options.meta?.handleResize(
								containerRef?.current?.clientWidth ?? 0,
							);
						}, 0);
					}}
				>
					<span>Show all</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

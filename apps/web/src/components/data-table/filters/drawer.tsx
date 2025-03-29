import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerDescription,
	DrawerFooter,
	DrawerClose,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { FilterIcon } from "lucide-react";
import { DataTableFilterControls } from "./controls";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd } from "@/components/custom/kbd";

export function DataTableFilterControlsDrawer() {
	return (
		<Drawer>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<DrawerTrigger asChild>
							<Button variant="ghost" size="icon" className="h-9 w-9">
								<FilterIcon className="w-4 h-4" />
							</Button>
						</DrawerTrigger>
					</TooltipTrigger>
					<TooltipContent side="right">
						<p>
							Toggle controls with{" "}
							<Kbd className="ml-1 text-muted-foreground group-hover:text-accent-foreground">
								<span className="mr-1">⌘</span>
								<span className="mr-1">Shift</span>
								<span>S</span>
							</Kbd>
						</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<DrawerContent className="max-h-[calc(100dvh-4rem)]">
				<VisuallyHidden>
					<DrawerHeader>
						<DrawerTitle>Filters</DrawerTitle>
						<DrawerDescription>Adjust your table filters</DrawerDescription>
					</DrawerHeader>
				</VisuallyHidden>
				<div className="px-4 flex-1 overflow-y-auto">
					<DataTableFilterControls />
				</div>
				<DrawerFooter>
					<DrawerClose asChild>
						<Button variant="outline" className="w-full">
							Close
						</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

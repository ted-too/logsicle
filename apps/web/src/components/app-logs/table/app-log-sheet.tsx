import { getLocalTimeZone } from "@internationalized/date";
import { formatISO9075 } from "date-fns";
import { Check, Copy, Info, Trash2Icon, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/sonner-wrapper";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { appLogsMutations } from "@/qc/legacy-queries/app-logs";
import type { AppLog } from "@repo/api";
import { useQueryClient } from "@tanstack/react-query";

interface AppLogSheetProps {
	log: AppLog;
	children: React.ReactNode;
	asChild?: boolean;
}

export function AppLogSheet({
	log,
	children,
	asChild = true,
}: AppLogSheetProps) {
	const [open, setOpen] = useState<boolean>(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild={asChild}>{children}</SheetTrigger>
			<AppLogSheetContent log={log} open={open} setOpen={setOpen} />
		</Sheet>
	);
}

interface AppLogSheetContentProps {
	log: AppLog;
	open: boolean;
	setOpen: (open: boolean) => void;
}

export function AppLogSheetContent({
	log,
	open,
	setOpen,
}: AppLogSheetContentProps) {
	const [copied, setCopied] = useState<boolean>(false);
	const localTimezone = getLocalTimeZone();
	const zonedDateTime = formatISO9075(new Date(log.timestamp));

	const queryClient = useQueryClient();
	const { mutateAsync } = appLogsMutations.delete();

	const handleCopy = (value: string) => {
		navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	async function handleDelete() {
		try {
			await mutateAsync({
				projectId: log.project_id,
				logId: log.id,
			});
			await queryClient.refetchQueries({
				queryKey: ["projects", log.project_id, "events"],
			});
			setOpen(false);
			toast.success(`App log "${log.message}" deleted successfully`);
		} catch (error) {
			toast.APIError(error);
		}
	}

	return (
		<TooltipProvider>
			<SheetContent
				className="w-[400px] sm:w-[540px]"
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
				noClose
			>
				<SheetHeader className="space-y-4">
					<div className="flex items-center w-full justify-between">
						<SheetTitle className="text-2xl">{log.service_name}</SheetTitle>
						<SheetClose className="rounded-sm opacity-70 cursor-pointer ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
							<X className="h-4 w-4" />
							<span className="sr-only">Close</span>
						</SheetClose>
					</div>
					<SheetDescription className="flex items-center gap-2" asChild>
						<div>
							<Badge
								variant="secondary"
								className={cn(
									"rounded-lg ml-1 uppercase font-mono",
									"app-log-level",
								)}
								data-level={log.level}
							>
								{log.level}
							</Badge>
							<Tooltip>
								<TooltipTrigger>
									<Info className="size-3" />
								</TooltipTrigger>
								<TooltipContent>
									<p>{localTimezone}</p>
								</TooltipContent>
							</Tooltip>
							<span>{zonedDateTime}</span>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="link"
										className="text-destructive/80 hover:text-destructive p-0 h-max"
										onClick={handleDelete}
									>
										<Trash2Icon />
									</Button>
								</TooltipTrigger>
								<TooltipContent side="bottom" align="center">
									<p>Delete</p>
								</TooltipContent>
							</Tooltip>
						</div>
					</SheetDescription>
				</SheetHeader>
				<div className="mt-6 space-y-6">
					<div className="space-y-2">
						<h4 className="text-sm font-medium">Message</h4>
						<p className="text-sm text-muted-foreground">{log.message}</p>
					</div>
					{log.fields && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium">Fields</h4>
							<pre className="rounded-lg bg-muted p-3 overflow-auto max-h-128 relative">
								<TooltipProvider delayDuration={0}>
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												onClick={() =>
													handleCopy(JSON.stringify(log.fields, null, 2))
												}
												className="absolute right-0.5 top-2 flex h-max w-9 items-center justify-center rounded-e-lg border border-transparent text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed"
												aria-label={copied ? "Copied" : "Copy to clipboard"}
												disabled={copied}
											>
												<div
													className={cn(
														"transition-all",
														copied
															? "scale-100 opacity-100"
															: "scale-0 opacity-0",
													)}
												>
													<Check
														className="stroke-emerald-500"
														size={16}
														strokeWidth={2}
														aria-hidden="true"
													/>
												</div>
												<div
													className={cn(
														"absolute transition-all",
														copied
															? "scale-0 opacity-0"
															: "scale-100 opacity-100",
													)}
												>
													<Copy size={16} strokeWidth={2} aria-hidden="true" />
												</div>
											</button>
										</TooltipTrigger>
										<TooltipContent className="px-2 py-1 text-xs">
											Copy to clipboard
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<code className="text-sm font-mono">
									{JSON.stringify(log.fields, null, 2)}
								</code>
							</pre>
						</div>
					)}
					<div className="flex flex-wrap w-full gap-4 text-sm">
						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium leading-none">Caller</span>
							<code className="px-1 py-0.5  w-max rounded-md bg-muted text-muted-foreground font-mono text-sm">
								{log.caller || "-"}
							</code>
						</div>
						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium leading-none">Function</span>
							<code className="px-1 py-0.5  w-max rounded-md bg-muted text-muted-foreground font-mono text-sm">
								{log.function || "-"}
							</code>
						</div>
						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium leading-none">Version</span>
							<code className="px-1 py-0.5  w-max rounded-md bg-muted text-muted-foreground font-mono text-sm">
								{log.version || "-"}
							</code>
						</div>
						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium leading-none">
								Environment
							</span>
							<code className="px-1 py-0.5  w-max rounded-md bg-muted text-muted-foreground font-mono text-sm">
								{log.environment || "-"}
							</code>
						</div>
						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium leading-none">Host</span>
							<code className="px-1 py-0.5  w-max rounded-md bg-muted text-muted-foreground font-mono text-sm">
								{log.host || "-"}
							</code>
						</div>
					</div>
				</div>
			</SheetContent>
		</TooltipProvider>
	);
}

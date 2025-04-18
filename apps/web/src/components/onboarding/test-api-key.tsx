import { Badge } from "@/components/ui/badge";
import { ActionButton, Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEventStream } from "@/hooks/stream/use-event-stream";
import { cn, tempApiKeyStorage } from "@/lib/utils";
import { userQueryKey } from "@/qc/auth/basic";
import { getProjectsQueryOptions } from "@/qc/teams/projects";
import { updateUser } from "@/server/auth/basic";
import { getCodeSnippets } from "@/server/syntax-highliter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext, useRouter } from "@tanstack/react-router";
import { Crown1 } from "iconsax-react";
import { Check, Copy, TerminalIcon } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { toast } from "../ui/sonner-wrapper";

// Define the tab icons mapping
const IconComponents = {
	TerminalIcon: TerminalIcon,
	// Add more icon mappings as needed
};

export function TestAPIKey() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { currentUserOrg } = useRouteContext({
		from: "/_authd/$orgSlug/_onboarding/onboarding",
	});
	const { data: projects } = useQuery({
		...getProjectsQueryOptions(),
		initialData: currentUserOrg.organization.projects,
	});
	const project = projects?.[0];

	// Get the temporary API key from storage
	const tempApiKey = tempApiKeyStorage.get();

	// Fetch code snippets from server
	const { data: codeSnippets, isPending: isCodeSnippetsPending } = useQuery({
		queryKey: ["code-snippets", project?.id, tempApiKey],
		queryFn: () =>
			getCodeSnippets({
				data: {
					projectId: project.id,
					apiKey: tempApiKey || "<your-api-key>",
				},
			}),
		enabled: !!project?.id,
	});

	const { mutateAsync: setOnboarded, isPending } = useMutation({
		mutationFn: async () => {
			const { data, error } = await updateUser({
				data: { has_onboarded: true },
			});
			if (error) return Promise.reject(error);
			return data;
		},
		onSuccess: () => {
			queryClient.refetchQueries({
				queryKey: userQueryKey,
			});
		},
	});
	const [copied, setCopied] = useState<boolean>(false);
	const logs = useEventStream(project.id, {
		callback: (log) =>
			toast.success(
				`${log.type.charAt(0).toUpperCase() + log.type.slice(1)} received`,
			),
	});

	const handleCopy = (value: string) => {
		navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	async function handleFinish() {
		await setOnboarded();
		tempApiKeyStorage.remove();
		await queryClient.refetchQueries({
			queryKey: userQueryKey,
		});
		router.navigate({
			to: "/$orgSlug/$projSlug",
			params: {
				orgSlug: currentUserOrg.organization.slug,
				projSlug: project.slug,
			},
		});
	}

	return (
		<div className="flex w-full flex-col gap-4">
			<Tabs defaultValue={codeSnippets?.[0]?.value} className="w-full">
				<TabsList className="h-max gap-4 bg-transparent p-0">
					{codeSnippets?.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className="h-10 gap-2 rounded-lg border text-xs font-bold data-[state=active]:border-primary/50 data-[state=active]:shadow-none"
						>
							{tab.Icon in IconComponents && (
								// @ts-ignore
								<tab.Icon className="size-4" />
							)}
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>
				{!isCodeSnippetsPending ? (
					codeSnippets?.map((tab) => (
						<TabsContent key={tab.value} value={tab.value} className="mt-4">
							<div className="relative w-full rounded-xl bg-[#fafafa] p-4 font-mono text-xs">
								<TooltipProvider delayDuration={0}>
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												onClick={() => handleCopy(tab.code)}
												className="absolute right-1 top-2 flex h-max w-9 items-center justify-center rounded-e-lg border border-transparent text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed"
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

								<div
									className="flex flex-col"
									// biome-ignore lint/security/noDangerouslySetInnerHtml: this is safe
									dangerouslySetInnerHTML={{
										__html: tab.highlightedCode || "",
									}}
								/>
							</div>
						</TabsContent>
					))
				) : (
					<Skeleton className="h-20 w-full mt-4" />
				)}
			</Tabs>
			{logs.length > 0 ? (
				<div className="flex flex-wrap gap-4">
					{logs.map((l) => (
						<Badge key={l.data.id} variant="outline" className="gap-1.5">
							<span
								className="size-1.5 rounded-full bg-emerald-500"
								aria-hidden="true"
							/>
							{l.data.name}
						</Badge>
					))}
				</div>
			) : (
				<div className="flex items-center gap-2 py-4">
					<Crown1
						size={16}
						className="animate-pulse text-pink"
						variant="TwoTone"
						color="currentColor"
					/>
					<span className="text-muted-foreground">Waiting for event</span>
				</div>
			)}
			<div className="flex items-center gap-4 mt-4">
				<ActionButton
					variant="caribbean"
					className="w-20"
					onClick={async () => await handleFinish()}
					isLoading={isPending}
					disabled={logs.length === 0}
				>
					Finish
				</ActionButton>
				<Button
					variant="link"
					onClick={async () => await handleFinish()}
					className="text-muted-foreground"
				>
					Skip
				</Button>
			</div>
		</div>
	);
}

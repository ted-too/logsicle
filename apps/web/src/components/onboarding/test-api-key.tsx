import { Badge } from "@/components/ui/badge";
import { ActionButton, Button } from "@/components/ui/button";
import { Code } from "@/components/ui/code";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLogStream } from "@/hooks/use-log-stream";
import { cn, tempApiKeyStorage } from "@/lib/utils";
import { userQueries } from "@/qc/queries/auth";
import type { Project } from "@repo/api";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Crown1 } from "iconsax-react";
import { Check, Copy, TerminalIcon } from "lucide-react";
import { useState } from "react";
import { githubGist } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { toast } from "../ui/sonner-wrapper";

const CURL_CODE = (params: {
	apiKey: string;
	projectId: string;
}) => `curl --location '${import.meta.env.PUBLIC_API_URL}/v1/ingest/event' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Bearer ${params.apiKey}' \\
--data '{
    "project_id": "${params.projectId}",
    "name": "test_event"
}'`;

const TABS = [
	{
		label: "Try Locally",
		value: "local",
		language: "bash",
		code: CURL_CODE,
		Icon: TerminalIcon,
	},
	// {
	//   label: "Javascript",
	//   value: "js",
	//   code: CURL_CODE,
	//   Icon: TerminalIcon,
	// },
];

export function TestAPIKey({ project }: { project: Project }) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { mutateAsync, isPending } = userQueries.update();
	const [copied, setCopied] = useState<boolean>(false);
	const logs = useLogStream(project.id, {
		callback: (log) =>
			toast.success(
				`${log.type.charAt(0).toUpperCase() + log.type.slice(1)} received`,
			),
	});

	// Get the temporary API key from storage
	const tempApiKey = tempApiKeyStorage.get();

	const handleCopy = (value: string) => {
		navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	async function handleFinish() {
		await mutateAsync({ has_onboarded: true });
		tempApiKeyStorage.remove();
		await queryClient.refetchQueries({
			queryKey: userQueries.getUserQueryOptions.queryKey,
		});
		router.navigate({ to: "/dashboard" });
	}

	return (
		<div className="flex w-full flex-col gap-4">
			<Tabs defaultValue={TABS[0].value} className="w-full">
				<TabsList className="h-max gap-4 bg-transparent p-0">
					{TABS.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className="h-10 gap-2 rounded-lg border text-xs font-bold data-[state=active]:border-primary/50 data-[state=active]:shadow-none"
						>
							<tab.Icon className="size-4" />
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>
				{TABS.map((tab) => (
					<TabsContent key={tab.value} value={tab.value} className="mt-4">
						<div className="relative w-full rounded-xl bg-[#fafafa] p-4 font-mono text-xs">
							<TooltipProvider delayDuration={0}>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											onClick={() =>
												handleCopy(
													tab.code({
														projectId: project.id,
														apiKey: tempApiKey || "<your-api-key>",
													}),
												)
											}
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
							<Code
								language={tab.language}
								style={githubGist}
								customStyle={{ background: "#fafafa", padding: 0 }}
							>
								{tab.code({
									projectId: project.id,
									apiKey: tempApiKey || "<your-api-key>",
								})}
							</Code>
						</div>
					</TabsContent>
				))}
			</Tabs>
			{logs.length > 0 ? (
				<div className="flex flex-wrap gap-4">
					{logs.map((l) => (
						<Badge key={l.data.id} variant="outline" className="gap-1.5">
							<span
								className="size-1.5 rounded-full bg-emerald-500"
								aria-hidden="true"
							></span>
							{l.type === "event" && l.data.name}
							{l.type === "app" && `${l.data.service_name}: ${l.data.message}`}
							{l.type === "request" && `${l.data.method} ${l.data.path}`}
							{l.type === "metric" && `${l.data.name}: ${l.data.value}`}
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

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { updateChannelsMutations } from "@/qc/legacy-queries/update-channels";
import type { EventChannel } from "@repo/api";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "../ui/sonner-wrapper";

export function DeleteChannel({ channel }: { channel: EventChannel }) {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [confirmInput, setConfirmInput] = useState("");
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { channelId: _, ...search } = useSearch({
		from: "/_authd/_app/dashboard/$projId/events",
	});
	const queryClient = useQueryClient();
	const { mutateAsync } = updateChannelsMutations.event.delete();

	async function handleDelete() {
		try {
			await mutateAsync({
				projectId: channel.project_id,
				channelId: channel.id,
			});
			await queryClient.refetchQueries({
				queryKey: ["projects", channel.project_id, "channels", "event"],
			});
			setOpen(false);
			navigate({
				to: "/dashboard/$projId/events",
				params: { projId: channel.project_id },
				search,
			});
			toast.success(`Channel "${channel.name}" deleted successfully`);
		} catch (error) {
			toast.APIError(error);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<DialogTrigger asChild>
							<Button
								variant="link"
								className="text-destructive/80 hover:text-destructive p-0 h-max"
								disabled={open}
							>
								<Trash2Icon />
							</Button>
						</DialogTrigger>
					</TooltipTrigger>
					<TooltipContent side="bottom" align="center">
						<p>Delete</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
				className="max-w-xl"
			>
				<DialogHeader>
					<DialogHeader className="space-y-0 gap-4 flex-row">
						<DialogTitle>Delete {channel.name}</DialogTitle>
						<Badge variant="secondary" className="text-[10px] rounded-md">
							Events
						</Badge>
					</DialogHeader>
					<DialogDescription className="mt-1">
						This action cannot be undone. This will permanently the channel{" "}
						{channel.name} and all its events.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2 my-6">
					<Label htmlFor="confirm-delete">
						To confirm, type &quot;{channel.name}&quot; in the box below
					</Label>
					<Input
						id="confirm-delete"
						value={confirmInput}
						onChange={(e) => setConfirmInput(e.target.value)}
					/>
				</div>
				<DialogFooter>
					<Button onClick={handleDelete} variant="outline">
						Cancel
					</Button>
					<Button
						onClick={handleDelete}
						variant="destructive"
						disabled={confirmInput !== channel.name}
					>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

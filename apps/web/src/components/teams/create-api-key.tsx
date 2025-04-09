import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KeyIcon } from "lucide-react";
import { useState } from "react";
import { useRouteContext } from "@tanstack/react-router";
import { GenAPIKey, CreatedAPIKey } from "@/components/onboarding/gen-api-key";
import type { APIKey } from "@repo/api";

export function CreateApiKey({ triggerButton }: { triggerButton?: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const [createdApiKey, setCreatedApiKey] = useState<APIKey | null>(null);
	
	const { currentProject } = useRouteContext({
		from: "/_authd/$orgSlug/$projSlug/_dashboard",
	});
	
	const handleDone = () => {
		setCreatedApiKey(null);
		setOpen(false);
	};

	const defaultTrigger = (
		<Button variant="outline" className="gap-2">
			<KeyIcon className="size-4" />
			<span>Create API Key</span>
		</Button>
	);

	return (
		<Dialog open={open} onOpenChange={(newOpen) => {
			// Reset state when dialog closes
			if (!newOpen) {
				setCreatedApiKey(null);
			}
			setOpen(newOpen);
		}}>
			<DialogTrigger asChild>
				{triggerButton || defaultTrigger}
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl @container">
				<DialogHeader>
					<DialogTitle>
						{createdApiKey ? "API Key Created" : "Create API Key"}
					</DialogTitle>
					<DialogDescription>
						{createdApiKey
							? "Copy your API key now. You won't be able to see it again!"
							: "Give your API key a name and select the permissions."}
					</DialogDescription>
				</DialogHeader>

				{createdApiKey ? (
					<CreatedAPIKey 
						apiKey={createdApiKey} 
						onDone={handleDone} 
					/>
				) : (
					<GenAPIKey 
						projectId={currentProject.id}
						onCreated={setCreatedApiKey}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

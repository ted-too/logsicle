import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAppForm } from "@/components/ui/form";
import { createOrganization } from "@/server/teams/organizations";
import {
	type CreateOrganizationRequest,
	createOrganizationSchema,
} from "@repo/api";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "../ui/sonner-wrapper";

export function AddOrganization() {
	const [open, setOpen] = useState(false);

	const form = useAppForm({
		defaultValues: {
			name: "",
			description: "",
			logo: "",
		} as CreateOrganizationRequest,
		validators: {
			onSubmit: createOrganizationSchema,
		},
		onSubmit: async ({ value }) => {
			const { error } = await createOrganization({
				data: value,
			});
			if (error) {
				toast.APIError(error);
				return;
			}
			form.reset();
			toast.success("Organization created successfully");
			setOpen(false);
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<DropdownMenuItem
					className="gap-2 p-2"
					onSelect={(e) => e.preventDefault()}
				>
					<div className="flex size-6 items-center justify-center rounded-md border bg-background">
						<Plus className="size-4" />
					</div>
					<div className="font-medium text-muted-foreground">
						Add organization
					</div>
				</DropdownMenuItem>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Add organization</DialogTitle>
					<DialogDescription>
						Create a new organization to manage your projects.
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
					className="grid gap-4 py-4"
				>
					<form.AppField
						name="name"
						children={(field) => (
							<field.TextField
								type="text"
								label="Name"
								placeholder="Organization name"
							/>
						)}
					/>
					<form.AppField
						name="description"
						children={(field) => (
							<field.TextField
								type="text"
								label="Description"
								placeholder="Organization description"
							/>
						)}
					/>
					<form.AppField
						name="logo"
						children={(field) => (
							<field.TextField
								type="text"
								label="Logo"
								placeholder="https://example.com/logo.png"
							/>
						)}
					/>
				</form>
				<DialogFooter className="mt-4">
					<form.AppForm>
						<form.SubmitButton className="w-full" size="lg">
							Create organization
						</form.SubmitButton>
					</form.AppForm>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

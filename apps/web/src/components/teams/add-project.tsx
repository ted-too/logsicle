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
import { createProject } from "@/server/teams/projects";
import { LOG_RETENTION_DAYS } from "@repo/api";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/sonner-wrapper";
import { AllowedOrigins } from "./allowed-origins";

export function AddProject() {
  const [open, setOpen] = useState(false);

  const form = useAppForm({
    defaultValues: {
      name: "",
      log_retention_days: LOG_RETENTION_DAYS[2].toString(), // Default to 30 days (index 2)
      allowed_origins: [],
    },
    onSubmit: async ({ value }) => {
      const { error } = await createProject({
        data: value,
      });
      if (error) {
        toast.APIError(error);
        return;
      }
      form.reset();
      toast.success("Project created successfully");
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
          <div className="font-medium text-muted-foreground">Add project</div>
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add project</DialogTitle>
          <DialogDescription>
            Create a new project to manage your logs and events.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="grid gap-4"
        >
          <form.AppField
            name="name"
            children={(field) => (
              <field.TextField
                label="Name"
                description="This will be used to identify your project"
                placeholder="my app"
                required
              />
            )}
          />
          <form.AppField
            name="log_retention_days"
            children={(field) => (
              <field.SelectField
                label="Log Retention"
                description="How long your logs will be stored for"
                options={LOG_RETENTION_DAYS.map((days) => ({
                  label: `${days} days`,
                  value: days.toString(),
                }))}
                className={{ input: "w-full" }}
                primitiveProps={{
                  required: true,
                }}
              />
            )}
          />
          <form.AppField
            name="allowed_origins"
            children={() => <AllowedOrigins />}
          />
        </form>
        <DialogFooter className="mt-4">
          <form.AppForm>
            <form.SubmitButton className="w-full" size="lg">
              Create project
            </form.SubmitButton>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

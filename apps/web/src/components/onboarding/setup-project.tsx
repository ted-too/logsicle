import { Button } from "@/components/ui/button";
import { useAppForm } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner-wrapper";
import { cn } from "@/lib/utils";
import {
  createProject as serverCreateProject,
  updateProject as serverUpdateProject,
} from "@/server/teams/projects";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  type CreateProjectRequest,
  LOG_RETENTION_DAYS,
  allowedOriginSchema,
  createProjectSchema,
} from "@repo/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import { getProjectsQueryOptions, projectsQueryKey } from "@/qc/teams/projects";

export function SetupProject({
  steps,
}: {
  steps: { next: () => void; prev: () => void };
}) {
  const { currentUserOrg } = useRouteContext({
    from: "/_authd/$orgSlug/_onboarding/onboarding",
  });
  const { data: projects } = useQuery({
    ...getProjectsQueryOptions(),
    initialData: currentUserOrg.organization.projects,
  });
  const project = projects?.[0];
  const queryClient = useQueryClient();
  const [parent] = useAutoAnimate();

  const { mutateAsync: createProject } = useMutation({
    mutationFn: async (input: CreateProjectRequest) => {
      const { data, error } = await serverCreateProject({ data: input });
      if (error) return Promise.reject(error);
      return data;
    },
  });

  const { mutateAsync: updateProject } = useMutation({
    mutationFn: async (
      input: Partial<CreateProjectRequest> & { projectId: string }
    ) => {
      const { data, error } = await serverUpdateProject({
        data: {
          projectId: input.projectId,
          body: input,
        },
      });
      if (error) return Promise.reject(error);
      return data;
    },
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: projectsQueryKey,
      });
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: project?.name ?? "",
      log_retention_days: (project?.log_retention_days.toString() ??
        // biome-ignore lint/suspicious/noExplicitAny: zod is bugging
        LOG_RETENTION_DAYS[0].toString()) as any,
      allowed_origins: project?.allowed_origins ?? [],
    },
    validators: {
      onSubmit: createProjectSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        if (formApi.state.isDirty) {
          if (project) {
            await updateProject({ projectId: project.id, ...value });
            toast.success("Project updated successfully");
          } else {
            await createProject(value);
            toast.success("Project created successfully");
          }
        }
        steps.next();
      } catch (error) {
        toast.APIError(error);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="grid grid-flow-row grid-cols-2 gap-4"
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
            description="How long your logs shall be stored for"
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
        children={(field) => (
          <div className="col-span-2">
            <label
              htmlFor={field.name}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Allowed origins
            </label>
            <div className="relative mt-2" aria-required>
              <Input
                className="pe-11"
                placeholder="https://example.com or *"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();

                    // If value already contains "*", prevent adding other origins
                    if (field.state.value?.includes("*")) {
                      toast.warning(
                        "Cannot add specific origins when all origins (*) is selected"
                      );
                      return;
                    }

                    const input = e.currentTarget.value.trim();

                    const validationResult =
                      allowedOriginSchema.safeParse(input);
                    if (validationResult.success) {
                      if (validationResult.data === "*") {
                        field.handleChange(["*"]);
                        e.currentTarget.value = "";
                        return;
                      }

                      const parsedURL = new URL(validationResult.data);
                      parsedURL.pathname = "";
                      parsedURL.search = "";
                      const parsedURLString = parsedURL
                        .toString()
                        .replace(/\/$/, "");
                      // Add to array if it's not already included
                      if (!field.state.value?.includes(parsedURLString)) {
                        field.handleChange([
                          ...(field.state.value || []),
                          parsedURLString,
                        ]);
                      }
                      // Clear the input
                      e.currentTarget.value = "";
                    } else {
                      field.setErrorMap({
                        onChange: {
                          allowed_origins:
                            "Please enter a valid URL or use * to allow all origins",
                        },
                      });
                    }
                  }
                }}
              />
              <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-2 text-muted-foreground">
                <kbd className="inline-flex h-5 max-h-full items-center rounded border border-border px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70">
                  Enter
                </kbd>
              </div>
            </div>
            <div
              ref={parent}
              className={cn(
                "flex flex-wrap gap-3 mt-2",
                field.state.value?.length === 0 && "hidden"
              )}
            >
              {(field.state.value ?? []).map((origin, i) => (
                <div
                  key={`allowed-origin-${i}`}
                  className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-mono tracking-tight"
                >
                  <span className="whitespace-nowrap">
                    {origin === "*" ? "all origins [*]" : origin}
                  </span>
                  <Button
                    variant="link"
                    onClick={() => {
                      field.handleChange(
                        field.state.value?.filter((_, index) => index !== i) ||
                          []
                      );
                    }}
                    className="size-max p-0 [&_svg]:size-3"
                    size="icon"
                  >
                    <XIcon />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-sm mt-2">
              Where your logs will be sent from (use * to allow all origins)
            </p>
            {field.state.meta.errors && (
              <p className="text-destructive text-sm mt-1">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      />
      <form.Subscribe
        selector={(state) => state.isDirty}
        children={(isDirty) => (
          <form.AppForm>
            <form.SubmitButton className="mt-4 w-20">
              {project && isDirty ? "Update" : "Next"}
            </form.SubmitButton>
          </form.AppForm>
        )}
      />
    </form>
  );
}

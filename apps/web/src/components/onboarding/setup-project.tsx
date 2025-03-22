import { ActionButton, Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner-wrapper";
import { cn } from "@/lib/utils";
import {
  createProject as serverCreateProject,
  updateProject as serverUpdateProject,
} from "@/server/projects";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  allowedOriginSchema,
  CreateProjectRequest,
  createProjectSchema,
  LOG_RETENTION_DAYS
} from "@repo/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function SetupProject({
  steps,
}: {
  steps: { next: () => void; prev: () => void };
}) {
  const { currentUserOrg } = useRouteContext({
    from: "/_authd/$orgSlug/_onboarding/onboarding",
  });
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
      const { data, error } = await serverUpdateProject({ data: input });
      if (error) return Promise.reject(error);
      return data;
    },
  });

  const project = currentUserOrg.organization.projects?.[0];

  const form = useForm<CreateProjectRequest>({
    resolver: zodResolver(createProjectSchema),
    defaultValues:
      project !== undefined
        ? {
            name: project.name,
            log_retention_days: project.log_retention_days,
            allowed_origins: project.allowed_origins,
            organization_id: project.organization_id,
          }
        : {
            name: "",
            log_retention_days: LOG_RETENTION_DAYS[0],
            allowed_origins: [],
            organization_id: currentUserOrg.organization.id,
          },
  });

  async function onSubmit(input: z.infer<typeof createProjectSchema>) {
    try {
      if (project) {
        await updateProject({ projectId: project.id, ...input });
        toast.success("Project updated successfully");
      } else {
        await createProject(input);
        toast.success("Project created successfully");
      }
      // Do this in the useMutation onSuccess
      // await queryClient.refetchQueries({
      //   queryKey: projectsQueries.listQueryOptions().queryKey,
      // });
      steps.next();
    } catch (error) {
      toast.APIError(error);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-flow-row grid-cols-2 gap-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="my app" {...field} required />
              </FormControl>
              <FormDescription>
                This will be used to identify your project
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="log_retention_days"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Log Retention</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value.toString()}
                required
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LOG_RETENTION_DAYS.map((days) => (
                    <SelectItem key={days} value={days.toString()}>
                      {days} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                How long your logs shall be stored for
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="allowed_origins"
          render={({ field: { onChange, onBlur: _, value, ...field } }) => (
            <FormItem className="col-span-2">
              <FormLabel>Allowed origins</FormLabel>
              <FormControl>
                <div className="relative" aria-required>
                  <Input
                    className="pe-11"
                    placeholder="https://example.com or *"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();

                        // If value already contains "*", prevent adding other origins
                        if (value.includes("*")) {
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
                            onChange(["*"]);
                            e.currentTarget.value = "";
                            form.clearErrors("allowed_origins");
                            return;
                          }

                          const parsedURL = new URL(validationResult.data);
                          parsedURL.pathname = "";
                          parsedURL.search = "";
                          const parsedURLString = parsedURL
                            .toString()
                            .replace(/\/$/, "");
                          // Add to array if it's not already included
                          if (!value.includes(parsedURLString)) {
                            onChange([...value, parsedURLString]);
                          }
                          // Clear the input
                          e.currentTarget.value = "";
                          // Reset the error
                          form.clearErrors("allowed_origins");
                        } else {
                          form.setError("allowed_origins", {
                            type: "manual",
                            message:
                              "Please enter a valid URL or use * to allow all origins",
                          });
                        }
                      }
                    }}
                    {...field}
                  />
                  <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-2 text-muted-foreground">
                    <kbd className="inline-flex h-5 max-h-full items-center rounded border border-border px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70">
                      Enter
                    </kbd>
                  </div>
                </div>
              </FormControl>
              <FormDescription>
                Where your logs will be sent from (use * to allow all origins)
              </FormDescription>
              <div
                ref={parent}
                className={cn(
                  "flex flex-wrap gap-3",
                  value.length == 0 && "hidden"
                )}
              >
                {value.map((origin, i) => (
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
                        onChange(value.filter((_, index) => index !== i));
                      }}
                      className="size-max p-0 [&_svg]:size-3"
                      size="icon"
                    >
                      <XIcon />
                    </Button>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <ActionButton
          type="submit"
          variant="caribbean"
          className="mt-4 w-20"
          isLoading={form.formState.isSubmitting}
          disabled={!form.formState.isDirty}
        >
          {project ? "Update" : "Next"}
        </ActionButton>
      </form>
    </Form>
  );
}

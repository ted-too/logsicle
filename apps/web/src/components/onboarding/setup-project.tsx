import { useAppForm } from "@/components/ui/form";
import { toast } from "@/components/ui/sonner-wrapper";
import {
	createProject as serverCreateProject,
	updateProject as serverUpdateProject,
} from "@/server/teams/projects";
import {
	type CreateProjectRequest,
	LOG_RETENTION_DAYS,
	createProjectSchema,
} from "@repo/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { getProjectsQueryOptions, projectsQueryKey } from "@/qc/teams/projects";
import { AllowedOrigins } from "../teams/allowed-origins";

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

	const { mutateAsync: createProject } = useMutation({
		mutationFn: async (input: CreateProjectRequest) => {
			const { data, error } = await serverCreateProject({ data: input });
			if (error) return Promise.reject(error);
			return data;
		},
	});

	const { mutateAsync: updateProject } = useMutation({
		mutationFn: async (
			input: Partial<CreateProjectRequest> & { projectId: string },
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
				children={() => <AllowedOrigins />}
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

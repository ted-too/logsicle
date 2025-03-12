import type { ErrorResponse, FnResponse, Opts } from "@/types";
import { z } from "zod";
import type { APIKey } from "./keys";

export const LOG_RETENTION_DAYS = [3, 7, 14, 30, 90];

export const allowedOriginSchema = z.union([z.literal("*"), z.string().url()]);

export const createProjectSchema = z.object({
	name: z.string().min(1, "Name is required"),
	allowed_origins: z
		.array(allowedOriginSchema)
		.min(1, "At least one allowed origin is required"),
	log_retention_days: z.coerce
		.number()
		.refine((val) => LOG_RETENTION_DAYS.includes(val), {
			message: `Log retention days must be one of: ${LOG_RETENTION_DAYS.join(", ")}`,
		}),
	organization_id: z.string().min(1, "Organization ID is required"),
});

export type CreateProjectRequest = z.infer<typeof createProjectSchema>;

export interface Project {
	id: string;
	created_at: string;
	updated_at: string;
	user_id: string;
	organization_id: string;
	name: string;
	allowed_origins: string[];
	log_retention_days: number;
	// TODO: Add types for these
	channels: any[];
	api_keys: APIKey[];
}

export async function createProject(
	data: CreateProjectRequest,
	{ baseURL, ...opts }: Opts,
): Promise<FnResponse<Project>> {
	const res = await fetch(`${baseURL}/v1/projects`, {
		method: "POST",
		body: JSON.stringify(data),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
		...opts,
	});

	let resJSON: unknown | undefined = undefined;
	try {
		resJSON = await res.json();
	} catch (error) {
		return {
			data: null,
			error: {
				message: "Failed to create project",
				error: "Failed to parse JSON response",
			},
		};
	}

	if (!res.ok) {
		return { data: null, error: resJSON as ErrorResponse };
	}

	return { data: resJSON as Project, error: null };
}

export async function updateProject(
	projectId: string,
	data: Partial<CreateProjectRequest>,
	{ baseURL, ...opts }: Opts,
): Promise<FnResponse<Project>> {
	const res = await fetch(`${baseURL}/v1/projects/${projectId}`, {
		method: "PATCH",
		body: JSON.stringify(data),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
		...opts,
	});

	let resJSON: unknown | undefined = undefined;
	try {
		resJSON = await res.json();
	} catch (error) {
		return {
			data: null,
			error: {
				message: "Failed to update project",
				error: "Failed to parse JSON response",
			},
		};
	}

	if (!res.ok) {
		return { data: null, error: resJSON as ErrorResponse };
	}

	return { data: resJSON as Project, error: null };
}

export async function listProjects({
	baseURL,
	organizationId,
	...opts
}: Opts & { organizationId?: string }): Promise<FnResponse<Project[]>> {
	const url = new URL(`${baseURL}/v1/projects`);
	if (organizationId) {
		url.searchParams.append('organization_id', organizationId);
	}

	const res = await fetch(url.toString(), {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
		...opts,
	});

	let resJSON: unknown | undefined = undefined;
	try {
		resJSON = await res.json();
	} catch (error) {
		return {
			data: null,
			error: {
				message: "Failed to list projects",
				error: "Failed to parse JSON response",
			},
		};
	}

	if (!res.ok) {
		return { data: null, error: resJSON as ErrorResponse };
	}

	return { data: resJSON as Project[], error: null };
}

export interface ProjectWithLastActivity extends Project {
	last_activity: {
		app_logs: string | null;
		event_logs: string | null;
		request_logs: string | null;
		metrics: string | null;
	};
}

export async function getProject(
	projectId: string,
	{ baseURL, ...opts }: Opts,
): Promise<FnResponse<ProjectWithLastActivity>> {
	const res = await fetch(`${baseURL}/v1/projects/${projectId}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
		...opts,
	});

	let resJSON: unknown | undefined = undefined;
	try {
		resJSON = await res.json();
	} catch (error) {
		return {
			data: null,
			error: {
				message: "Failed to get project",
				error: "Failed to parse JSON response",
			},
		};
	}

	if (!res.ok) {
		return { data: null, error: resJSON as ErrorResponse };
	}

	return { data: resJSON as ProjectWithLastActivity, error: null };
}

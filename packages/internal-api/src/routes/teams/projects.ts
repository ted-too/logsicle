import { type ErrorResponse, type Opts, createClient } from "@/index";
import type { EventChannel } from "@/routes/resources/events";
import type { APIKey } from "@/routes/auth/api-keys";
import type { OtherUser } from "@/routes/auth/basic";
import { z } from "zod";

export interface Project {
  id: string;
  created_at: string;
  deleted_at: string | null;
  updated_at: string;
  created_by_id: string;
  created_by: OtherUser;
  organization_id: string;
  name: string;
  slug: string;
  allowed_origins: string[];
  log_retention_days: number;
  event_channels: EventChannel[];
  api_keys: APIKey[];
}

export const LOG_RETENTION_DAYS = [3, 7, 14, 30, 90];

export const allowedOriginSchema = z.union([z.literal("*"), z.string().url()]);

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  allowed_origins: z.array(z.string()).optional(),
  log_retention_days: z.number().min(1).optional(),
});

export type CreateProjectRequest = z.infer<typeof createProjectSchema>;

export async function createProject(
  body: CreateProjectRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<Project, ErrorResponse>("/v1/projects", {
    method: "POST",
    body: JSON.stringify(body),
    credentials: "include",
    ...opts,
  });
}

export async function listProjects({ $fetch, ...opts }: Opts) {
  const client = $fetch ?? createClient();

  return await client<Project[], ErrorResponse>("/v1/projects", {
    credentials: "include",
    ...opts,
  });
}

export async function getProject(projectId: string, { $fetch, ...opts }: Opts) {
  const client = $fetch ?? createClient();

  return await client<Project, ErrorResponse>(`/v1/projects/${projectId}`, {
    credentials: "include",
    ...opts,
  });
}

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;

export async function updateProject(
  projectId: string,
  body: UpdateProjectRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<Project, ErrorResponse>(`/v1/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    credentials: "include",
    ...opts,
  });
}

export async function deleteProject(
  projectId: string,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<void, ErrorResponse>(`/v1/projects/${projectId}`, {
    method: "DELETE",
    credentials: "include",
    ...opts,
  });
}

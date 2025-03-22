import type { ErrorResponse, Opts } from "@/types";
import { z } from "zod";
import { createClient } from "..";
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
  slug: string;
  allowed_origins: string[];
  log_retention_days: number;
  // TODO: Add types for these
  channels: any[];
  api_keys: APIKey[];
}

export async function createProject(
  data: CreateProjectRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<Project, ErrorResponse>("/v1/projects", {
    method: "POST",
    body: data,
    credentials: "include",
    ...opts,
  });
}

export async function updateProject(
  projectId: string,
  data: Partial<CreateProjectRequest>,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<Project, ErrorResponse>(`/v1/projects/${projectId}`, {
    method: "PATCH",
    body: data,
    credentials: "include",
    ...opts,
  });
}

export async function listProjects({
  $fetch,
  organizationId,
  ...opts
}: Opts & { organizationId?: string }) {
  const client = $fetch ?? createClient();

  return await client<Project[], ErrorResponse>(
    `/v1/projects${organizationId ? `?organization_id=${organizationId}` : ""}`,
    {
      credentials: "include",
      ...opts,
    }
  );
}

export interface ProjectWithLastActivity extends Project {
  last_activity: {
    app_logs: string | null;
    event_logs: string | null;
    request_logs: string | null;
    metrics: string | null;
  };
}

export async function getProject(projectId: string, { $fetch, ...opts }: Opts) {
  const client = $fetch ?? createClient();

  return await client<ProjectWithLastActivity, ErrorResponse>(
    `/v1/projects/${projectId}`,
    {
      credentials: "include",
      ...opts,
    }
  );
}

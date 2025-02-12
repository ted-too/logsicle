import type { APIKey, ErrorResponse, FnResponse, Opts } from "@/types";
import { z } from "zod";

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
});

export type CreateProjectRequest = z.infer<typeof createProjectSchema>;

export interface Project {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  name: string;
  allowed_origins: string[];
  log_retention_days: number;
  // TODO: Add types for these
  channels: any[];
  api_keys: APIKey[];
}

export async function createProject(
  data: CreateProjectRequest,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<Project>> {
  const res = await fetch(`${baseURL}/api/v1/projects`, {
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
  { baseURL, ...opts }: Opts
): Promise<FnResponse<Project>> {
  const res = await fetch(`${baseURL}/api/v1/projects/${projectId}`, {
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
  ...opts
}: Opts): Promise<FnResponse<Project[]>> {
  const res = await fetch(`${baseURL}/api/v1/projects`, {
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

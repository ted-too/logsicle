import { type ErrorResponse, type Opts, createClient } from "@/index";
import { z } from "zod";

export const API_KEY_SCOPES = [
  "app:write",
  "app:read",
  "metrics:write",
  "metrics:read",
  "events:write",
  "events:read",
  "request:write",
  "request:read",
  "traces:write",
  "traces:read",
] as const;

export type APIKeyScope = (typeof API_KEY_SCOPES)[number];

export const API_KEY_WRITE_SCOPE_INFO: {
  value: APIKeyScope;
  label: string;
  description: string;
}[] = [
  {
    value: "app:write",
    label: "Write App Logs",
    description: "Allows creating and ingesting application logs",
  },
  {
    value: "metrics:write",
    label: "Write Metrics",
    description: "Allows sending and recording metrics data",
  },
  {
    value: "events:write",
    label: "Write Events",
    description: "Allows creating and sending custom events",
  },
  {
    value: "request:write",
    label: "Write Request Logs",
    description: "Allows creating and ingesting request logs",
  },
  {
    value: "traces:write",
    label: "Write Traces",
    description: "Allows creating and ingesting traces",
  },
] as const;

// TODO: Add read scopes

export interface APIKey {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  project_id: string;
  created_by: string;
  name: string;
  key: string;
  masked_key: string;
  scopes: APIKeyScope[];
}


export const createAPIKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
  scopes: z
    .array(z.enum(API_KEY_SCOPES))
    .min(1, "At least one scope is required"),
});

export type CreateAPIKeyRequest = z.infer<typeof createAPIKeySchema>;

export interface CreateAPIKeyResponse {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  created_by: string;
  created_at: string;
}

export async function createAPIKey(
  projectId: string,
  body: CreateAPIKeyRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<CreateAPIKeyResponse, ErrorResponse>(
    `/v1/projects/${projectId}/api-keys`,
    {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "include",
      ...opts,
    }
  );
}

export async function listAPIKeys(
  projectId: string,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<APIKey[], ErrorResponse>(
    `/v1/projects/${projectId}/api-keys`,
    {
      credentials: "include",
      ...opts,
    }
  );
}

export async function deleteAPIKey(
  projectId: string,
  keyId: string,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<void, ErrorResponse>(
    `/v1/projects/${projectId}/api-keys/${keyId}`,
    {
      method: "DELETE",
      credentials: "include",
      ...opts,
    }
  );
}

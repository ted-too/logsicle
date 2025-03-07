import type { ErrorResponse, FnResponse, Opts } from "@/types";
import { z } from "zod";

export const apiKeyScopeSchema = z.enum([
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
]);

export type APIKeyScope = z.infer<typeof apiKeyScopeSchema>;

export const API_KEY_WRITE_SCOPE_INFO = [
  {
    value: "app:write",
    label: "Write App Logs",
    description: "Allows creating and ingesting application logs"
  },
  {
    value: "metrics:write",
    label: "Write Metrics",
    description: "Allows sending and recording metrics data"
  },
  {
    value: "events:write",
    label: "Write Events",
    description: "Allows creating and sending custom events"
  },
  {
    value: "request:write",
    label: "Write Request Logs",
    description: "Allows creating and ingesting request logs"
  },
  {
    value: "traces:write",
    label: "Write Traces",
    description: "Allows creating and ingesting traces"
  },
] as const;


export const createAPIKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
  scopes: z.array(apiKeyScopeSchema).min(1, "At least one scope is required"),
});

export type CreateAPIKeyRequest = z.infer<typeof createAPIKeySchema>;

export interface APIKey {
  id: string;
  name: string;
  project_id: string;
  key: string;
  scopes: APIKeyScope[];
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export async function createAPIKey(
  projectId: string,
  data: CreateAPIKeyRequest,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<APIKey>> {
  const res = await fetch(`${baseURL}/v1/projects/${projectId}/api-keys`, {
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
        message: "Failed to create API key",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as APIKey, error: null };
}

export async function listAPIKeys(
  projectId: string,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<APIKey[]>> {
  const res = await fetch(`${baseURL}/v1/projects/${projectId}/api-keys`, {
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
        message: "Failed to list API keys",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as APIKey[], error: null };
}

export async function deleteAPIKey(
  projectId: string,
  keyId: string,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<null>> {
  const res = await fetch(
    `${baseURL}/v1/projects/${projectId}/api-keys/${keyId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      ...opts,
    }
  );

  if (!res.ok) {
    let error: ErrorResponse;
    try {
      error = await res.json();
    } catch {
      error = {
        message: "Failed to delete API key",
        error: "Failed to parse JSON response",
      };
    }
    return { data: null, error };
  }

  return { data: null, error: null };
}

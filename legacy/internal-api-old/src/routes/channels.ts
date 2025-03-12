
import type { ErrorResponse, FnResponse, Opts } from "@/types";

export interface EventChannel {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  color: string | null;
  retention_days: number | null;
  required_tags: string[] | null;
  metadata_schema: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  deleted_at: null | string;
}

export async function listEventChannels(
  projectId: string,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<EventChannel[]>> {
  const res = await fetch(
    `${baseURL}/v1/projects/${projectId}/events/channels`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      ...opts,
    }
  );

  let resJSON: unknown | undefined = undefined;
  try {
    resJSON = await res.json();
  } catch (error) {
    return {
      data: null,
      error: {
        message: "Failed to list event channels",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as EventChannel[], error: null };
}

export async function getEventChannel(
  projectId: string,
  channelId: string,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<EventChannel>> {
  const res = await fetch(
    `${baseURL}/v1/projects/${projectId}/events/channels/${channelId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      ...opts,
    }
  );

  let resJSON: unknown | undefined = undefined;
  try {
    resJSON = await res.json();
  } catch (error) {
    return {
      data: null,
      error: {
        message: "Failed to get event channel",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as EventChannel, error: null };
}

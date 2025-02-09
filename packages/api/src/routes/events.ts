import type {
  ErrorResponse,
  FnResponse,
  Opts,
  PaginatedResponse,
} from "../index";
import { z } from "zod";

export interface ChannelRelation {
  name: string;
  color: string | null;
}

// Types for event logs
export interface EventLog {
  id: string;
  project_id: string;
  channel_id?: string;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  timestamp: string;
  channel: ChannelRelation | null;
}

// Types for metrics
export interface EventMetric {
  bucket: string;
  count: number;
}

// Query parameter schemas
export const timeRangeSchema = z.enum(["24h", "7d", "30d"]);
export type TimeRange = z.infer<typeof timeRangeSchema>;

export const getEventLogsSchema = z.object({
  channelId: z.string().optional(),
  before: z.string().datetime().optional(), // ISO string
  limit: z.number().min(1).max(100).optional(),
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type GetEventLogsParams = z.infer<typeof getEventLogsSchema>;

export const getEventMetricsSchema = z.object({
  channelId: z.string().optional(),
  range: timeRangeSchema,
  name: z.string().optional(),
});

export type GetEventMetricsParams = z.infer<typeof getEventMetricsSchema>;

// Function to build query string from params
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getEventLogs(
  projectId: string,
  params: GetEventLogsParams,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<PaginatedResponse<EventLog>>> {
  const queryString = buildQueryString(params);

  const res = await fetch(
    `${baseURL}/api/v1/projects/${projectId}/events${queryString}`,
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
        message: "Failed to fetch event logs",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as PaginatedResponse<EventLog>, error: null };
}

// Get event metrics for graphs
export async function getEventMetrics(
  projectId: string,
  params: GetEventMetricsParams,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<EventMetric[]>> {
  const queryString = buildQueryString(params);

  const res = await fetch(
    `${baseURL}/api/v1/projects/${projectId}/events/metrics${queryString}`,
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
        message: "Failed to fetch event metrics",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as EventMetric[], error: null };
}

export async function deleteEventLog(
  projectId: string,
  logId: string,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<void>> {
  const res = await fetch(
    `${baseURL}/api/v1/projects/${projectId}/logs/event/${logId}`,
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
    let error: ErrorResponse | undefined;
    try {
      error = await res.json();
    } catch {
      error = {
        message: "Failed to delete event log",
        error: "Unknown error occurred",
      };
    }
    return { data: null, error: error! };
  }

  return { data: undefined, error: null };
}

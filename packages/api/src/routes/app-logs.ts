import type {
  ErrorResponse,
  FnResponse,
  Opts,
  PaginatedResponse,
} from "@/types";
import { z } from "zod";
import { timeRangeSchema } from "@/validations";

// Types for app logs
export interface AppLog {
  id: string;
  project_id: string;
  channel_id: string | null;
  level: LogLevel;
  message: string;
  fields: Record<string, any> | null;
  timestamp: string;
  caller: string | null;
  function: string | null;
  service_name: string;
  version: string | null;
  environment: string | null;
  host: string | null;
  // channel: ChannelRelation | null;
}

// Types for metrics
export interface AppLogMetric {
  bucket: string;
  count: number;
}

// Query parameter schemas
export const logLevelSchema = z.enum([
  "debug",
  "info",
  "warning",
  "error",
  "fatal",
]);
export type LogLevel = z.infer<typeof logLevelSchema>;

export const getAppLogsSchema = z.object({
  channelId: z.string().optional(),
  before: z.string().datetime().optional(), // ISO string
  limit: z.number().min(1).max(100).optional(),
  level: logLevelSchema.optional(),
  serviceName: z.string().optional(),
  environment: z.string().optional(),
  search: z.string().optional(),
  start: timeRangeSchema.start,
  end: timeRangeSchema.end,
});

export type GetAppLogsParams = z.infer<typeof getAppLogsSchema>;

export const getAppLogMetricsSchema = z.object({
  channelId: z.string().optional(),
  level: logLevelSchema.optional(),
  serviceName: z.string().optional(),
  environment: z.string().optional(),
  start: timeRangeSchema.start,
  end: timeRangeSchema.end,
});

export type GetAppLogMetricsParams = z.infer<typeof getAppLogMetricsSchema>;

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

// Get app logs with pagination and filtering
export async function getAppLogs(
  projectId: string,
  params: GetAppLogsParams,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<PaginatedResponse<AppLog>>> {
  const queryString = buildQueryString(params);

  const res = await fetch(
    `${baseURL}/api/v1/projects/${projectId}/app${queryString}`,
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
        message: "Failed to fetch app logs",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as PaginatedResponse<AppLog>, error: null };
}

// Get app log metrics for graphs
export async function getAppLogMetrics(
  projectId: string,
  params: GetAppLogMetricsParams,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<AppLogMetric[]>> {
  const queryString = buildQueryString(params);

  const res = await fetch(
    `${baseURL}/api/v1/projects/${projectId}/app/metrics${queryString}`,
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
        message: "Failed to fetch app log metrics",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as AppLogMetric[], error: null };
}

// Delete a specific app log
export async function deleteAppLog(
  projectId: string,
  logId: string,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<void>> {
  const res = await fetch(
    `${baseURL}/api/v1/projects/${projectId}/logs/app/${logId}`,
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
        message: "Failed to delete app log",
        error: "Unknown error occurred",
      };
    }
    return { data: null, error: error! };
  }

  return { data: undefined, error: null };
}

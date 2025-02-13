import type {
  ErrorResponse,
  FnResponse,
  Opts,
  PaginatedResponse,
} from "@/types";
import { z } from "zod";
import {
  optionalStringSchema,
  timeRangeSchema,
  validIntervalSchema,
} from "@/validations";

// Types for app logs
export interface AppLog {
  id: string;
  project_id: string;
  level: LogLevel;
  message: string;
  fields: Record<string, any> | null;
  timestamp: string;
  service_name: string;
  caller: string | null;
  function: string | null;
  version: string | null;
  environment: string | null;
  host: string | null;
}

// Types for metrics
export interface AppLogMetric {
  timestamp: string;
  counts: {
    debug: number;
    error: number;
    fatal: number;
    info: number;
    warning: number;
  };
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

const baseAppLogQuerySchema = z.object({
  level: logLevelSchema.optional(),
  serviceName: optionalStringSchema,
  environment: optionalStringSchema,
  search: optionalStringSchema,
  start: timeRangeSchema.start,
  end: timeRangeSchema.end,
});

export const getAppLogsSchema = baseAppLogQuerySchema.extend({
  limit: z.number().min(1).max(100).default(20),
  page: z.number().min(1).default(1),
});

export type GetAppLogsParams = z.infer<typeof getAppLogsSchema>;

export const getAppLogMetricsSchema = baseAppLogQuerySchema.extend({
  interval: validIntervalSchema,
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

// Add these to your existing types
export interface LogLevelCounts {
  [level: string]: number; // e.g., { "error": 5, "info": 120, "warn": 10 }
}

export interface LogMetric {
  timestamp: string;
  counts: LogLevelCounts;
}

// Add this to your existing parameter schemas
export const logMetricsSchema = z.object({
  channelId: z.string().optional(),
  level: logLevelSchema.optional(),
  serviceName: z.string().optional(),
  environment: z.string().optional(),
  search: z.string().optional(),
  interval: z.string().optional(), // e.g., '1 hour', '30 minutes', '1 day'
  start: timeRangeSchema.start,
  end: timeRangeSchema.end,
});

export type GetLogMetricsParams = z.infer<typeof logMetricsSchema>;

// Add this new function to fetch the metrics
export async function getLogMetrics(
  projectId: string,
  params: GetLogMetricsParams,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<LogMetric[]>> {
  const queryString = buildQueryString(params);

  const res = await fetch(
    `${baseURL}/api/v1/projects/${projectId}/logs/metrics${queryString}`,
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
        message: "Failed to fetch log metrics",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as LogMetric[], error: null };
}

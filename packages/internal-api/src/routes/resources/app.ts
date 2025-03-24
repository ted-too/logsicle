import { type ErrorResponse, type Opts, createClient } from "@/index";
import { z } from "zod";

export interface AppLog {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  project_id: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  metadata: Record<string, string | number | boolean | null>;
  service_name: string;
  environment: string;
  timestamp: string;
}

export interface AppLogMetrics {
  total: number;
  by_level: {
    level: string;
    count: number;
  }[];
  by_service: {
    service: string;
    count: number;
  }[];
  by_environment: {
    environment: string;
    count: number;
  }[];
  by_time: {
    timestamp: string;
    count: number;
  }[];
}

// List App Logs
export const listAppLogsSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
  level: z.enum(["debug", "info", "warn", "error"]).optional(),
  service_name: z.string().optional(),
  environment: z.string().optional(),
  search: z.string().optional(),
});

export type ListAppLogsRequest = z.infer<typeof listAppLogsSchema>;

export interface ListAppLogsResponse {
  data: AppLog[];
  meta: {
    total: number;
    filtered: number;
    page: number;
    limit: number;
  };
}

export async function listAppLogs(
  projectId: string,
  query: ListAppLogsRequest,
  { $fetch, ...opts }: Opts,
) {
  const client = $fetch ?? createClient();

  return await client<ListAppLogsResponse, ErrorResponse>(
    `/v1/projects/${projectId}/app`,
    {
      credentials: "include",
      query,
      ...opts,
    }
  );
}

// Delete App Log
export async function deleteAppLog(
  projectId: string,
  logId: string,
  { $fetch, ...opts }: Opts,
) {
  const client = $fetch ?? createClient();

  return await client<void, ErrorResponse>(
    `/v1/projects/${projectId}/app/${logId}`,
    {
      method: "DELETE",
      credentials: "include",
      ...opts,
    }
  );
}

// Get App Log Metrics
export const getAppMetricsSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  interval: z.enum(["1m", "5m", "15m", "30m", "1h", "6h", "12h", "24h"]).optional(),
  level: z.enum(["debug", "info", "warn", "error"]).optional(),
  service_name: z.string().optional(),
  environment: z.string().optional(),
});

export type GetAppMetricsRequest = z.infer<typeof getAppMetricsSchema>;

export async function getAppMetrics(
  projectId: string,
  query: GetAppMetricsRequest,
  { $fetch, ...opts }: Opts,
) {
  const client = $fetch ?? createClient();

  return await client<AppLogMetrics, ErrorResponse>(
    `/v1/projects/${projectId}/app/metrics`,
    {
      credentials: "include",
      query,
      ...opts,
    }
  );
}

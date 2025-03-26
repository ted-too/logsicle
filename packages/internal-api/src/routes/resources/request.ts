import { type ErrorResponse, type Opts, createClient } from "@/index";
import { z } from "zod";
import type { JsonValue, PaginatedResponse } from "@/types";
import {
  createTimeRangedPaginatedSchema,
  baseMetricsSchema,
} from "@/validations";

// HTTP methods supported in request logs
export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "TRACE",
  "CONNECT",
] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface RequestLog {
  id: string;
  project_id: string;
  method: HttpMethod;
  path: string;
  status_code: number;
  duration: number;
  request_body: JsonValue | null;
  response_body: JsonValue | null;
  headers: Record<string, string> | null;
  query_params: Record<string, string> | null;
  user_agent: string | null;
  ip_address: string;
  protocol: string | null;
  host: string | null;
  error: string | null;
  timestamp: string;
}

export interface RequestLogMetrics {
  total: number;
  by_method: {
    method: string;
    count: number;
  }[];
  by_status_code: {
    status_code: number;
    count: number;
  }[];
  by_host: {
    host: string;
    count: number;
  }[];
  by_time: {
    timestamp: number;
    count: number;
  }[];
}

// List Request Logs
export const listRequestLogsSchema = createTimeRangedPaginatedSchema({
  method: z.enum(HTTP_METHODS).optional(),
  statusCode: z.number().min(100).max(599).optional(),
  pathPattern: z.string().optional(),
  host: z.string().optional(),
});

export type ListRequestLogsRequest = z.infer<typeof listRequestLogsSchema>;

export async function listRequestLogs(
  projectId: string,
  query: ListRequestLogsRequest,
  { $fetch, ...opts }: Opts,
) {
  const client = $fetch ?? createClient();

  return await client<PaginatedResponse<RequestLog>, ErrorResponse>(
    `/v1/projects/${projectId}/request`,
    {
      credentials: "include",
      query,
      ...opts,
    },
  );
}

// Delete Request Log
export async function deleteRequestLog(
  projectId: string,
  logId: string,
  { $fetch, ...opts }: Opts,
) {
  const client = $fetch ?? createClient();

  return await client<void, ErrorResponse>(
    `/v1/projects/${projectId}/request/${logId}`,
    {
      method: "DELETE",
      credentials: "include",
      ...opts,
    },
  );
}

// Get Request Log Metrics
export const getRequestMetricsSchema = baseMetricsSchema.extend({
  method: z.enum(HTTP_METHODS).optional(),
  statusCode: z.number().min(100).max(599).optional(),
  host: z.string().optional(),
});

export type GetRequestMetricsRequest = z.infer<typeof getRequestMetricsSchema>;

export async function getRequestMetrics(
  projectId: string,
  query: GetRequestMetricsRequest,
  { $fetch, ...opts }: Opts,
) {
  const client = $fetch ?? createClient();

  return await client<RequestLogMetrics, ErrorResponse>(
    `/v1/projects/${projectId}/request/metrics`,
    {
      credentials: "include",
      query,
      ...opts,
    },
  );
}

// Get stream URL for request logs
export function getRequestLogsStreamUrl(
  projectId: string,
  baseUrl = globalThis.document?.location.origin
): string {
  const url = new URL(`/v1/projects/${projectId}/request/stream`, baseUrl);
  return url.toString();
} 
import { type ErrorResponse, type Opts, createClient } from "@/index";
import { z } from "zod";
import type { JsonValue, PaginatedResponse } from "@/types";
import { createTimeRangedPaginatedSchema, baseMetricsSchema } from "@/validations";

// Span kinds from OpenTelemetry
export const SPAN_KINDS = [
  "SPAN_KIND_UNSPECIFIED",
  "SPAN_KIND_INTERNAL",
  "SPAN_KIND_SERVER",
  "SPAN_KIND_CLIENT",
  "SPAN_KIND_PRODUCER",
  "SPAN_KIND_CONSUMER"
] as const;
export type SpanKind = typeof SPAN_KINDS[number];

// Span status values
export const SPAN_STATUSES = ["STATUS_UNSET", "STATUS_OK", "STATUS_ERROR"] as const;
export type SpanStatus = typeof SPAN_STATUSES[number];

// Trace events within a span
export interface TraceEvent {
  name: string;
  timestamp: string;
  attributes: JsonValue | null;
}

// Links to other spans
export interface TraceLink {
  trace_id: string;
  span_id: string;
  attributes: JsonValue | null;
}

// Main trace interface matching the API model
export interface Trace {
  id: string;
  trace_id: string;
  parent_id: string | null;
  project_id: string;
  name: string;
  kind: SpanKind;
  start_time: string;
  end_time: string;
  duration_ms: number;
  status: SpanStatus;
  status_message: string | null;
  service_name: string;
  service_version: string | null;
  attributes: JsonValue | null;
  events: JsonValue | null;
  links: JsonValue | null;
  resource_attributes: JsonValue | null;
  timestamp: string;
}

export interface TraceStats {
  stats: {
    timestamp: number;
    count: number;
  }[];
  interval: string;
}

// List Traces
export const listTracesSchema = createTimeRangedPaginatedSchema({
  trace_id: z.string().optional(),
  service_name: z.string().optional(),
  status: z.enum(SPAN_STATUSES).optional(),
});

export type ListTracesRequest = z.infer<typeof listTracesSchema>;

export async function listTraces(
  projectId: string,
  query: ListTracesRequest,
  { $fetch, ...opts }: Opts,
) {
  const client = $fetch ?? createClient();

  return await client<PaginatedResponse<Trace>, ErrorResponse>(
    `/v1/projects/${projectId}/traces`,
    {
      credentials: "include",
      query,
      ...opts,
    },
  );
}

// Get Trace Stats
export const getTraceStatsSchema = baseMetricsSchema.extend({
  service_name: z.string().optional(),
  status: z.enum(SPAN_STATUSES).optional(),
});

export type GetTraceStatsRequest = z.infer<typeof getTraceStatsSchema>;

export async function getTraceStats(
  projectId: string,
  query: GetTraceStatsRequest,
  { $fetch, ...opts }: Opts,
) {
  const client = $fetch ?? createClient();

  return await client<TraceStats, ErrorResponse>(
    `/v1/projects/${projectId}/traces/stats`,
    {
      credentials: "include",
      query,
      ...opts,
    },
  );
}

// Get Trace Timeline - all spans for a specific trace
export async function getTraceTimeline(
  projectId: string,
  traceId: string,
  { $fetch, ...opts }: Opts,
) {
  const client = $fetch ?? createClient();

  return await client<{ spans: Trace[] }, ErrorResponse>(
    `/v1/projects/${projectId}/traces/${traceId}`,
    {
      credentials: "include",
      ...opts,
    },
  );
} 
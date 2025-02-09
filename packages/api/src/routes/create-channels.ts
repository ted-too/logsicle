import {
  type ErrorResponse,
  type FnResponse,
  type Opts,
} from "../index";
import { LOG_RETENTION_DAYS } from "./projects";
import { z } from "zod";

// Channel type enum
export const channelTypeSchema = z.enum(["event", "app", "request", "trace"]);
export type ChannelType = z.infer<typeof channelTypeSchema>;

export const AVAILABLE_COLORS = [
  "#e76f51",
  "#f4a261",
  "#e9c46a",
  "#2a9d8f",
  "#6a994e",
];

// Base create channel schema
const baseCreateChannelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  color: z.string().optional(),
  retention_days: z.coerce
    .number()
    .refine((val) => LOG_RETENTION_DAYS.includes(val), {
      message: `Log retention days must be one of: ${LOG_RETENTION_DAYS.join(", ")}`,
    })
    .optional(),
});

// Create request schemas
export const createEventChannelSchema = baseCreateChannelSchema.extend({
  required_tags: z.array(z.string()).optional(),
  metadata_schema: z.string().optional(),
});

export const createAppLogChannelSchema = baseCreateChannelSchema.extend({
  allowed_levels: z.array(z.string()).optional(),
  require_stack_trace: z.boolean().optional(),
});

export const createRequestChannelSchema = baseCreateChannelSchema.extend({
  capture_request_body: z.boolean().optional(),
  capture_response_body: z.boolean().optional(),
  status_code_ranges: z.array(z.number()).optional(),
});

export const createTraceChannelSchema = baseCreateChannelSchema.extend({
  required_labels: z.array(z.string()).optional(),
});

// Types derived from schemas
export type CreateEventChannelRequest = z.infer<
  typeof createEventChannelSchema
>;
export type CreateAppLogChannelRequest = z.infer<
  typeof createAppLogChannelSchema
>;
export type CreateRequestChannelRequest = z.infer<
  typeof createRequestChannelSchema
>;
export type CreateTraceChannelRequest = z.infer<
  typeof createTraceChannelSchema
>;

// API functions
export async function createChannel(
  projectId: string,
  type: ChannelType,
  data:
    | CreateEventChannelRequest
    | CreateAppLogChannelRequest
    | CreateRequestChannelRequest
    | CreateTraceChannelRequest,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<unknown>> {
  const res = await fetch(
    `${baseURL}/api/v1/projects/${projectId}/channels/${type}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
      ...opts,
    }
  );

  let resJSON: unknown;
  try {
    resJSON = await res.json();
  } catch (error) {
    return {
      data: null,
      error: {
        message: "Failed to create channel",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON, error: null };
}

// TODO: Type the responses with the actual created channel types
// Type-specific create functions
export async function createEventChannel(
  projectId: string,
  data: CreateEventChannelRequest,
  opts: Opts
): Promise<FnResponse<unknown>> {
  return createChannel(projectId, "event", data, opts);
}

export async function createAppLogChannel(
  projectId: string,
  data: CreateAppLogChannelRequest,
  opts: Opts
): Promise<FnResponse<unknown>> {
  return createChannel(projectId, "app", data, opts);
}

export async function createRequestChannel(
  projectId: string,
  data: CreateRequestChannelRequest,
  opts: Opts
): Promise<FnResponse<unknown>> {
  return createChannel(projectId, "request", data, opts);
}

export async function createTraceChannel(
  projectId: string,
  data: CreateTraceChannelRequest,
  opts: Opts
): Promise<FnResponse<unknown>> {
  return createChannel(projectId, "trace", data, opts);
}

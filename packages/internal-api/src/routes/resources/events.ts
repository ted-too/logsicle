import { type ErrorResponse, type Opts, createClient } from "@/index";
import { z } from "zod";

export interface EventLog {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  project_id: string;
  channel_id: string;
  name: string;
  payload: Record<string, string | number | boolean | null>;
  metadata: Record<string, string | number | boolean | null>;
  timestamp: string;
}

export interface EventChannel {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  project_id: string;
  name: string;
  description: string;
  schema: Record<string, string | number | boolean | null>;
  is_active: boolean;
}

export interface EventMetrics {
  total: number;
  by_channel: {
    channel_id: string;
    channel_name: string;
    count: number;
  }[];
  by_time: {
    timestamp: string;
    count: number;
  }[];
}

// List Events
export const listEventsSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
  channel_id: z.string().optional(),
  search: z.string().optional(),
});

export type ListEventsRequest = z.infer<typeof listEventsSchema>;

export interface ListEventsResponse {
  data: EventLog[];
  meta: {
    total: number;
    filtered: number;
    page: number;
    limit: number;
  };
}

export async function listEvents(
  projectId: string,
  query: ListEventsRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<ListEventsResponse, ErrorResponse>(
    `/v1/projects/${projectId}/events`,
    {
      credentials: "include",
      query,
      ...opts,
    }
  );
}

// Delete Event
export async function deleteEvent(
  projectId: string,
  eventId: string,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<void, ErrorResponse>(
    `/v1/projects/${projectId}/events/${eventId}`,
    {
      method: "DELETE",
      credentials: "include",
      ...opts,
    }
  );
}

// Get Event Metrics
export const getEventMetricsSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  interval: z
    .enum(["1m", "5m", "15m", "30m", "1h", "6h", "12h", "24h"])
    .optional(),
  channel_id: z.string().optional(),
});

export type GetEventMetricsRequest = z.infer<typeof getEventMetricsSchema>;

export async function getEventMetrics(
  projectId: string,
  query: GetEventMetricsRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<EventMetrics, ErrorResponse>(
    `/v1/projects/${projectId}/events/metrics`,
    {
      credentials: "include",
      query,
      ...opts,
    }
  );
}

// Event Channels
export const createChannelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  schema: z.record(z.unknown()).optional(),
});

export type CreateChannelRequest = z.infer<typeof createChannelSchema>;

export async function createChannel(
  projectId: string,
  body: CreateChannelRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<EventChannel, ErrorResponse>(
    `/v1/projects/${projectId}/events/channels`,
    {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "include",
      ...opts,
    }
  );
}

export async function listChannels(
  projectId: string,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<EventChannel[], ErrorResponse>(
    `/v1/projects/${projectId}/events/channels`,
    {
      credentials: "include",
      ...opts,
    }
  );
}

export async function getChannel(
  projectId: string,
  channelId: string,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<EventChannel, ErrorResponse>(
    `/v1/projects/${projectId}/events/channels/${channelId}`,
    {
      credentials: "include",
      ...opts,
    }
  );
}

export const updateChannelSchema = createChannelSchema.partial();
export type UpdateChannelRequest = z.infer<typeof updateChannelSchema>;

export async function updateChannel(
  projectId: string,
  channelId: string,
  body: UpdateChannelRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<EventChannel, ErrorResponse>(
    `/v1/projects/${projectId}/events/channels/${channelId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      credentials: "include",
      ...opts,
    }
  );
}

export async function deleteChannel(
  projectId: string,
  channelId: string,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<void, ErrorResponse>(
    `/v1/projects/${projectId}/events/channels/${channelId}`,
    {
      method: "DELETE",
      credentials: "include",
      ...opts,
    }
  );
}

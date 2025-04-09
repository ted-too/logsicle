import { type ErrorResponse, type Opts, createClient } from "@/index";
import { LOG_RETENTION_DAYS } from "@/routes/teams/projects";
import type { JsonValue, PaginatedResponse } from "@/types";
import {
	baseMetricsSchema,
	createTimeRangedPaginatedSchema,
} from "@/validations";
import { add } from "date-fns";
import { z } from "zod";

export const AVAILABLE_COLORS = [
	"#e76f51",
	"#f4a261",
	"#e9c46a",
	"#2a9d8f",
	"#6a994e",
] as const;

export type EventChannelColor = (typeof AVAILABLE_COLORS)[number];

export interface EventLog {
	id: string;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	project_id: string;
	channel_id: string;
	channel: EventChannel | null;
	name: string;
	description?: string;
	payload: JsonValue;
	metadata: JsonValue;
	tags?: string[];
	timestamp: string;
}

export interface EventChannel {
	id: string;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	project_id: string;
	name: string;
	color: EventChannelColor;
	slug: string;
	retention_days: number;
	description: string;
	schema: JsonValue;
	is_active: boolean;
}

export interface EventMetrics {
	total: number;
	by_channel: {
		channel_slug: string;
		channel_name: string;
		count: number;
	}[];
	by_time: {
		timestamp: number;
		count: number;
	}[];
}

// List Events
export const listEventsSchema = createTimeRangedPaginatedSchema({
	channel_slug: z.string().optional(),
}).merge(
	z.object({
		start: z.coerce
			.number()
			.transform((val) => {
				// If it's already a timestamp, use it
				if (typeof val === "number") return val;
				// If it's a Date object or string, convert to timestamp
				return new Date(val).getTime();
			})
			.catch(new Date(5).getTime()), // Default to beginning of time
		end: z.coerce
			.number()
			.transform((val) => {
				// If it's already a timestamp, use it
				if (typeof val === "number") return val;
				// If it's a Date object or string, convert to timestamp
				return new Date(val).getTime();
			})
			.catch(add(new Date(), { days: 1 }).getTime()),
	}),
);

export type ListEventsRequest = z.infer<typeof listEventsSchema>;

export async function listEvents(
	projectId: string,
	query: ListEventsRequest,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<PaginatedResponse<EventLog>, ErrorResponse>(
		`/v1/projects/${projectId}/events`,
		{
			credentials: "include",
			query,
			...opts,
		},
	);
}

// Delete Event
export async function deleteEvent(
	projectId: string,
	eventId: string,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<void, ErrorResponse>(
		`/v1/projects/${projectId}/events/${eventId}`,
		{
			method: "DELETE",
			credentials: "include",
			...opts,
		},
	);
}

// Get Event Metrics
export const getEventMetricsSchema = baseMetricsSchema.extend({
	channel_slug: z.string().optional(),
});

export type GetEventMetricsRequest = z.infer<typeof getEventMetricsSchema>;

export async function getEventMetrics(
	projectId: string,
	query: GetEventMetricsRequest,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<EventMetrics, ErrorResponse>(
		`/v1/projects/${projectId}/events/metrics`,
		{
			credentials: "include",
			query,
			...opts,
		},
	);
}

// Event Channels
export const createChannelSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	schema: z.record(z.string(), z.any()).nullish(),
	color: z.enum(AVAILABLE_COLORS).optional(),
	retention_days: z
		.union([z.string(), z.number()])
		.transform((val) => Number(val))
		.refine(
			(val) =>
				LOG_RETENTION_DAYS.includes(val as (typeof LOG_RETENTION_DAYS)[number]),
			"Invalid retention days value",
		),
});

export type CreateChannelRequest = z.infer<typeof createChannelSchema>;

export async function createChannel(
	projectId: string,
	body: CreateChannelRequest,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<EventChannel, ErrorResponse>(
		`/v1/projects/${projectId}/events/channels`,
		{
			method: "POST",
			body: JSON.stringify(body),
			credentials: "include",
			...opts,
		},
	);
}

export async function listChannels(
	projectId: string,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<EventChannel[], ErrorResponse>(
		`/v1/projects/${projectId}/events/channels`,
		{
			credentials: "include",
			...opts,
		},
	);
}

export async function getChannel(
	projectId: string,
	channelId: string,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<EventChannel, ErrorResponse>(
		`/v1/projects/${projectId}/events/channels/${channelId}`,
		{
			credentials: "include",
			...opts,
		},
	);
}

export const updateChannelSchema = createChannelSchema.partial();
export type UpdateChannelRequest = z.infer<typeof updateChannelSchema>;

export async function updateChannel(
	projectId: string,
	channelId: string,
	body: UpdateChannelRequest,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<EventChannel, ErrorResponse>(
		`/v1/projects/${projectId}/events/channels/${channelId}`,
		{
			method: "PATCH",
			body: JSON.stringify(body),
			credentials: "include",
			...opts,
		},
	);
}

export async function deleteChannel(
	projectId: string,
	channelId: string,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<void, ErrorResponse>(
		`/v1/projects/${projectId}/events/channels/${channelId}`,
		{
			method: "DELETE",
			credentials: "include",
			...opts,
		},
	);
}

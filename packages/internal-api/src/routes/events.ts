import type {
	ErrorResponse,
	FnResponse,
	Opts,
	PaginatedResponse,
} from "@/types";
import {
	optionalArraySchema,
	optionalStringSchema,
	timeRangeSchema,
} from "@/validations";
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

export const getEventLogsSchema = z.object({
	channelId: optionalStringSchema,
	name: optionalStringSchema,
	tags: optionalArraySchema,
	start: timeRangeSchema.start,
	end: timeRangeSchema.end,
	limit: z.number().min(1).max(100).optional(),
});

export type GetEventLogsParams = z.infer<typeof getEventLogsSchema>;

export const getEventMetricsSchema = z.object({
	channelId: z.string().optional(),
	name: z.string().optional(),
	start: timeRangeSchema.start,
	end: timeRangeSchema.end,
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
	{ baseURL, ...opts }: Opts,
): Promise<FnResponse<PaginatedResponse<EventLog>>> {
	const queryString = buildQueryString(params);

	const res = await fetch(
		`${baseURL}/v1/projects/${projectId}/events${queryString}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			...opts,
		},
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
	{ baseURL, ...opts }: Opts,
): Promise<FnResponse<EventMetric[]>> {
	const queryString = buildQueryString(params);

	const res = await fetch(
		`${baseURL}/v1/projects/${projectId}/events/metrics${queryString}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			...opts,
		},
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
	{ baseURL, ...opts }: Opts,
): Promise<FnResponse<void>> {
	const res = await fetch(
		`${baseURL}/v1/projects/${projectId}/event/${logId}`,
		{
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			...opts,
		},
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

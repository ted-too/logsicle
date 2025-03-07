import { z } from "zod";
import type { ErrorResponse, FnResponse, Opts } from "@/types";
import type { ChannelType } from "./create-channels";
import { LOG_RETENTION_DAYS } from "./projects";

// Base update channel schema
const baseUpdateChannelSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	description: z.string().optional().nullable(),
	color: z.string().optional().nullable(),
	retention_days: z.coerce
		.number()
		.refine((val) => LOG_RETENTION_DAYS.includes(val), {
			message: `Log retention days must be one of: ${LOG_RETENTION_DAYS.join(", ")}`,
		})
		.optional()
		.nullable(),
});

// Update request schemas
export const updateEventChannelSchema = baseUpdateChannelSchema.extend({
	required_tags: z.array(z.string()).nullish(),
	metadata_schema: z.any().nullish(),
});

export const updateAppLogChannelSchema = baseUpdateChannelSchema.extend({
	allowed_levels: z.array(z.string()).optional(),
	require_stack_trace: z.boolean().optional(),
});

export const updateRequestChannelSchema = baseUpdateChannelSchema.extend({
	capture_request_body: z.boolean().optional(),
	capture_response_body: z.boolean().optional(),
	status_code_ranges: z.array(z.number()).optional(),
});

export const updateTraceChannelSchema = baseUpdateChannelSchema.extend({
	required_labels: z.array(z.string()).optional(),
});

// Types derived from schemas
export type UpdateEventChannelRequest = z.infer<
	typeof updateEventChannelSchema
>;
export type UpdateAppLogChannelRequest = z.infer<
	typeof updateAppLogChannelSchema
>;
export type UpdateRequestChannelRequest = z.infer<
	typeof updateRequestChannelSchema
>;
export type UpdateTraceChannelRequest = z.infer<
	typeof updateTraceChannelSchema
>;

// Generic update channel function
export async function updateChannel(
	projectId: string,
	channelId: string,
	type: ChannelType,
	data:
		| UpdateEventChannelRequest
		| UpdateAppLogChannelRequest
		| UpdateRequestChannelRequest
		| UpdateTraceChannelRequest,
	{ baseURL, ...opts }: Opts,
): Promise<FnResponse<unknown>> {
	const res = await fetch(
		`${baseURL}/v1/projects/${projectId}/channels/${type}/${channelId}`,
		{
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
			credentials: "include",
			...opts,
		},
	);

	let resJSON: unknown;
	try {
		resJSON = await res.json();
	} catch (error) {
		return {
			data: null,
			error: {
				message: "Failed to update channel",
				error: "Failed to parse JSON response",
			},
		};
	}

	if (!res.ok) {
		return { data: null, error: resJSON as ErrorResponse };
	}

	return { data: resJSON, error: null };
}

// Type-specific update functions
export async function updateEventChannel(
	projectId: string,
	channelId: string,
	data: UpdateEventChannelRequest,
	opts: Opts,
): Promise<FnResponse<unknown>> {
	return updateChannel(projectId, channelId, "event", data, opts);
}

export async function updateAppLogChannel(
	projectId: string,
	channelId: string,
	data: UpdateAppLogChannelRequest,
	opts: Opts,
): Promise<FnResponse<unknown>> {
	return updateChannel(projectId, channelId, "app", data, opts);
}

export async function updateRequestChannel(
	projectId: string,
	channelId: string,
	data: UpdateRequestChannelRequest,
	opts: Opts,
): Promise<FnResponse<unknown>> {
	return updateChannel(projectId, channelId, "request", data, opts);
}

export async function updateTraceChannel(
	projectId: string,
	channelId: string,
	data: UpdateTraceChannelRequest,
	opts: Opts,
): Promise<FnResponse<unknown>> {
	return updateChannel(projectId, channelId, "trace", data, opts);
}

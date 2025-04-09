import { type ErrorResponse, type Opts, createClient } from "@/index";
import type { BaseChartSchema, JsonValue, PaginatedResponse } from "@/types";
import {
	ARRAY_DELIMITER,
	baseMetricsSchema,
	createTimeRangedPaginatedSchema,
} from "@/validations";
import { z } from "zod";

export const REQUEST_LEVELS = ["success", "warning", "error", "info"] as const;
export type RequestLevel = (typeof REQUEST_LEVELS)[number];

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
	level: RequestLevel;
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

export type RequestLogTimelineChart = (BaseChartSchema &
	Record<RequestLevel, number>)[];

export const requestLogFilterSchema = z.object({
	method: z.preprocess(
		// Convert string to array using ARRAY_DELIMITER
		(val) => {
			if (typeof val === "string") {
				// Handle comma-separated values
				if (val.includes(ARRAY_DELIMITER)) {
					return val.split(ARRAY_DELIMITER);
				}
				// Single value becomes array with one item
				return [val];
			}
			return val;
		},
		z.array(z.enum(HTTP_METHODS)).optional(),
	),
	level: z.preprocess((val) => {
		if (typeof val === "string") {
			if (val.includes(ARRAY_DELIMITER)) {
				return val.split(ARRAY_DELIMITER);
			}
			return [val];
		}
		return val;
	}, z.array(z.enum(["success", "warning", "error", "info"])).optional()),
	status_code: z.preprocess((val) => {
		if (typeof val === "string") {
			if (val.includes(ARRAY_DELIMITER)) {
				return val.split(ARRAY_DELIMITER).map(Number);
			}
			return [Number(val)];
		}
		return val;
	}, z.array(z.coerce.number().min(100).max(599)).optional()),
	path_pattern: z.string().optional(),
	host: z.string().optional(),
});

// List Request Logs
export const listRequestLogsSchema = createTimeRangedPaginatedSchema({
	...requestLogFilterSchema.shape,
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
export const getRequestMetricsSchema = baseMetricsSchema.extend(
	requestLogFilterSchema.shape,
);

export type GetRequestMetricsRequest = z.infer<typeof getRequestMetricsSchema>;

export async function getRequestTimelineChart(
	projectId: string,
	query: GetRequestMetricsRequest,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<RequestLogTimelineChart, ErrorResponse>(
		`/v1/projects/${projectId}/request/charts/timeline`,
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
	baseUrl = globalThis.document?.location.origin,
): string {
	const url = new URL(`/v1/projects/${projectId}/request/stream`, baseUrl);
	return url.toString();
}

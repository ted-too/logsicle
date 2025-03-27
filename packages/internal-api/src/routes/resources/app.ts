import { type ErrorResponse, type Opts, createClient } from "@/index";
import { z } from "zod";
import type { JsonValue, PaginatedResponse } from "@/types";
import {
	LOG_LEVELS,
	type LogLevel,
	createTimeRangedPaginatedSchema,
	baseMetricsSchema,
} from "@/validations";

export interface AppLog {
	id: string;
	project_id: string;
	level: LogLevel;
	message: string;
	fields: JsonValue | null;
	timestamp: string;
	service_name: string;
	caller: string | null;
	function: string | null;
	version: string | null;
	environment: string | null;
	host: string | null;
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
		timestamp: number;
		count: number;
	}[];
}

export const appLogFilterSchema = z.object({
	level: z.enum(LOG_LEVELS).optional(),
	service_name: z.string().optional(),
	environment: z.string().optional(),
});

// List App Logs
export const listAppLogsSchema = createTimeRangedPaginatedSchema({
	...appLogFilterSchema.shape,
});

export type ListAppLogsRequest = z.infer<typeof listAppLogsSchema>;

export async function listAppLogs(
	projectId: string,
	query: ListAppLogsRequest,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<PaginatedResponse<AppLog>, ErrorResponse>(
		`/v1/projects/${projectId}/app`,
		{
			credentials: "include",
			query,
			...opts,
		},
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
		},
	);
}

// Get App Log Metrics
export const getAppMetricsSchema = baseMetricsSchema.extend({
	level: z.enum(LOG_LEVELS).optional(),
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
		},
	);
}

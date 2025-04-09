import { type ErrorResponse, type Opts, createClient } from "@/index";
import type { BaseChartSchema, JsonValue, PaginatedResponse } from "@/types";
import {
	ARRAY_DELIMITER,
	LOG_LEVELS,
	type LogLevel,
	baseMetricsSchema,
	createTimeRangedPaginatedSchema,
} from "@/validations";
import { z } from "zod";

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

export type AppLogTimelineChart = (BaseChartSchema &
	Record<LogLevel, number>)[];

export const appLogFilterSchema = z.object({
	level: z.preprocess(
		// Convert string to array using ARRAY_DELIMITER
		(val) => {
			if (typeof val === "string") {
				return val.split(ARRAY_DELIMITER);
			}
			return val;
		},
		z.array(z.enum(LOG_LEVELS)).nullish(),
	),
	service_name: z.string().nullish(),
	environment: z.string().nullish(),
	host: z.string().nullish(),
	caller: z.string().nullish(),
	function: z.string().nullish(),
	version: z.string().nullish(),
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

export const getAppMetricsSchema = baseMetricsSchema.extend(
	appLogFilterSchema.shape,
);

export type GetAppMetricsRequest = z.infer<typeof getAppMetricsSchema>;

export async function getAppTimelineChart(
	projectId: string,
	query: GetAppMetricsRequest,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<AppLogTimelineChart, ErrorResponse>(
		`/v1/projects/${projectId}/app/charts/timeline`,
		{
			credentials: "include",
			query,
			...opts,
		},
	);
}

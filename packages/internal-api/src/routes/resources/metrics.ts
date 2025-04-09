import { type ErrorResponse, type Opts, createClient } from "@/index";
import type { JsonValue, PaginatedResponse } from "@/types";
import {
	baseMetricsSchema,
	createTimeRangedPaginatedSchema,
} from "@/validations";
import { z } from "zod";

// Metric types from the API
export const METRIC_TYPES = [
	"GAUGE",
	"SUM",
	"HISTOGRAM",
	"EXPONENTIAL_HISTOGRAM",
	"SUMMARY",
] as const;
export type MetricType = (typeof METRIC_TYPES)[number];

// Aggregation temporality options
export const AGGREGATION_TEMPORALITY = [
	"UNSPECIFIED",
	"DELTA",
	"CUMULATIVE",
] as const;
export type AggregationTemporality = (typeof AGGREGATION_TEMPORALITY)[number];

export interface Metric {
	id: string;
	project_id: string;
	name: string;
	description: string;
	unit: string;
	type: MetricType;
	value: number;
	timestamp: string;
	is_monotonic: boolean;
	bounds: number[] | null;
	bucket_counts: number[] | null;
	count: number | null;
	sum: number | null;
	quantile_values: JsonValue | null;
	service_name: string;
	service_version: string | null;
	attributes: JsonValue | null;
	resource_attributes: JsonValue | null;
	aggregation_temporality: AggregationTemporality;
}

export interface MetricStats {
	stats: {
		timestamp: number;
		count: number;
	}[];
	interval: string;
}

// List Metrics
export const listMetricsSchema = createTimeRangedPaginatedSchema({
	type: z.enum(METRIC_TYPES).optional(),
	service_name: z.string().optional(),
});

export type ListMetricsRequest = z.infer<typeof listMetricsSchema>;

export async function listMetrics(
	projectId: string,
	query: ListMetricsRequest,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<PaginatedResponse<Metric>, ErrorResponse>(
		`/v1/projects/${projectId}/metrics`,
		{
			credentials: "include",
			query,
			...opts,
		},
	);
}

// Get Metric Stats
export const getMetricStatsSchema = baseMetricsSchema.extend({
	type: z.enum(METRIC_TYPES).optional(),
	service_name: z.string().optional(),
});

export type GetMetricStatsRequest = z.infer<typeof getMetricStatsSchema>;

export async function getMetricStats(
	projectId: string,
	query: GetMetricStatsRequest,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<MetricStats, ErrorResponse>(
		`/v1/projects/${projectId}/metrics/stats`,
		{
			credentials: "include",
			query,
			...opts,
		},
	);
}

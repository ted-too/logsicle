import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
	getMetricStats as apiGetMetricStats,
	listMetrics as apiListMetrics,
	getMetricStatsSchema,
	listMetricsSchema,
} from "@repo/api";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Metrics
export const listMetrics = createServerFn({ method: "GET" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string(), query: listMetricsSchema }))
	.handler(async ({ context, data: { projectId, query } }) =>
		apiListMetrics(projectId, query, { $fetch: context.$fetch }),
	);

export const getMetricStats = createServerFn({ method: "GET" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string(), query: getMetricStatsSchema }))
	.handler(async ({ context, data: { projectId, query } }) =>
		apiGetMetricStats(projectId, query, { $fetch: context.$fetch }),
	);

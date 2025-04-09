import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
	deleteRequestLog as apiDeleteRequestLog,
	getRequestTimelineChart as apiGetRequestTimelineChart,
	listRequestLogs as apiListRequestLogs,
	getRequestMetricsSchema,
	listRequestLogsSchema,
} from "@repo/api";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Request Logs
export const listRequestLogs = createServerFn({ method: "GET" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string(), query: listRequestLogsSchema }))
	.handler(async ({ context, data: { projectId, query } }) =>
		apiListRequestLogs(projectId, query, { $fetch: context.$fetch }),
	);

export const deleteRequestLog = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string(), logId: z.string() }))
	.handler(async ({ context, data: { projectId, logId } }) =>
		apiDeleteRequestLog(projectId, logId, { $fetch: context.$fetch }),
	);

export const getRequestTimelineChart = createServerFn({ method: "GET" })
	.middleware([betterFetchMiddleware])
	.validator(
		z.object({ projectId: z.string(), query: getRequestMetricsSchema }),
	)
	.handler(async ({ context, data: { projectId, query } }) =>
		apiGetRequestTimelineChart(projectId, query, { $fetch: context.$fetch }),
	);

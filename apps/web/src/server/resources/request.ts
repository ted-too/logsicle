import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
  listRequestLogs as apiListRequestLogs,
  deleteRequestLog as apiDeleteRequestLog,
  getRequestMetrics as apiGetRequestMetrics,
  listRequestLogsSchema,
  getRequestMetricsSchema,
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

export const getRequestMetrics = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ projectId: z.string(), query: getRequestMetricsSchema }))
  .handler(async ({ context, data: { projectId, query } }) =>
    apiGetRequestMetrics(projectId, query, { $fetch: context.$fetch }),
  ); 
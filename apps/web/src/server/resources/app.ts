import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
  listAppLogs as apiListAppLogs,
  deleteAppLog as apiDeleteAppLog,
  getAppMetrics as apiGetAppMetrics,
  listAppLogsSchema,
  getAppMetricsSchema,
} from "@repo/api";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// App Logs
export const listAppLogs = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ projectId: z.string(), query: listAppLogsSchema }))
  .handler(async ({ context, data: { projectId, query } }) =>
    apiListAppLogs(projectId, query, { $fetch: context.$fetch }),
  );

export const deleteAppLog = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ projectId: z.string(), logId: z.string() }))
  .handler(async ({ context, data: { projectId, logId } }) =>
    apiDeleteAppLog(projectId, logId, { $fetch: context.$fetch }),
  );

export const getAppMetrics = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ projectId: z.string(), query: getAppMetricsSchema }))
  .handler(async ({ context, data: { projectId, query } }) =>
    apiGetAppMetrics(projectId, query, { $fetch: context.$fetch }),
  ); 
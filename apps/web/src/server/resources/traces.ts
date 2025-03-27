import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
  listTraces as apiListTraces,
  getTraceStats as apiGetTraceStats,
  getTraceTimeline as apiGetTraceTimeline,
  listTracesSchema,
  getTraceStatsSchema,
} from "@repo/api";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Traces
export const listTraces = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ projectId: z.string(), query: listTracesSchema }))
  .handler(async ({ context, data: { projectId, query } }) =>
    apiListTraces(projectId, query, { $fetch: context.$fetch }),
  );

export const getTraceStats = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ projectId: z.string(), query: getTraceStatsSchema }))
  .handler(async ({ context, data: { projectId, query } }) =>
    apiGetTraceStats(projectId, query, { $fetch: context.$fetch }),
  );

export const getTraceTimeline = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ projectId: z.string(), traceId: z.string() }))
  .handler(async ({ context, data: { projectId, traceId } }) =>
    apiGetTraceTimeline(projectId, traceId, { $fetch: context.$fetch }),
  ); 
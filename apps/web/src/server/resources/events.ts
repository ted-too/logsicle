import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
	createChannel as apiCreateChannel,
	deleteChannel as apiDeleteChannel,
	deleteEvent as apiDeleteEvent,
	getChannel as apiGetChannel,
	getEventMetrics as apiGetEventMetrics,
	listChannels as apiListChannels,
	listEvents as apiListEvents,
	updateChannel as apiUpdateChannel,
	createChannelSchema,
	getEventMetricsSchema,
	listEventsSchema,
	updateChannelSchema,
} from "@repo/api";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Event Logs
export const listEvents = createServerFn({ method: "GET" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string(), query: listEventsSchema }))
	.handler(async ({ context, data: { projectId, query } }) =>
		apiListEvents(projectId, query, { $fetch: context.$fetch }),
	);

export const deleteEvent = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string(), eventId: z.string() }))
	.handler(async ({ context, data: { projectId, eventId } }) =>
		apiDeleteEvent(projectId, eventId, { $fetch: context.$fetch }),
	);

export const getEventMetrics = createServerFn({ method: "GET" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string(), query: getEventMetricsSchema }))
	.handler(async ({ context, data: { projectId, query } }) =>
		apiGetEventMetrics(projectId, query, { $fetch: context.$fetch }),
	);

// Event Channels
export const createChannel = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string(), body: createChannelSchema }))
	.handler(async ({ context, data: { projectId, body } }) =>
		apiCreateChannel(projectId, body, { $fetch: context.$fetch }),
	);

export const listChannels = createServerFn({ method: "GET" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string() }))
	.handler(async ({ context, data: { projectId } }) =>
		apiListChannels(projectId, { $fetch: context.$fetch }),
	);

export const getChannel = createServerFn({ method: "GET" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string(), channelId: z.string() }))
	.handler(async ({ context, data: { projectId, channelId } }) =>
		apiGetChannel(projectId, channelId, { $fetch: context.$fetch }),
	);

export const updateChannel = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.validator(
		z.object({
			projectId: z.string(),
			channelId: z.string(),
			body: updateChannelSchema,
		}),
	)
	.handler(async ({ context, data: { projectId, channelId, body } }) =>
		apiUpdateChannel(projectId, channelId, body, { $fetch: context.$fetch }),
	);

export const deleteChannel = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string(), channelId: z.string() }))
	.handler(async ({ context, data: { projectId, channelId } }) =>
		apiDeleteChannel(projectId, channelId, { $fetch: context.$fetch }),
	);

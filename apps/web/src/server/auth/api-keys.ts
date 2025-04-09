import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
	createAPIKey as apiCreateAPIKey,
	deleteAPIKey as apiDeleteAPIKey,
	listAPIKeys as apiListAPIKeys,
	createAPIKeySchema,
} from "@repo/api";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createAPIKey = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string(), body: createAPIKeySchema }))
	.handler(async ({ context, data: { projectId, body } }) =>
		apiCreateAPIKey(projectId, body, { $fetch: context.$fetch }),
	);

export const listAPIKeys = createServerFn({ method: "GET" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string() }))
	.handler(async ({ context, data: { projectId } }) =>
		apiListAPIKeys(projectId, { $fetch: context.$fetch }),
	);

export const deleteAPIKey = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string(), keyId: z.string() }))
	.handler(async ({ context, data: { projectId, keyId } }) =>
		apiDeleteAPIKey(projectId, keyId, { $fetch: context.$fetch }),
	);

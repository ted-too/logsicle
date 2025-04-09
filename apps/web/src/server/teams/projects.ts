import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
	createProject as apiCreateProject,
	getProject as apiGetProject,
	listProjects as apiListProjects,
	updateProject as apiUpdateProject,
	createProjectSchema,
} from "@repo/api";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createProject = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.validator(createProjectSchema)
	.handler(async ({ context, data: body }) =>
		apiCreateProject(body, { $fetch: context.$fetch }),
	);

export const updateProject = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.validator(
		z.object({ projectId: z.string(), body: createProjectSchema.partial() }),
	)
	.handler(async ({ context, data: { projectId, body } }) =>
		apiUpdateProject(projectId, body, { $fetch: context.$fetch }),
	);

export const listProjects = createServerFn({ method: "GET" })
	.middleware([betterFetchMiddleware])
	.handler(async ({ context }) => apiListProjects({ $fetch: context.$fetch }));

export const getProject = createServerFn({ method: "GET" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ projectId: z.string() }))
	.handler(async ({ context, data: { projectId } }) =>
		apiGetProject(projectId, { $fetch: context.$fetch }),
	);

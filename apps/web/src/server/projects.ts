import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
  createProject as apiCreateProject,
  updateProject as apiUpdateProject,
  listProjects as apiListProjects,
  getProject as apiGetProject,
  createProjectSchema,
} from "@repo/api";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createProject = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(createProjectSchema)
  .handler(async ({ context, data: body }) =>
    apiCreateProject(body, { $fetch: context.$fetch })
  );

export const updateProject = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(
    z.object({ projectId: z.string() }).merge(createProjectSchema.partial())
  )
  .handler(async ({ context, data: { projectId, ...body } }) =>
    apiUpdateProject(projectId, body, { $fetch: context.$fetch })
  );

export const listProjects = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ organizationId: z.string().optional() }))
  .handler(async ({ context, data: { organizationId } }) =>
    apiListProjects({ $fetch: context.$fetch, organizationId })
  );

export const getProject = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ projectId: z.string() }))
  .handler(async ({ context, data: { projectId } }) =>
    apiGetProject(projectId, { $fetch: context.$fetch })
  );

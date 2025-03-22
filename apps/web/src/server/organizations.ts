import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
  addMemberSchema,
  addOrganizationMember as apiAddOrganizationMember,
  createOrganization as apiCreateOrganization,
  getOrganization as apiGetOrganization,
  listOrganizationMembers as apiListOrganizationMembers,
  listUserOrganizations as apiListUserOrganizations,
  removeOrganizationMember as apiRemoveOrganizationMember,
  updateOrganization as apiUpdateOrganization,
  updateOrganizationMember as apiUpdateOrganizationMember,
  createOrganizationSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
} from "@repo/api";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(createOrganizationSchema)
  .handler(async ({ context, data: body }) =>
    apiCreateOrganization(body, { $fetch: context.$fetch })
  );

export const listUserOrganizations = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .handler(async ({ context }) =>
    apiListUserOrganizations({ $fetch: context.$fetch })
  );

export const getOrganization = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data: { id } }) =>
    apiGetOrganization(id, { $fetch: context.$fetch })
  );

export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ id: z.string() }).merge(updateOrganizationSchema))
  .handler(async ({ context, data: { id, ...body } }) =>
    apiUpdateOrganization(id, body, { $fetch: context.$fetch })
  );

export const listMembers = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data: { id } }) =>
    apiListOrganizationMembers(id, { $fetch: context.$fetch })
  );

export const addMember = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ id: z.string() }).merge(addMemberSchema))
  .handler(async ({ context, data: { id, ...body } }) =>
    apiAddOrganizationMember(id, body, { $fetch: context.$fetch })
  );

export const updateMember = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(
    z
      .object({ id: z.string(), memberId: z.string() })
      .merge(updateMemberRoleSchema)
  )
  .handler(async ({ context, data: { id, memberId, ...body } }) =>
    apiUpdateOrganizationMember(id, memberId, body, { $fetch: context.$fetch })
  );

export const removeMember = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ id: z.string(), memberId: z.string() }))
  .handler(async ({ context, data: { id, memberId } }) =>
    apiRemoveOrganizationMember(id, memberId, { $fetch: context.$fetch })
  );

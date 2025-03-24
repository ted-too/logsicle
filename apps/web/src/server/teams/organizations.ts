import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
  createOrganization as apiCreateOrganization,
  createOrganizationSchema,
  deleteOrganization as apiDeleteOrganization,
  listOrganizationMembers as apiListOrganizationMembers,
  listUserOrganizationMemberships as apiListUserOrganizationMemberships,
} from "@repo/api";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(createOrganizationSchema)
  .handler(async ({ context, data: body }) =>
    apiCreateOrganization(body, { $fetch: context.$fetch }),
  );

export const deleteOrganization = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ organizationId: z.string() }))
  .handler(async ({ context, data: { organizationId } }) =>
    apiDeleteOrganization(organizationId, { $fetch: context.$fetch }),
  );

export const listOrganizationMembers = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .handler(async ({ context }) =>
    apiListOrganizationMembers({ $fetch: context.$fetch }),
  );

export const listUserOrganizationMemberships = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .handler(async ({ context }) =>
    apiListUserOrganizationMemberships({ $fetch: context.$fetch }),
  );
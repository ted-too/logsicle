import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
  createInvitation as apiCreateInvitation,
  createInvitationSchema,
  listInvitations as apiListInvitations,
  cancelInvitation as apiCancelInvitation,
  resendInvitation as apiResendInvitation,
  validateInvitation as apiValidateInvitation,
  acceptInvitation as apiAcceptInvitation,
  acceptInvitationSchema,
  acceptInvitationWithRegistration as apiAcceptInvitationWithRegistration,
  acceptInvitationWithRegistrationSchema,
} from "@repo/api";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createInvitation = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(createInvitationSchema)
  .handler(async ({ context, data: body }) =>
    apiCreateInvitation(body, { $fetch: context.$fetch }),
  );

export const listInvitations = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .handler(async ({ context }) =>
    apiListInvitations({ $fetch: context.$fetch }),
  );

export const cancelInvitation = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ invitationId: z.string() }))
  .handler(async ({ context, data: { invitationId } }) =>
    apiCancelInvitation(invitationId, { $fetch: context.$fetch }),
  );

export const resendInvitation = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ invitationId: z.string() }))
  .handler(async ({ context, data: { invitationId } }) =>
    apiResendInvitation(invitationId, { $fetch: context.$fetch }),
  );

export const validateInvitation = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .validator(z.object({ token: z.string() }))
  .handler(async ({ context, data: { token } }) =>
    apiValidateInvitation(token, { $fetch: context.$fetch }),
  );

export const acceptInvitation = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(acceptInvitationSchema)
  .handler(async ({ context, data: body }) =>
    apiAcceptInvitation(body, { $fetch: context.$fetch }),
  );

export const acceptInvitationWithRegistration = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(acceptInvitationWithRegistrationSchema)
  .handler(async ({ context, data: body }) =>
    apiAcceptInvitationWithRegistration(body, { $fetch: context.$fetch }),
  ); 
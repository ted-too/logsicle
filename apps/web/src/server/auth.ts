import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
  getUser as apiGetUser,
  updateUser as apiUpdateUser,
  updateUserSchema,
} from "@repo/api";
import { createServerFn } from "@tanstack/react-start";

export const getUser = createServerFn({ method: "GET" })
  .middleware([betterFetchMiddleware])
  .handler(async ({ context }) => apiGetUser({ $fetch: context.$fetch }));

export const updateUser = createServerFn({ method: "POST" })
  .middleware([betterFetchMiddleware])
  .validator(updateUserSchema)
  .handler(async ({ context, data: body }) =>
    apiUpdateUser(body, { $fetch: context.$fetch })
  );
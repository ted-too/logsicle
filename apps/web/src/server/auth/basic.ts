import { betterFetchMiddleware } from "@/middleware/better-fetch";
import {
	getUser as apiGetUser,
	login as apiLogin,
	logout as apiLogout,
	register as apiRegister,
	setActiveOrganization as apiSetActiveOrganization,
	updateUser as apiUpdateUser,
	loginSchema,
	registerSchema,
	updateUserSchema,
} from "@repo/api";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Get current user
export const getUser = createServerFn({ method: "GET" })
	.middleware([betterFetchMiddleware])
	.handler(async ({ context }) => apiGetUser({ $fetch: context.$fetch }));

// Register new user
export const register = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.validator(registerSchema)
	.handler(async ({ context, data: body }) =>
		apiRegister(body, { $fetch: context.$fetch }),
	);

// Login user
export const login = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.validator(loginSchema)
	.handler(async ({ context, data: body }) =>
		apiLogin(body, { $fetch: context.$fetch }),
	);

// Logout user
export const logout = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.handler(async ({ context }) => apiLogout({ $fetch: context.$fetch }));

// Update user
export const updateUser = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.validator(updateUserSchema)
	.handler(async ({ context, data: body }) =>
		apiUpdateUser(body, { $fetch: context.$fetch }),
	);

// Set active organization
export const setActiveOrganization = createServerFn({ method: "POST" })
	.middleware([betterFetchMiddleware])
	.validator(z.object({ organizationId: z.string() }))
	.handler(async ({ context, data: { organizationId } }) =>
		apiSetActiveOrganization(organizationId, { $fetch: context.$fetch }),
	);

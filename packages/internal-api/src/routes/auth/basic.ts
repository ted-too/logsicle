import { type ErrorResponse, type Opts, createClient } from "@/index";
import type { Organization } from "@/routes/teams/organizations";
import { z } from "zod";

export interface OtherUser {
  id: string;
  name: string;
  image: string | null;
  email: string;
  created_at: string;
}

export interface OwnUser extends OtherUser {
  updated_at: string;
  deleted_at: string | null;
  has_onboarded: boolean;
  last_login_at: string;
  organizations: Organization[];
}

export const registerSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Invalid email"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

export type RegisterRequest = z.infer<typeof registerSchema>;

export async function register(
  body: RegisterRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<OwnUser, ErrorResponse>("/v1/auth/sign-up", {
    method: "POST",
    body: JSON.stringify(body),
    ...opts,
  });
}

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export async function login(body: LoginRequest, { $fetch, ...opts }: Opts) {
  const client = $fetch ?? createClient();

  return await client<OwnUser, ErrorResponse>("/v1/auth/sign-in", {
    method: "POST",
    body: JSON.stringify(body),
    credentials: "include",
    ...opts,
  });
}

export async function logout({ $fetch, ...opts }: Opts) {
  const client = $fetch ?? createClient();

  return await client<void, ErrorResponse>("/v1/auth/sign-out", {
    method: "POST",
    credentials: "include",
    ...opts,
  });
}

export async function getUser({ $fetch, ...opts }: Opts) {
  const client = $fetch ?? createClient();

  return await client<OwnUser, ErrorResponse>("/v1/me", {
    credentials: "include",
    ...opts,
  });
}

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  has_onboarded: z.boolean().optional(),
});

export type UpdateUserRequest = z.infer<typeof updateUserSchema>;

export async function updateUser(
  body: UpdateUserRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<OwnUser, ErrorResponse>("/v1/me", {
    method: "PATCH",
    body: JSON.stringify(body),
    credentials: "include",
    ...opts,
  });
}

export async function setActiveOrganization(
  organizationId: string,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<void, ErrorResponse>(
    `/v1/auth/organizations/${organizationId}/activate`,
    {
      method: "POST",
      credentials: "include",
      ...opts,
    }
  );
}
